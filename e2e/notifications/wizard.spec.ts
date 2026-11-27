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
  });

  test("step 3 offers reuse existing service", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await page.getByRole("button", { name: /OTP/i }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reuse existing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create new" })).toBeVisible();
  });

  test("email path shows side-by-side Email Preview on step 3", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await page.getByRole("button", { name: /OTP/i }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create new" }).click();
    await page.getByRole("button", { name: "Email" }).click();

    await expect(page.getByRole("heading", { name: "Email Preview" })).toBeVisible();
    await expect(page.getByText("Subject:", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Plain text" })).toBeVisible();
    await expect(page.getByRole("button", { name: "HTML" })).toBeVisible();
    await expect(page.getByText("Variables", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Expand email preview/i })).toBeVisible();
  });

  test("whatsapp path shows Message Preview column on step 3", async ({ page }) => {
    await page.goto("/notifications/notifications/new");
    await page.getByRole("button", { name: /OTP/i }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create new" }).click();
    await page.getByRole("button", { name: "WhatsApp" }).click();

    await expect(page.getByText("Display name", { exact: true })).toBeVisible();
    await expect(page.getByText("Template name", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Message Preview" })).toBeVisible();
    await expect(page.getByText("Variables", { exact: true }).first()).toBeVisible();
  });
});
