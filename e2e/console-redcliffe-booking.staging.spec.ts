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
    await page.getByLabel("Phone number").fill(phone);
    await page.getByRole("button", { name: "Send OTP" }).click();

    await page.getByLabel("Verification code").fill(otp);
    await page.getByRole("button", { name: "Verify & Sign in" }).click();

    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });

    await page.goto(`/engagements/${engagementId}/console`);
    await expect(page.getByText(/Home collection · Redcliffe/i)).toBeVisible({ timeout: 30_000 });

    const participantRow = page.getByRole("row").filter({ hasText: "Pratheek Test" });
    await participantRow.getByLabel("Actions").click();
    await page.getByRole("button", { name: "Book", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Home Collection Booking" })).toBeVisible();

    await page.getByPlaceholder("Enter full address").fill("Mumbai 400069");
    await page.getByPlaceholder("City").fill("Mumbai");
    await page.getByPlaceholder("Pincode").fill("400069");
    await page.getByRole("button", { name: "Check Availability" }).click();

    await expect(page.getByText("Select Date")).toBeVisible({ timeout: 60_000 });

    const dateButton = page.locator("button").filter({ hasText: /\d/ }).first();
    await dateButton.click();

    const slotButton = page.locator("button").filter({ hasText: /AM|PM|:/ }).first();
    await expect(slotButton).toBeVisible({ timeout: 60_000 });
    await slotButton.click();

    await page.getByRole("button", { name: "Lock Slot" }).click();
    await expect(page.getByText("Booking Summary")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Confirm Booking" }).click();
    await expect(page.getByText("Booking Created")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText("Booking ID")).toBeVisible();
  });
});