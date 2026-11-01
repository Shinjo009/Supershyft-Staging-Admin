import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "https://staging-admin.supershyft.com",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
