import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

test.describe("Notification service form page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test("HTML preview shows device toolbar", async ({ page }) => {
    await page.goto("/notifications/services/new");
    await page.locator("select").first().selectOption("email");
    await page.getByRole("button", { name: "HTML" }).click();
    await page.locator("textarea").filter({ hasText: "" }).last().fill("<p>Hello preview</p>");
    await page.getByRole("button", { name: "Preview HTML" }).click();
    await expect(page.getByRole("button", { name: "Desktop" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tablet" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mobile" })).toBeVisible();
  });
});
