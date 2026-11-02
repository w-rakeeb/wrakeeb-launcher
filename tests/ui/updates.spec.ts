import { expect, test } from "@playwright/test";

test("download folder, theme and update results stay reactive and stale install actions clear", async ({ page }) => {
  await page.addInitScript(() => {
    const data = { store: { schema: 1, apps: [], activity: [], preferences: { compact: false, reduceMotion: false, rememberPage: true, theme: "discord", downloadDirectory: null as string | null, checkUpdatesOnStart: false } }, availableIds: [], missingIds: [], dataDirectory: "D:/QA/data", downloadDirectory: "D:/QA/Downloads" };
    let status = { stage: "idle", message: "Check for the latest stable release.", installedVersion: "0.2.0", latestVersion: null as string | null, lastChecked: null as number | null, notes: "", downloadedBytes: 0, totalBytes: 0, downloadPath: null as string | null };
    let checks = 0;
    Object.defineProperty(globalThis, "isTauri", { value: true });
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = { invoke: async (name: string, args: Record<string, unknown> = {}) => {
      if (name === "get_snapshot") return structuredClone(data);
      if (name === "confirm_frontend_ready") return;
      if (name === "get_update_status") return structuredClone(status);
      if (name === "choose_download_directory") { data.downloadDirectory = "D:/Chosen downloads"; data.store.preferences.downloadDirectory = data.downloadDirectory; return data.downloadDirectory; }
      if (name === "save_preferences") { data.store.preferences = args.preferences as typeof data.store.preferences; return; }
      if (name === "check_launcher_updates") {
        if (++checks > 1) throw new Error("GitHub is temporarily unavailable.");
        status = { ...status, stage: "available", message: "A newer version is available.", latestVersion: "0.3.0", lastChecked: Math.floor(Date.now() / 1000), notes: "A verified test release.", totalBytes: 1024 };
        return structuredClone(status);
      }
      if (name === "download_launcher_update") { status = { ...status, stage: "downloaded", message: "Download verified against GitHub's SHA-256 checksum.", downloadedBytes: 1024, downloadPath: "D:/Chosen downloads/update.exe" }; return structuredClone(status); }
      throw new Error(`Unexpected command ${name}`);
    } };
  });
  await page.goto("/#settings");
  await page.getByLabel("Color scheme").selectOption("wrakeeb");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "wrakeeb");
  await page.getByRole("tab", { name: "Downloads", exact: true }).click();
  await page.getByRole("button", { name: "Choose folder", exact: true }).click();
  await expect(page.locator(".download-location")).toHaveText("D:/Chosen downloads");
  await page.getByRole("button", { name: "Updates", exact: true }).click();
  await page.getByRole("button", { name: "Check for updates", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A new version is ready" })).toBeVisible();
  await page.getByRole("button", { name: "Download update", exact: true }).click();
  await expect(page.getByRole("button", { name: "Install & restart", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Check for updates", exact: true }).click();
  await expect(page.getByText("GitHub is temporarily unavailable.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Install & restart", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download update", exact: true })).toHaveCount(0);
});
