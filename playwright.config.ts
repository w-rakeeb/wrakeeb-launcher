import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  use: {
    baseURL: process.env.WRAKEEB_QA_URL || "http://127.0.0.1:1421",
    channel: "msedge",
    viewport: { width: 1440, height: 900 },
  },
  workers: 1,
  reporter: "list",
});

