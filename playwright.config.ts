import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: process.env.STAGING_ADMIN_URL ?? "https://staging-admin.supershyft.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
