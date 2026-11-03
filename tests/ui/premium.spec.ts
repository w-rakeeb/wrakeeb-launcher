import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const ids = ["dual-discord", "stickyn", "codex-presence", "coucou", "dual-steam"];
    const data = JSON.parse(localStorage.getItem("premium-fixture") || "null") ?? {
      store: { schema: 1, apps: ids.map(id => ({ id, catalogId: id, name: id, path: `D:/Fixtures/${id}.exe`, favorite: false, addedAt: 1, lastLaunched: null })), activity: [], installations: [], preferences: { theme: "discord", librarySort: "name", customOrder: [], checkUpdatesOnStart: false, scanOnStart: false, compact: false, reduceMotion: false, rememberPage: true, downloadDirectory: "D:/Default Downloads" } },
      availableIds: [], missingIds: [], dataDirectory: "D:/Fixtures/data", downloadDirectory: "D:/Default Downloads",
    };
    const empty = { stage: "", projectId: "", name: "", message: "", totalBytes: 0, downloadedBytes: 0 };
    Object.defineProperty(globalThis, "isTauri", { value: true });
    (window as any).qaCalls = [];
    (window as any).__TAURI_INTERNALS__ = { invoke: async (name: string, args: any = {}) => {
      (window as any).qaCalls.push({ name, args });
      if (name === "get_snapshot") return structuredClone(data);
      if (name === "save_preferences") { data.store.preferences = args.preferences; localStorage.setItem("premium-fixture", JSON.stringify(data)); return; }
      if (name === "get_package_status") return empty;
      if (name === "get_update_status") return { stage: "idle", installedVersion: "0.5.0", message: "", lastChecked: null };
      if (name === "choose_download_directory") { if ((window as any).cancelPicker) return null; if (!args.temporary) { data.downloadDirectory = "D:/One time"; data.store.preferences.downloadDirectory = data.downloadDirectory; } return "D:/One time"; }
      if (name === "download_latest_project") return { ...empty, stage: "error", projectId: args.id, message: "QA stopped before network" };
      return null;
    } };
  });
});

test("cards stay equal, close stays inside, and drag order survives restart", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".app-item");
  await expect(cards).toHaveCount(5);
  const sizes = await cards.evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  expect(Math.max(...sizes.map(s => s.width)) - Math.min(...sizes.map(s => s.width))).toBeLessThan(2);
  expect(Math.max(...sizes.map(s => s.height)) - Math.min(...sizes.map(s => s.height))).toBeLessThan(2);
  const close = await page.getByLabel("Close launcher", { exact: true }).boundingBox();
  expect(close!.x + close!.width).toBeLessThanOrEqual(1440);
  expect(close!.width).toBe(44);
  const firstName = await cards.first().locator(".app-title").innerText();
  await cards.first().hover();
  await cards.first().locator(".reorder-handle").dragTo(cards.nth(2));
  await expect(page.getByLabel("Sort applications")).toHaveValue("custom");
  await expect(cards.nth(2).locator(".app-title")).toHaveText(firstName);
  await page.reload();
  await expect(cards.nth(2).locator(".app-title")).toHaveText(firstName);
  await cards.nth(2).locator(".reorder-handle").focus();
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(cards.nth(1).locator(".app-title")).toHaveText(firstName);
});

test("all darker themes save, and settings fit compact windows", async ({ page }) => {
  await page.goto("/#settings");
  for (const [name, id] of [["Obsidian", "obsidian"], ["Midnight", "midnight"], ["Graphite", "graphite"], ["Light", "light"]]) {
    await page.getByRole("button", { name: `${name} theme`, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  for (const width of [1440, 900, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.locator("main").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});

test("one-time folder reaches the download without changing the default", async ({ page }) => {
  await page.goto("/#downloads");
  await page.getByRole("button", { name: "Choose folder", exact: true }).click();
  await expect(page.getByText("One-time folder · resets after this download")).toBeVisible();
  await page.evaluate(() => { (window as any).cancelPicker = true; });
  await page.getByRole("button", { name: "Choose folder", exact: true }).click();
  await expect(page.getByText("One-time folder · resets after this download")).toBeVisible();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.locator(".app-item").filter({ has: page.getByRole("button", { name: "Brightness Control", exact: true }) }).getByRole("button", { name: "Download", exact: true }).click();
  expect(await page.evaluate(() => (window as any).qaCalls.find((c: any) => c.name === "download_latest_project").args.directory)).toBe("D:/One time");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Downloads", exact: true }).click();
  await expect(page.locator(".download-location")).toHaveText("D:/Default Downloads");
  await page.getByRole("button", { name: "Downloads", exact: true }).click();
  await expect(page.getByText("Using your default folder from Settings")).toBeVisible();
});

test("About has one working scroll area through the license notices", async ({ page }) => {
  test.setTimeout(60000);


  await page.goto("/");
  await page.getByRole("button", { name: "About & help", exact: true }).click();
  const box = page.locator(".about-dialog");
  await page.locator(".legal-notices summary").click();


  await expect.poll(() => page.locator(".legal-notices pre").evaluate(el => el.textContent?.slice(0, 30)), { timeout: 30000 }).toContain("THIRD-PARTY NOTICES");
  expect(await page.locator(".legal-notices pre").evaluate(el => getComputedStyle(el).overflowY)).toBe("visible");
  await box.focus();
  await page.keyboard.press("Control+End");
  await expect(page.getByRole("button", { name: "Got it", exact: true })).toBeInViewport();
  expect(await box.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});





