import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

test.describe("Notification binding wizard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test("wizard new page shows step 1 event list", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await expect(page.getByPlaceholder("Search events…")).toBeVisible();
  });

  test("email path shows preview control after event selected", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await page.getByRole("button", { name: /OTP/i }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Email" }).click();
    await expect(page.getByText("Preview")).toBeVisible();
  });
});
