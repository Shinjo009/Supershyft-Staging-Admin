import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

test.describe("Notifications area (staging)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/notifications/logs");
    await expect(page).toHaveURL(/\/notifications\/logs/);
  });

  test("shows Logs, Services, Notifications tabs (no Events)", async ({ page }) => {
    const tabBar = page.locator("div.flex.gap-1.mb-5.border-b.border-zinc-200");
    await expect(tabBar.getByRole("button", { name: "Logs", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Services", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Events", exact: true })).toHaveCount(0);
  });

  test("Logs tab has table filters", async ({ page }) => {
    await expect(page.getByText("Status", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Dispatched", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: "All" }).first().click();
    await expect(page.getByRole("columnheader", { name: /ID/i })).toBeVisible();
  });

  test("Services tab form hides webhook and require fields", async ({ page }) => {
    await page.getByRole("button", { name: "Services" }).click();
    await expect(page).toHaveURL(/\/notifications\/services/);

    const addBtn = page.getByRole("button", { name: /add service/i });
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await expect(page.getByText("Display Name")).toBeVisible();
      await expect(page.getByText("Template name")).toBeVisible();
      await expect(page.getByText(/webhook path/i)).toHaveCount(0);
      await expect(page.getByText(/require_blood/i)).toHaveCount(0);
      await expect(page.getByText(/blood report url/i)).toHaveCount(0);
      await page.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("Notifications bindings tab loads list with search", async ({ page }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page).toHaveURL(/\/notifications\/notifications$/);
    await expect(page.getByPlaceholder(/search events, recipients, services/i)).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Event/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Recipient/i })).toBeVisible();
  });
});
