import { defineConfig, devices } from "@playwright/test";

const localPort = 5173;
const localBase = `http://127.0.0.1:${localPort}`;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBase;
const runLocalWebServer =
  !process.env.PLAYWRIGHT_BASE_URL || baseURL.startsWith("http://127.0.0.1");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !runLocalWebServer,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: runLocalWebServer ? undefined : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: runLocalWebServer ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: runLocalWebServer
    ? {
        command: `npm run dev -- --host 127.0.0.1 --port ${localPort}`,
        url: localBase,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});