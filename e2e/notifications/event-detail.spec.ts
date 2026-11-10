import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

test.describe("Notification event detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test("bindings list event link opens detail page", async ({ page }) => {
    await page.goto("/notifications/notifications");
    const firstEventCell = page.locator("table tbody tr").first().locator("td").first();
    if ((await firstEventCell.count()) === 0) {
      test.skip();
      return;
    }
    await firstEventCell.click();
    await expect(page).toHaveURL(/\/notifications\/notifications\/events\//);
    await expect(page.getByText(/Who gets which message/i)).toBeVisible();
  });
});
