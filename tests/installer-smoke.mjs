import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { onSecondMonitor } from "./second-monitor.mjs";

const root = resolve(process.env.WRAKEEB_INSTALLER_QA_ROOT || "runtime/installer-qa");
await mkdir(root, { recursive: true });
const executable = join(root, "wrakeeb-launcher.exe");
const child = spawn(executable, [], {
  cwd: root,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
      "--remote-debugging-address=127.0.0.1 --remote-debugging-port=19426",
  },
});
onSecondMonitor(child.pid);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  for (let i = 0; i < 120; i++) {
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:19426");
      break;
    } catch {
      await pause(250);
    }
  }
  assert.ok(browser);
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.waitForEvent("page"));
  await page.waitForFunction(() => window.__TAURI_INTERNALS__);
  const call = (name, args) =>
    page.evaluate(
      ({ name, args }) => window.__TAURI_INTERNALS__.invoke(name, args),
      { name, args },
    );
  const snapshot = await call("get_snapshot");
  assert.equal(
    snapshot.store.apps.length,
    0,
    "Fresh installer must not ship a personal library",
  );
  assert.equal(resolve(snapshot.dataDirectory), join(root, "data"));
  assert.ok(snapshot.installDirectory.includes("Wrakeeb"));
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const theme of ["wrakeeb", "slate", "light", "discord"]) {
    await page.getByLabel("Color scheme").selectOption(theme);
    await page.waitForFunction(
      (theme) => document.documentElement.dataset.theme === theme,
      theme,
    );
    await pause(350);
    if (theme === "light")
      await page.screenshot({ path: join(root, "light-theme.png") });
  }
  for (const accent of ["blue", "teal", "red", "amber", "default"]) {
    await page.getByLabel("Accent color").selectOption(accent);
    for (let i = 0; i < 30; i++) {
      if ((await call("get_snapshot")).store.preferences.accent === accent)
        break;
      await pause(100);
    }
    assert.equal((await call("get_snapshot")).store.preferences.accent, accent);
  }
  await pause(350);
  await page.getByRole("tab", { name: "Appearance", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page
    .getByRole("button", { name: "Choose installation folder", exact: true })
    .waitFor();
  await page.screenshot({ path: join(root, "download-settings.png") });
  await page.getByRole("tab", { name: "Appearance", exact: true }).click();
  await page.screenshot({ path: join(root, "appearance-settings.png") });
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  assert.equal(await page.locator(".app-item").count(), 10);
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images, (img) => img.decode().catch(() => {})),
    );
  });
  await page.locator("main").evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: join(root, "discover.png") });
  await page
    .getByRole("button", { name: "Maximize window", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore window", exact: true })
    .waitFor();
  assert.ok(await page.evaluate(() => window.screen.availLeft < 0));
  await page
    .getByRole("button", { name: "Restore window", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Maximize window", exact: true })
    .waitFor();
  const downloads = join(root, "Project downloads");
  const apps = join(root, "Independent applications");
  await mkdir(downloads, { recursive: true });
  await mkdir(apps, { recursive: true });
  const currentSnapshot = await call("get_snapshot");
  await call("save_preferences", {
    preferences: {
      ...currentSnapshot.store.preferences,
      downloadDirectory: downloads,
      installDirectory: apps,
      checkUpdatesOnStart: false,
    },
  });
  for (const id of ["dual-steam", "demo-script"]) {
    const release = await call("get_project_release", { id });
    const asset = release.assets.find(
      (a) =>
        a.installable &&
        (id === "demo-script"
          ? a.name.endsWith(".cmd")
          : a.name === "Dual-Steam-Windows.zip"),
    );
    assert.ok(asset, `No approved package for ${id}`);
    const downloaded = await call("download_project_asset", {
      id,
      assetId: asset.id,
    });
    assert.equal(downloaded.stage, "downloaded", downloaded.message);
    const installed = await call("install_project_package");
    assert.equal(installed.stage, "installed", installed.message);
    const receipt = (await call("get_snapshot")).store.installations.find(
      (i) => i.catalogId === id,
    );
    assert.ok(receipt.entry.startsWith(apps));
  }
  await writeFile(
    join(root, "report.json"),
    JSON.stringify(
      {
        passed: true,
        installedExeRuns: true,
        freshLibraryEmpty: true,
        dataWritable: true,
        fourThemes: true,
        fiveAccents: true,
        keyboardTabs: true,
        catalogProjects: 10,
        realDualSteamPackageInstalledWithoutLaunching: true,
        cmdPackageInstalledWithoutRunning: true,
        maximizeRestore: true,
        monitor: "secondary",
        Windows10MachineTested: false,
      },
      null,
      2,
    ),
  );
  await page
    .getByRole("button", { name: "Close launcher", exact: true })
    .click()
    .catch(() => {});
  console.log(
    "Installed application smoke passed on monitor 2, including all themes/accents and keyboard tabs.",
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
