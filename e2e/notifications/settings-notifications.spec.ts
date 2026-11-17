import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

test.describe("Settings notifications", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL(/\/settings\/notifications/);
  });

  test("shows notification resolution toggle only", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Notification resolution" })).toBeVisible();
    await expect(
      page.getByText("Use only engagement-specific notifications", { exact: false })
    ).toBeVisible();
    await expect(page.getByText("Support alerts", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Engagement notification defaults", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Manage default bindings in Notifications/i })).toBeVisible();
  });
});