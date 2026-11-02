import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { onSecondMonitor } from "./second-monitor.mjs";

const root = resolve("runtime/upgrade-qa");
await mkdir(root, { recursive: true });
const target = join(root, "Wrakeeb Launcher.exe");
const downloads = join(root, "Chosen downloads");
await mkdir(downloads, { recursive: true });
await copyFile(resolve(process.env.WRAKEEB_PREVIOUS_BINARY || "Backups/before-v0.3.0-20261102/Wrakeeb Launcher.exe"), target);
const port = 19424;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (data) => createHash("sha256").update(data).digest("hex");
const child = spawn(target, [], {
  cwd: root,
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-address=127.0.0.1 --remote-debugging-port=${port}`,
  },
});
onSecondMonitor(child.pid);
let browser;
async function connect() {
  for (let i = 0; i < 160; i++) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    } catch {
      await delay(250);
    }
  }
  throw new Error("Update test could not connect to its isolated WebView.");
}
let call;
async function attach() {
  browser = await connect();
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.waitForEvent("page"));
  await page.waitForFunction(() => window.__TAURI_INTERNALS__);
  call = (name, args) =>
    page.evaluate(
      ({ name, args }) => window.__TAURI_INTERNALS__.invoke(name, args),
      { name, args },
    );
  return page;
}
try {
  let page = await attach();
  const snapshot = await call("get_snapshot");
  if (
    snapshot.availableIds.length &&
    !snapshot.store.apps.some((a) => a.catalogId === snapshot.availableIds[0])
  )
    await call("link_catalog_app", { id: snapshot.availableIds[0] });
  await call("save_preferences", {
    preferences: {
      ...snapshot.store.preferences,
      theme: "discord",
      downloadDirectory: downloads,
      checkUpdatesOnStart: false,
    },
  });
  const library = await readFile(join(root, "data/library.json"));
  // Let any initial optional check finish before making the explicit request.
  for (
    let i = 0;
    (await call("get_update_status")).stage === "checking" && i < 120;
    i++
  )
    await delay(250);
  const available = await call("check_launcher_updates");
  assert.equal(available.stage, "available", available.message);
  assert.equal(available.installedVersion, "0.2.0");
  const downloaded = await call("download_launcher_update");
  assert.equal(downloaded.stage, "downloaded", downloaded.message);
  assert.equal(
    resolve(downloaded.downloadPath),
    join(downloads, "Wrakeeb-Launcher-0.3.0-Windows-x64.exe"),
  );
  const original = await readFile(downloaded.downloadPath);
  const publishedHash = hash(original);
  assert.equal(
    publishedHash,
    hash(
      await readFile(resolve("src-tauri/target/release/wrakeeb-launcher.exe")),
    ),
  );
  const targetBefore = hash(await readFile(target));
  const corrupt = Buffer.from(original);
  corrupt[1024] ^= 1;
  await writeFile(downloaded.downloadPath, corrupt);
  await assert.rejects(
    call("install_launcher_update"),
    /checksum|integrity|verification|match/i,
  );
  assert.equal(hash(await readFile(target)), targetBefore);
  await writeFile(downloaded.downloadPath, original);
  await page.getByRole("button", { name: "Updates", exact: true }).click();
  await page.screenshot({ path: join(root, "before-install.png") });
  await call("install_launcher_update").catch(() => {}); // IPC closes during restart.
  await browser.close().catch(() => {});
  browser = undefined;
  for (let i = 0; i < 200; i++) {
    try {
      if (hash(await readFile(target)) === publishedHash) break;
    } catch {}
    await delay(200);
  }
  assert.equal(hash(await readFile(target)), publishedHash);
  await delay(1000);
  page = await attach();
  // Resolve only this fixture's restarted PID, then place it before UI assertions.
  const pid = Number(
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq '${target.replaceAll("'", "''")}' } | Select-Object -First 1 -ExpandProperty ProcessId`,
      ],
      { windowsHide: true, encoding: "utf8" },
    ).trim(),
  );
  assert.ok(pid > 0);
  onSecondMonitor(pid);
  assert.equal(
    hash(await readFile(join(root, "data/library.json"))),
    hash(library),
  );
  assert.equal((await call("get_update_status")).installedVersion, "0.3.0");
  let result;
  for (let i = 0; i < 120; i++) {
    try {
      result = JSON.parse(
        await readFile(join(root, "data/updates/result.json"), "utf8"),
      );
      break;
    } catch {
      await delay(250);
    }
  }
  assert.equal(result?.success, true, result?.message);
  const current = await call("check_launcher_updates");
  assert.equal(current.stage, "current", current.message);
  await page.getByRole("button", { name: "Updates", exact: true }).click();
  await page.screenshot({ path: join(root, "after-install.png") });
  await writeFile(
    join(root, "report.json"),
    JSON.stringify(
      {
        passed: true,
        installed: current.installedVersion,
        latest: current.latestVersion,
        sha256: publishedHash,
        chosenDownloadFolder: downloads,
        corruptDownloadRejected: true,
        executableReplaced: true,
        startupReady: result.success,
        libraryPreserved: true,
        monitor: "secondary",
      },
      null,
      2,
    ),
  );
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
  await page
    .getByRole("button", { name: "Close launcher", exact: true })
    .click()
    .catch(() => {});
  console.log(
    "Live upgrade passed: public SHA verified, chosen folder honored, corrupt package rejected, replacement/restart ready, library unchanged, native maximize/restore/close on second monitor.",
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
