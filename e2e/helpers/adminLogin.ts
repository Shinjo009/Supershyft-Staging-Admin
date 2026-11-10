import type { Page } from "@playwright/test";

const DEFAULT_OTP = "654321";

export async function loginAsEmployee(page: Page): Promise<void> {
  const phone = process.env.E2E_ADMIN_PHONE;
  if (!phone?.trim()) {
    throw new Error("Set E2E_ADMIN_PHONE to an employee phone allowed on staging.");
  }
  const otp = process.env.E2E_ADMIN_OTP?.trim() || DEFAULT_OTP;

  await page.goto("/login?redirect=%2Fnotifications%2Flogs");

  await page.getByLabel(/phone number/i).fill(phone);
  await page.getByRole("button", { name: "Send OTP" }).click();

  await page.getByLabel(/verification code/i).fill(otp);
  await page.getByRole("button", { name: "Verify & Sign in" }).click();

  await page.waitForURL(/\/notifications\/logs|\/dashboard/, { timeout: 60_000 });
}
