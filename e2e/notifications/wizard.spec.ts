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

  test("step 2 lists onboarding assistants recipient", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await page.getByRole("button", { name: /OTP/i }).first().click();
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await expect(page.getByRole("button", { name: /All onboarding assistants/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Participant$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /From API payload/i })).toBeVisible();
  });

  test("step 3 offers reuse existing service", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await page.getByRole("button", { name: /OTP/i }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reuse existing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create new" })).toBeVisible();
  });

  test("email path shows preview control after event selected", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await page.getByRole("button", { name: /OTP/i }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create new" }).click();
    await page.getByRole("button", { name: "Email" }).click();
    await expect(page.getByText("Preview")).toBeVisible();
  });
});
