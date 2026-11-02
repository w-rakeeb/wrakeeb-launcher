import { chromium, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { onSecondMonitor } from "./second-monitor.mjs";

const root = resolve(
  process.env.WRAKEEB_V040_QA_ROOT || "runtime/v040-native-qa",
);
await mkdir(join(root, "data"), { recursive: true });
const downloads = join(root, "Downloads নমুনা");
const apps = join(root, "Application library");
await mkdir(downloads, { recursive: true });
await mkdir(apps, { recursive: true });
await writeFile(
  join(root, "data/library.json"),
  JSON.stringify({
    schema: 1,
    apps: [],
    activity: [],
    installations: [],
    preferences: {
      compact: false,
      reduceMotion: true,
      rememberPage: false,
      theme: "discord",
      accent: "default",
      checkUpdatesOnStart: false,
      scanOnStart: false,
      scanDownloads: true,
      closeToTray: false,
      minimizeToTray: false,
      recordActivity: true,
      largeText: false,
      downloadDirectory: downloads,
      installDirectory: apps,
    },
  }),
);
const executable = join(root, "Wrakeeb Launcher.exe");
await copyFile(
  resolve(
    process.env.WRAKEEB_QA_BINARY ||
      "src-tauri/target/debug/wrakeeb-launcher.exe",
  ),
  executable,
);
const child = spawn(executable, [], {
  cwd: root,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
      "--remote-debugging-address=127.0.0.1 --remote-debugging-port=19427",
    WRAKEEB_TEST_MONITOR: "secondary",
    WRAKEEB_DEMO_DATA_ROOT: join(root, "Demo data"),
  },
});
onSecondMonitor(child.pid);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
let call;
try {
  for (let i = 0; i < 160; i++) {
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:19427");
      break;
    } catch {
      await pause(250);
    }
  }
  assert.ok(browser);
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.waitForEvent("page"));
  await page.waitForFunction(() => window.__TAURI_INTERNALS__);
  call = (name, args) =>
    page.evaluate(
      ({ name, args }) => window.__TAURI_INTERNALS__.invoke(name, args),
      { name, args },
    );
  let snapshot = await call("get_snapshot");
  assert.ok(
    snapshot.detectedApps.some(
      (a) => a.catalogId === "dual-steam" && a.executableBytes > 0,
    ),
    "Existing Dual Steam must be detected",
  );
  const shell = await call("get_shell_status");
  assert.equal(shell.trayRegistered, true);
  await call("hide_to_tray");
  await pause(300);
  assert.equal((await call("get_shell_status")).visible, false);
  await call("show_launcher");
  await pause(300);
  assert.equal((await call("get_shell_status")).visible, true);
  onSecondMonitor(child.pid);
  await call("save_preferences", {
    preferences: { ...snapshot.store.preferences, closeToTray: true },
  });
  await page
    .getByRole("button", { name: "Close launcher", exact: true })
    .click();
  await pause(300);
  assert.equal((await call("get_shell_status")).visible, false);
  await call("show_launcher");
  await pause(300);
  onSecondMonitor(child.pid);
  await call("save_preferences", {
    preferences: { ...snapshot.store.preferences, closeToTray: false },
  });
  await call("save_preferences", {
    preferences: { ...snapshot.store.preferences, minimizeToTray: true },
  });
  await page
    .getByRole("button", { name: "Minimize window", exact: true })
    .click();
  await pause(700);
  assert.equal(
    (await call("get_shell_status")).visible,
    false,
    "Minimize to tray must hide the window",
  );
  await call("show_launcher");
  await pause(300);
  onSecondMonitor(child.pid);
  await call("save_preferences", {
    preferences: { ...snapshot.store.preferences, minimizeToTray: false },
  });
  const scan = await call("scan_installed_apps");
  assert.ok(scan.found >= 1);
  assert.ok(scan.foldersChecked <= 2500);
  await page.reload();
  await expect(page.locator(".app-item")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  const steam = page.locator(".app-item").filter({
    has: page.getByRole("button", { name: "Dual Steam", exact: true }),
  });
  await expect(
    steam.getByRole("button", { name: "Launch", exact: true }),
  ).toBeVisible();
  assert.equal(
    await steam.getByRole("button", { name: "Download", exact: true }).count(),
    0,
  );
  await steam.getByRole("button", { name: "Dual Steam", exact: true }).click();
  await page
    .locator(".project-image-stage img")
    .evaluate((img) => img.decode());
  await page
    .getByRole("button", { name: "Next project image", exact: true })
    .click();
  await expect(page.locator(".gallery-caption")).toContainText("2 / 3");
  await page
    .getByRole("button", { name: "Previous project image", exact: true })
    .click();
  await expect(page.locator(".gallery-caption")).toContainText("1 / 3");
  await page
    .locator(".project-image-stage img")
    .evaluate((img) => img.decode());
  await page.screenshot({ path: join(root, "dual-steam-details.png") });
  await page.getByRole("tab", { name: "Downloads", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose installation folder", exact: true })
    .waitFor();
  const picked = join(root, "Chosen installation folder");
  await mkdir(picked, { recursive: true });
  await page
    .getByRole("button", { name: "Choose installation folder", exact: true })
    .click();
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      resolve("tests/choose-native-folder.ps1"),
      "-AppProcessId",
      String(child.pid),
    ],
    { windowsHide: true, stdio: "pipe", timeout: 45000 },
  );
  await call("save_preferences", {
    preferences: {
      ...(await call("get_snapshot")).store.preferences,
      installDirectory: picked,
    },
  });
  await page.reload();
  await expect
    .poll(async () => (await call("get_snapshot")).installDirectory)
    .toBe(picked);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  const rejected = await call("download_latest_project", {
    id: "not-a-catalog-project",
  });
  assert.equal(rejected.stage, "error");
  assert.equal(rejected.projectId, "not-a-catalog-project");
  assert.equal(rejected.asset, null);
  const demo = page.locator(".app-item").filter({
    has: page.getByRole("button", { name: "Launcher Demo", exact: true }),
  });
  await demo.getByRole("button", { name: "Download", exact: true }).click();
  await page
    .getByRole("button", { name: "Install package", exact: true })
    .waitFor({ timeout: 60000 });
  const status = await call("get_package_status");
  assert.equal(status.name, "Launcher-Demo-1.0.0.zip");
  assert.ok(
    status.path.startsWith(join(downloads, "launcher-demo", "Downloads")),
  );
  await page
    .getByRole("button", { name: "Install package", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Launch installed app", exact: true })
    .waitFor({ timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Launch installed app", exact: true }),
  ).toBeEnabled();
  snapshot = await call("get_snapshot");
  const installation = snapshot.store.installations.find(
    (a) => a.catalogId === "launcher-demo",
  );
  assert.ok(
    installation.directory.startsWith(
      join(picked, "launcher-demo", "Versions"),
    ),
  );
  assert.ok(installation.installedBytes > 0);
  assert.ok(installation.packageBytes > 0);
  assert.equal(installation.packageName, "Launcher-Demo-1.0.0.zip");
  await page.screenshot({ path: join(root, "download-install.png") });
  await page.getByRole("tab", { name: "Information", exact: true }).click();
  await page.screenshot({ path: join(root, "installation-information.png") });
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.evaluate(
    async () =>
      await Promise.all(
        Array.from(document.images, (img) => img.decode().catch(() => {})),
      ),
  );
  await page.screenshot({ path: join(root, "discover.png") });
  await page
    .getByRole("button", { name: "Brightness Control", exact: true })
    .click();
  await page
    .locator(".project-image-stage img")
    .evaluate((img) => img.decode());
  await page.screenshot({ path: join(root, "brightness-details.png") });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const theme of ["light", "slate", "discord"]) {
    await page.getByLabel("Color scheme").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await pause(300);
    if (theme === "light")
      await page.screenshot({ path: join(root, "light-settings.png") });
  }
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await page.screenshot({ path: join(root, "tray-discovery-settings.png") });
  await page.getByRole("tab", { name: "Privacy", exact: true }).click();
  await page.screenshot({ path: join(root, "privacy-settings.png") });
  await page.getByRole("button", { name: "About & help", exact: true }).click();
  await page.getByText("Third-party license notices", { exact: true }).click();
  await expect(page.locator(".legal-notices pre")).toContainText(
    "Wrakeeb Launcher 0.4.0",
    { timeout: 30000 },
  );
  await page.keyboard.press("Escape");
  await call("exit_launcher").catch(() => {});
  const demoProcess = spawn(installation.entry, [], {
    cwd: installation.directory,
    stdio: "ignore",
    env: {
      ...process.env,
      WRAKEEB_TEST_MONITOR: "secondary",
      WRAKEEB_DEMO_DATA_ROOT: join(root, "Demo data"),
    },
  });
  try {
    onSecondMonitor(demoProcess.pid);
    await pause(500);
    assert.equal(
      demoProcess.exitCode,
      null,
      "Installed demo runs independently after launcher exit",
    );
  } finally {
    if (demoProcess.exitCode === null) demoProcess.kill();
  }
  await writeFile(
    join(root, "report.json"),
    JSON.stringify(
      {
        passed: true,
        trayRegistered: shell.trayRegistered,
        trayRectAvailable: shell.trayRectAvailable,
        hideRestore: true,
        closeToTray: true,
        minimizeToTray: true,
        nativeFolderPickerPlacementAndCancel: true,
        folderSelectionLimit:
          "Selection was not automated; saved custom-root behavior was verified separately",
        existingDualSteamDetected: true,
        scanFound: scan.found,
        scanFolders: scan.foldersChecked,
        directLatestDownload: true,
        unicodeDownloadFolder: true,
        perProjectFolders: true,
        installationSizeRecorded: true,
        bundledLegalNotices: true,
        independentDemoLaunch: true,
        installedVersion: installation.version,
        scanReadOnlyByDesign: true,
        monitor: "secondary",
      },
      null,
      2,
    ),
  );
  await call("exit_launcher").catch(() => {});
  console.log(
    "v0.4 native flow passed: tray, detection, native picker, latest download, independent install and size metadata on monitor 2.",
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
