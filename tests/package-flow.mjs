import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { onSecondMonitor } from "./second-monitor.mjs";

const root = resolve("runtime/package-qa");
await mkdir(root, { recursive: true });
const executable = join(root, "Wrakeeb Launcher.exe");
await copyFile(
  resolve(
    process.env.WRAKEEB_QA_BINARY ||
      "src-tauri/target/debug/wrakeeb-launcher.exe",
  ),
  executable,
);
const downloads = join(root, "Downloads with spaces");
const installations = join(root, "Installed applications");
await mkdir(downloads, { recursive: true });
await mkdir(installations, { recursive: true });
const port = 19425;
const child = spawn(executable, [], {
  cwd: root,
  stdio: "ignore",
  env: {
    ...process.env,
    WRAKEEB_TEST_MONITOR: "secondary",
    WRAKEEB_DEMO_DATA_ROOT: join(root, "Demo data"),
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-address=127.0.0.1 --remote-debugging-port=${port}`,
  },
});
onSecondMonitor(child.pid);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  for (let i = 0; i < 120; i++) {
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      break;
    } catch {
      await pause(250);
    }
  }
  assert.ok(browser);
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.waitForEvent("page"));
  await page.waitForFunction(
    () => window.__TAURI_INTERNALS__ && location.hostname !== "chromewebdata",
  );
  const call = (name, args) =>
    page.evaluate(
      ({ name, args }) => window.__TAURI_INTERNALS__.invoke(name, args),
      { name, args },
    );
  let snapshot = await call("get_snapshot");
  await call("save_preferences", {
    preferences: {
      ...snapshot.store.preferences,
      theme: "discord",
      accent: "default",
      downloadDirectory: downloads,
      installDirectory: installations,
      checkUpdatesOnStart: false,
    },
  });
  await page.reload();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page
    .getByRole("button", { name: "Launcher Demo", exact: true })
    .click();
  await page
    .getByText("Launcher-Demo-1.0.0.zip", { exact: true })
    .waitFor({ timeout: 60000 });
  const demoRow = page
    .locator(".release-file")
    .filter({ hasText: "Launcher-Demo-1.0.0.zip" });
  await demoRow.getByRole("button", { name: "Download", exact: true }).click();
  await page
    .getByRole("button", { name: "Install package", exact: true })
    .waitFor({ timeout: 60000 });
  let status = await call("get_package_status");
  assert.equal(status.stage, "downloaded");
  assert.ok(status.path.startsWith(downloads));
  const packageBytes = await readFile(status.path);
  const corrupt = Buffer.from(packageBytes);
  corrupt[0] ^= 1;
  await writeFile(status.path, corrupt);
  const rejected = await call("install_project_package");
  assert.equal(rejected.stage, "error");
  assert.match(rejected.message, /checksum/i);
  await writeFile(status.path, packageBytes);
  const release = await call("get_project_release", { id: "launcher-demo" });
  const zip = release.assets.find((a) => a.name === "Launcher-Demo-1.0.0.zip");
  await call("download_project_asset", {
    id: "launcher-demo",
    assetId: zip.id,
  });
  await page
    .getByRole("button", { name: "Install package", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Launch installed app", exact: true })
    .waitFor({ timeout: 60000 });
  snapshot = await call("get_snapshot");
  const installed = snapshot.store.installations.find(
    (a) => a.catalogId === "launcher-demo",
  );
  assert.ok(installed.entry.startsWith(installations));
  await access(installed.entry);
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("button")).some(
      (button) =>
        button.textContent?.includes("Launch installed app") &&
        !button.disabled,
    ),
  );
  await page.screenshot({ path: join(root, "demo-installed.png") });
  const link = snapshot.store.apps.find((a) => a.catalogId === "launcher-demo");
  await call("launch_application", { id: link.id });
  await pause(1000);
  const pid = Number(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq '${installed.entry.replaceAll("'", "''")}' } | Select-Object -First 1 -ExpandProperty ProcessId`,
      ],
      { windowsHide: true, encoding: "utf8" },
    ).trim(),
  );
  assert.ok(pid > 0);
  onSecondMonitor(pid);
  // Close the launcher and confirm the independently installed demo stays open.
  await page
    .getByRole("button", { name: "Close launcher", exact: true })
    .click()
    .catch(() => {});
  await pause(800);
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `$p=Get-Process -Id ${pid} -ErrorAction Stop; if (-not $p.Responding) { throw 'Demo is not responding' }`,
    ],
    { windowsHide: true },
  );
  await writeFile(
    join(root, "report.json"),
    JSON.stringify(
      {
        passed: true,
        liveGitHubDownload: true,
        zipInstallation: true,
        corruptedPackageRejected: true,
        chosenDownloadFolder: downloads,
        chosenInstallFolder: installations,
        installedVersion: installed.version,
        standaloneLaunchAfterLauncherExit: true,
        demoPid: pid,
        demoExecutable: installed.entry,
        monitor: "secondary",
      },
      null,
      2,
    ),
  );
  console.log(
    `Package flow passed; standalone demo remains on monitor 2 for inspection. PID ${pid}`,
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
