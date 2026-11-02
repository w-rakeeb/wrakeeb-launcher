import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { copyFile, mkdir, writeFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { onSecondMonitor } from "./second-monitor.mjs";

const root = resolve("runtime/native-qa");
await mkdir(root, { recursive: true });
const executable = join(root, "Wrakeeb Launcher.exe");
await copyFile(
  resolve(
    process.env.WRAKEEB_QA_BINARY ||
      "src-tauri/target/debug/wrakeeb-launcher.exe",
  ),
  executable,
);
const port = 19423;
const start = () =>
  spawn(executable, [], {
    cwd: root,
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-address=127.0.0.1 --remote-debugging-port=${port}`,
    },
    stdio: "ignore",
  });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function connect() {
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok)
        return chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    } catch {
      /* WebView2 is still starting. */
    }
    await pause(250);
  }
  throw new Error("Native window did not expose its test debugging endpoint.");
}
let child = start();
onSecondMonitor(child.pid);
let browser;
try {
  browser = await connect();
  const context = browser.contexts()[0];
  let page = context.pages()[0] ?? (await context.waitForEvent("page"));
  await page.waitForFunction(
    () => globalThis.isTauri && window.__TAURI_INTERNALS__,
  );
  const call = (name, args) =>
    page.evaluate(
      ({ name, args }) => window.__TAURI_INTERNALS__.invoke(name, args),
      { name, args },
    );
  let snapshot = await call("get_snapshot");
  assert.ok(
    snapshot.availableIds.length >= 3,
    "Expected known local applications on this workstation",
  );
  for (const id of snapshot.availableIds) {
    if (!snapshot.store.apps.some((app) => app.catalogId === id))
      await call("link_catalog_app", { id });
  }
  snapshot = await call("get_snapshot");
  assert.equal(snapshot.store.apps.length, snapshot.availableIds.length);
  const first = snapshot.store.apps[0];
  await call("set_favorite", { id: first.id, favorite: true });
  assert.equal((await call("get_snapshot")).store.apps[0].favorite, true);
  await call("set_favorite", { id: first.id, favorite: false });
  await assert.rejects(call("launch_application", { id: "unregistered-id" }));
  await call("remove_application", { id: first.id });
  await access(first.path);
  await call("link_catalog_app", { id: first.catalogId });
  const preferences = snapshot.store.preferences;
  await call("save_preferences", {
    preferences: { ...preferences, compact: true },
  });
  assert.equal((await call("get_snapshot")).store.preferences.compact, true);
  await call("save_preferences", { preferences });
  await page.reload();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your library", exact: true })
    .waitFor();
  await page.mouse.move(800, 15);
  await pause(300);
  await page.screenshot({ path: join(root, "native-library.png") });
  await page.getByRole("button", { name: "Discover", exact: true }).click();

  for (const card of await page.locator(".app-item").all()) {
    await card.scrollIntoViewIfNeeded();
    for (const image of await card.locator("img").all()) {
      await image.evaluate((img) => img.decode());
      assert.ok(await image.evaluate((img) => img.naturalWidth > 0));
    }
  }
  await page.getByRole("button", { name: "Dual Discord", exact: true }).click();
  await page
    .locator(".project-image-stage img")
    .evaluate((img) => img.decode());
  await page.mouse.move(800, 15);
  await pause(300);
  await page.screenshot({ path: join(root, "native-project-details.png") });
  await page
    .getByRole("button", {
      name: "Enlarge Dual Discord image: Profiles · Windows",
      exact: true,
    })
    .click();
  await pause(300);
  await page.screenshot({ path: join(root, "native-image-viewer.png") });
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("heading", { name: "Dual Discord", exact: true })
      .count(),
    1,
  );
  await page.getByRole("button", { name: "Discover", exact: true }).click();

  await page.mouse.move(800, 15);
  await pause(300);
  await page.screenshot({ path: join(root, "native-discover.png") });
  await browser.close();
  browser = undefined;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await pause(700);
  child = start();
  onSecondMonitor(child.pid);
  browser = await connect();
  page =
    browser.contexts()[0].pages()[0] ??
    (await browser.contexts()[0].waitForEvent("page"));
  await page.waitForFunction(
    () => globalThis.isTauri && window.__TAURI_INTERNALS__,
  );
  const reopened = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("get_snapshot"),
  );
  assert.equal(reopened.store.apps.length, snapshot.store.apps.length);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.mouse.move(800, 15);
  await pause(300);
  await page.screenshot({ path: join(root, "native-settings.png") });
  await writeFile(
    join(root, "report.json"),
    JSON.stringify(
      {
        passed: true,
        localApplications: reopened.store.apps.length,
        checks: [
          "actual native IPC",
          "bundled original images and logos decoded",
          "native gallery and full-size viewer",
          "local executable detection",
          "linking",
          "favorites",
          "unregistered launch rejected",
          "remove preserves file",
          "preferences saved",
          "library survives process restart",
        ],
        limitations: [
          "Native file-picker interaction not automated",
          "User applications were not launched; an inert executable was launched by the Rust test",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `Native smoke test passed; ${reopened.store.apps.length} real local app links survived restart.`,
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (child.exitCode === null) child.kill();
}
