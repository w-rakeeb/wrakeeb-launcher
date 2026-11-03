import { chromium, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, copyFile, writeFile, readFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { onSecondMonitor } from "./second-monitor.mjs";
const root = resolve(
  process.env.WRAKEEB_CONTROLS_QA_ROOT || "runtime/v062-controls-qa",
);
await mkdir(join(root, "data"), { recursive: true });
const apps = join(root, "Applications"),
  directory = join(
    apps,
    "launcher-demo",
    "Versions",
    "close-fixture-" + Date.now(),
  );
await mkdir(directory, { recursive: true });
const entry = join(directory, "CloseFixture.exe");
const compiler = join(
  process.env.WINDIR || "C:\\Windows",
  "Microsoft.NET",
  "Framework64",
  "v4.0.30319",
  "csc.exe",
);
const compiledFixture = join(root, "CloseFixture.exe");
execFileSync(
  compiler,
  [
    "/nologo",
    "/target:winexe",
    "/r:System.Windows.Forms.dll",
    "/r:System.Drawing.dll",
    `/out:${compiledFixture}`,
    resolve("tests/fixtures/CloseFixture.cs"),
  ],
  { windowsHide: true, stdio: "pipe" },
);

await copyFile(compiledFixture, entry);
const fixture = {
  catalogId: "launcher-demo",
  version: "QA fixture",
  directory,
  entry,
  sha256: "a".repeat(64),
  packageName: "Isolated close fixture",
  packageBytes: 1,
  installedBytes: 1,
  installedAt: 1,
};
await writeFile(
  join(directory, "wrakeeb-installation.json"),
  JSON.stringify(fixture),
);
await mkdir(join(root, "Downloads"), { recursive: true });
const prefs = {
  interfaceStyle: "claude",
  theme: "discord",
  checkUpdatesOnStart: false,
  scanOnStart: false,
  reduceMotion: true,
  rememberPage: true,
  installDirectory: apps,
  downloadDirectory: join(root, "Downloads"),
  notifications: true,
};
await writeFile(
  join(root, "data/library.json"),
  JSON.stringify({
    schema: 1,
    apps: [
      {
        id: "qa-fixture",
        catalogId: "launcher-demo",
        name: "Launcher Demo",
        path: entry,
        favorite: false,
        addedAt: 1,
        lastLaunched: null,
      },
    ],
    installations: [fixture],
    activity: [],
    preferences: prefs,
  }),
);
const exe = join(root, process.env.WRAKEEB_QA_INSTALLED ? "wrakeeb-launcher.exe" : "Wrakeeb Launcher.exe");
if (!process.env.WRAKEEB_QA_INSTALLED) await copyFile(
  resolve(
    process.env.WRAKEEB_QA_BINARY ||
      "src-tauri/target/debug/wrakeeb-launcher.exe",
  ),
  exe,
);
const child = spawn(exe, [], {
  cwd: root,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
      "--remote-debugging-address=127.0.0.1 --remote-debugging-port=19440",
    WRAKEEB_CLOSE_QA_ROOT: root,
  },
});
onSecondMonitor(child.pid);
let browser, call;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 140; i++) {
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:19440");
      break;
    } catch {
      await pause(250);
    }
  }
  assert.ok(browser);
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  await page.waitForFunction(() => window.__TAURI_INTERNALS__);
  call = (name, args) =>
    page.evaluate(
      ({ name, args }) => window.__TAURI_INTERNALS__.invoke(name, args),
      { name, args },
    );
  await expect(page.locator(".rail-toggle")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Application menu", exact: true })
    .click();
  await page.locator(".navigation-menu summary").click();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(page.locator(".launcher")).toHaveClass(/rail-collapsed/);
  await page
    .getByRole("button", { name: "Application menu", exact: true })
    .click();
  await page.locator(".navigation-menu summary").click();
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(page.locator(".launcher")).not.toHaveClass(/rail-collapsed/);
  await page.getByRole("button", {name:"Application menu",exact:true}).click();
  await page.locator(".navigation-menu summary").click();
  await page.screenshot({path:join(root,"navigation-menu.png")});
  await page.keyboard.press("Escape");
  await assert.rejects(
    call("close_launched_application", { id: "untracked" }),
    /not started/,
  );
  await page
    .getByRole("button", { name: "Launcher Demo", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Application management" })
      .getByRole("button", { name: "Uninstall application…", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Launch", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await call("get_running_apps")).find((a) => a.id === "qa-fixture")
          ?.canClose,
      { timeout: 15000 },
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Close application", exact: true }),
  ).toBeEnabled({ timeout: 10000 });
  await assert.rejects(
    call("uninstall_project", { id: "launcher-demo" }),
    /Close the running/,
  );
  await access(entry);
  await page
    .getByRole("button", { name: "Close application", exact: true })
    .click();
  await expect
    .poll(async () => {
      try {
        await access(join(root, "close-cancelled.txt"));
        return true;
      } catch {
        return false;
      }
    })
    .toBe(true);
  assert.ok(
    (await call("get_running_apps")).some((a) => a.id === "qa-fixture"),
  );
  await page.screenshot({ path: join(root, "application-controls.png") });
  await call("remove_application",{id:"qa-fixture"});
  assert.equal((await call("get_snapshot")).store.apps.length,0);
  await assert.rejects(call("uninstall_project",{id:"launcher-demo"}),/Close the running/);
  assert.equal((await call("get_running_apps"))[0].name,"Launcher Demo");

  await call("show_tray_panel", { x: -550, y: 1100 });
  let tray;
  for (let i = 0; i < 100; i++) {
    tray = context.pages().find((p) => p.url().includes("#tray"));
    if (tray) break;
    await pause(150);
  }
  assert.ok(tray, "Custom native tray webview exists");
  await expect(
    tray.getByRole("region", { name: "Wrakeeb Launcher quick access" }),
  ).toBeVisible({ timeout: 20000 });
  assert.ok(
    await tray.evaluate(() => screen.availLeft < 0),
    "Tray panel on monitor 2",
  );
  await expect(
    tray.getByRole("button", { name: "Close Launcher Demo", exact: true }),
  ).toBeEnabled();
  await tray.screenshot({ path: join(root, "tray-dark.png") });
  await tray
    .getByRole("button", { name: "Close Launcher Demo", exact: true })
    .click();
  await expect
    .poll(async () => (await call("get_running_apps")).length)
    .toBe(0);
  await tray.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  const saved = (await call("get_snapshot")).store.preferences;
  await call("save_preferences", {
    preferences: { ...saved, theme: "light", interfaceStyle: "classic" },
  });
  await call("show_tray_panel", { x: -550, y: 1100 });
  await expect(tray.locator("html")).toHaveAttribute("data-theme", "light");
  await tray.screenshot({ path: join(root, "tray-light.png") });
  await tray.keyboard.press("Escape");
  await pause(200);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page
    .getByRole("button", { name: "Launcher Demo", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Application management" })
    .getByRole("button", { name: "Uninstall application…", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Uninstall Launcher Demo?" }),
  ).toBeVisible();
  await page.screenshot({ path: join(root, "uninstall-confirmation.png") });
  await page
    .getByRole("dialog", { name: "Uninstall Launcher Demo?" })
    .getByRole("button", { name: "Uninstall application", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("recoverable", {
    timeout: 30000,
  });
  await assert.rejects(access(directory));
  const snapshot = await call("get_snapshot");
  assert.equal(snapshot.store.apps.length, 0);
  assert.equal(snapshot.store.installations.length, 0);
  await writeFile(
    join(root, "report.json"),
    JSON.stringify(
      {
        passed: true,
        version: "0.6.2",
        nativeTrayWindow: true,
        trayThemes: ["discord", "light"],
        trayNavigation: true,
        trayCloseApp: true,
        escapeDismissal: true,
        sidebarInMenu: true,
        uninstallVisible: true,
        runningUninstallBlocked: true,
        gracefulClose: true,
        appMayCancelClose: true,
        noForceTermination: true,
        untrackedCloseRejected: true,
        fixtureOnlyRecycle: true,
        monitor: "secondary",
      },
      null,
      2,
    ),
  );
  await page
    .getByRole("button", { name: "Close launcher", exact: true })
    .click()
    .catch(() => {});
  for (let i = 0; i < 60 && child.exitCode === null; i++) await pause(100);
  assert.equal(
    child.exitCode,
    0,
    "Main close must exit even after creating the tray panel",
  );
  console.log("0.6.2 native controls passed on monitor 2.");
} finally {
  if (call) {
    await call("close_launched_application", { id: "qa-fixture" }).catch(
      () => {},
    );
    await pause(150);
    await call("close_launched_application", { id: "qa-fixture" }).catch(
      () => {},
    );
  }
  await browser?.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
