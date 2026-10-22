import { test, expect } from "@playwright/test";

const BASE = process.env.STAGING_ADMIN_URL ?? "https://staging-admin.supershyft.com";
const PHONE = process.env.STAGING_EMPLOYEE_PHONE ?? "8762830757";
const OTP = process.env.STAGING_BYPASS_OTP ?? "654321";

test.describe("Staging admin smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole("button", { name: /send|continue|sign/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("employee OTP login and notifications area", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first();
    await phoneInput.fill(PHONE);
    const sendBtn = page.getByRole("button", { name: /send|continue|get otp|sign in/i }).first();
    await sendBtn.click();
    const otpInput = page.locator('input[name="otp"], input[placeholder*="otp" i], input[inputmode="numeric"]').first();
    await otpInput.waitFor({ state: "visible", timeout: 20000 });
    await otpInput.fill(OTP);
    const verifyBtn = page.getByRole("button", { name: /verify|submit|continue|sign in/i }).first();
    await verifyBtn.click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });

    await page.goto(`${BASE}/notifications/logs`);
    await expect(page.getByRole("heading", { name: /notification/i }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: /^Logs$/ })).toBeVisible();

    await page.getByRole("button", { name: /^Services$/ }).click();
    await expect(page.getByText(/service key|channel/i).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /^Notifications$/ }).click();
    await expect(page.getByRole("button", { name: /add|new|set up/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
