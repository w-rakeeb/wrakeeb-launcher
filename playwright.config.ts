import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  use: {
    baseURL: "http://127.0.0.1:1420",
    channel: "msedge",
    viewport: { width: 1440, height: 900 },
  },
  workers: 1,
  reporter: "list",
});
