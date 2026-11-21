import { test, expect } from "@playwright/test";

/**
 * Live staging smoke for Redcliffe home collection (engagement console).
 * Set env before run:
 *   PLAYWRIGHT_BASE_URL=https://staging-admin.supershyft.com
 *   STAGING_ADMIN_PHONE=...
 *   STAGING_ADMIN_OTP=...
 *   STAGING_ENGAGEMENT_ID=1307
 */
const phone = process.env.STAGING_ADMIN_PHONE ?? "";
const otp = process.env.STAGING_ADMIN_OTP ?? "";
const engagementId = process.env.STAGING_ENGAGEMENT_ID ?? "1307";

test.describe("staging redcliffe home collection", () => {
  test.skip(!phone || !otp, "STAGING_ADMIN_PHONE and STAGING_ADMIN_OTP are required");

  test("book home collection on engagement console", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/login");
    await page.getByPlaceholder(/phone/i).fill(phone);
    await page.getByRole("button", { name: /send otp|continue|verify/i }).click();

    await page.getByPlaceholder(/otp|code/i).fill(otp);
    await page.getByRole("button", { name: /verify|login|sign in/i }).click();

    await page.waitForURL(/engagements|dashboard/i, { timeout: 60_000 });

    await page.goto(`/engagements/${engagementId}/console`);
    await expect(page.getByText(/Redcliffe/i).first()).toBeVisible({ timeout: 30_000 });

    const bookButton = page.getByRole("button", { name: /book home collection|book collection|book/i }).first();
    await bookButton.click();

    await page.getByPlaceholder(/address/i).first().fill("Mumbai 400069");
    await page.getByPlaceholder(/city/i).fill("Mumbai");
    await page.getByPlaceholder(/pincode/i).fill("400069");
    await page.getByRole("button", { name: /check availability/i }).click();

    await expect(page.getByText(/select date/i)).toBeVisible({ timeout: 60_000 });

    const dateButton = page.locator("button").filter({ hasText: /Nov|Mon|Tue|Wed|Thu|Fri|Sat|Sun/ }).first();
    await dateButton.click();

    const slotButton = page.locator("button").filter({ hasText: /AM|PM|:/ }).first();
    await expect(slotButton).toBeVisible({ timeout: 60_000 });
    await slotButton.click();

    await page.getByRole("button", { name: /confirm slot|lock/i }).click();
    await expect(page.getByText(/book/i)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /^book$/i }).click();
    await expect(page.getByText(/booking/i)).toBeVisible({ timeout: 120_000 });
  });
});