import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("runtime/v040-browser", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://127.0.0.1:1420/#discover");
await page.locator(".app-item").first().waitFor();
await page.evaluate(async () => {
  await Promise.all(
    Array.from(document.images, (img) => img.decode().catch(() => {})),
  );
});
await page.screenshot({ path: "runtime/v040-browser/discover.png" });
await page.getByRole("button", { name: "Dual Steam", exact: true }).click();
await page.locator(".project-image-stage img").evaluate((img) => img.decode());
await page.screenshot({ path: "runtime/v040-browser/details.png" });
await page.getByRole("tab", { name: "Downloads", exact: true }).click();
await page.screenshot({ path: "runtime/v040-browser/downloads.png" });
await page.getByRole("button", { name: "Settings", exact: true }).click();
await page.screenshot({ path: "runtime/v040-browser/settings.png" });
for (const width of [900, 768, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page.screenshot({ path: `runtime/v040-browser/discover-${width}.png` });
  console.log(
    width,
    await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      inner: innerWidth,
      main: document.querySelector("main").scrollWidth,
      client: document.querySelector("main").clientWidth,
    })),
  );
}
await browser.close();
