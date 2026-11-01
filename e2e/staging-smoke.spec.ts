import { test, expect } from "@playwright/test";

const BASE = "https://staging-admin.supershyft.com";
const PHONE = "8762830757";
const OTP = "654321";

test.describe("staging admin smoke (Prompt 2 — dev-api only; admin regression)", () => {
  test("login and open notifications library tabs", async ({ page }) => {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

    await page.getByLabel("Phone number").fill(PHONE);
    await page.getByRole("button", { name: "Send OTP" }).click();

    await expect(page.getByLabel("Verification code")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Verification code").fill(OTP);
    await page.getByRole("button", { name: "Verify & Sign in" }).click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

    await page.goto(`${BASE}/notifications/logs`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Logs", exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`${BASE}/notifications/services`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Services", exact: true })).toBeVisible({ timeout: 20_000 });

    await page.goto(`${BASE}/notifications/notifications`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`${BASE}/settings/notifications`, { waitUntil: "networkidle" });
    await expect(page.getByText(/notification/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
