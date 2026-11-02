import { expect, test } from "@playwright/test";
import type { Snapshot } from "../../src/catalog";

test("browser preview: discover, filter, details, help and honest downloads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your library", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator(".app-item")).toHaveCount(5);
  await page.getByRole("button", { name: "Productivity", exact: true }).click();
  await expect(page.locator(".app-item")).toHaveCount(2);
  await page.getByRole("button", { name: "All apps", exact: false }).click();
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("textbox", { name: "Search applications" }),
  ).toBeFocused();
  await page.keyboard.type("Sticky");
  await expect(page.locator(".app-item")).toHaveCount(1);
  await page.getByRole("button", { name: "StickyN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "StickyN", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not published", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Choose executable", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Open the desktop application",
  );
  await page.getByRole("button", { name: "Downloads", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No downloads yet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "About & help" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("original project images load and the image viewer keeps app details open", async ({
  page,
}) => {
  await page.goto("/#discover");
  const cards = page.locator(".app-item");
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    for (const image of await card.locator("img").all()) {
      await expect
        .poll(() =>
          image.evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await expect(card.locator(".project-brand-cover .project-logo")).toHaveCount(1);
  }
  await page.getByRole("button", { name: "StickyN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "StickyN", exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("button", { name: "Show Settings · Native 0.16.0", exact: true })
    .click();
  await expect(page.locator(".gallery-caption")).toContainText("2 / 2");
  await page
    .getByRole("button", {
      name: "Enlarge StickyN image: Settings · Native 0.16.0",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "StickyN image viewer" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".full-project-image")
        .evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "StickyN image viewer" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "StickyN", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".gallery-caption")).toContainText("2 / 2");
});

test("desktop bridge: linked app favorites, launch errors, removal, settings and persistence", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const data = {
      store: {
        schema: 1,
        preferences: {
          compact: false,
          reduceMotion: false,
          rememberPage: true,
        },
        activity: [],
        apps: [
          {
            id: "fixture",
            name: "StickyN",
            catalogId: "stickyn",
            path: "D:/Fixtures/StickyN.exe",
            favorite: false,
            addedAt: 1,
            lastLaunched: null,
          },
        ],
      },
      availableIds: ["stickyn"],
      missingIds: [],
      dataDirectory: "D:/Fixtures/data",
    };
    Object.defineProperty(globalThis, "isTauri", { value: true });
    (
      window as unknown as { __TAURI_INTERNALS__: unknown }
    ).__TAURI_INTERNALS__ = {
      invoke: async (name: string, args: Record<string, unknown>) => {
        if (name === "get_snapshot") return structuredClone(data);
        if (name === "set_favorite") {
          data.store.apps[0].favorite = args.favorite as boolean;
          return;
        }
        if (name === "launch_application")
          throw "The selected file is missing.";
        if (name === "remove_application") {
          data.store.apps = [];
          return;
        }
        if (name === "save_preferences") {
          data.store.preferences =
            args.preferences as typeof data.store.preferences;
          return;
        }
        throw new Error(`Unexpected test command: ${name}`);
      },
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Favorite StickyN", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unfavorite StickyN", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("file is missing");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Color scheme").selectOption("wrakeeb");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "wrakeeb");
  await page.getByLabel("Color scheme").selectOption("discord");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "discord");
  await page.getByRole("checkbox", { name: /Compact library/ }).check();
  await expect(page.locator(".launcher")).toHaveClass(/compact/);
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "StickyN", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove from library", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "files and its settings stay",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove from library", exact: true })
    .click();
  await expect(
    page.getByText("0 linked applications", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Application files were kept",
  );
});

for (const width of [1440, 900, 768, 390]) {
  test(`layout stays within the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    await expect(page.locator(".app-item")).toHaveCount(5);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow).toBe(false);
    const mainOverflow = await page
      .locator("main")
      .evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(mainOverflow).toBe(false);
    await page.screenshot({
      path: `runtime/screenshots/discover-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Coucou", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}
