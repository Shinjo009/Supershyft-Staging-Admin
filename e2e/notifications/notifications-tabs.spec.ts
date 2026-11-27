import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

const hasStagingPhone = Boolean(process.env.E2E_ADMIN_PHONE?.trim());

test.describe("Notifications area (staging)", () => {
  test.skip(!hasStagingPhone, "Set E2E_ADMIN_PHONE for live staging smoke.");

  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/notifications/logs");
    await expect(page).toHaveURL(/\/notifications\/logs/);
  });

  test("shows Logs, Services, Event Rules tabs (no Events)", async ({ page }) => {
    const tabBar = page.locator("div.flex.gap-1.mb-5.border-b.border-zinc-200");
    await expect(tabBar.getByRole("button", { name: "Logs", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Services", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Event Rules", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Notifications", exact: true })).toHaveCount(0);
    await expect(tabBar.getByRole("button", { name: "Events", exact: true })).toHaveCount(0);
  });

  test("Logs tab has user search left of status and compact columns", async ({ page }) => {
    const search = page.getByRole("combobox", { name: /search by name, phone, or email/i });
    await expect(search).toBeVisible();

    const allStatus = page.getByRole("button", { name: "All" }).first();
    await expect(allStatus).toBeVisible();

    const searchBox = await search.boundingBox();
    const allBox = await allStatus.boundingBox();
    expect(searchBox).toBeTruthy();
    expect(allBox).toBeTruthy();
    if (searchBox && allBox) {
      expect(searchBox.x).toBeLessThan(allBox.x);
    }

    await expect(page.getByLabel("Date range")).toHaveValue("1h");
    await expect(page.getByLabel("Service", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Channel", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Engagement")).toBeVisible();
    await expect(page.getByLabel(/view all columns/i)).toHaveCount(0);

    await expect(page.getByRole("columnheader", { name: /ID/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Service$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Channel$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Status$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Recipient$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Engagement$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Message$/i })).toBeVisible();

    await expect(page.getByRole("columnheader", { name: /^Queue$/i })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: /^Event$/i })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: /^Dispatched$/i })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: /^Completed$/i })).toHaveCount(0);

    const actionsBtn = page.locator('button[title="Actions"]').first();
    await expect(actionsBtn).toBeVisible({ timeout: 15000 });
    await actionsBtn.click();
    await page.getByRole("button", { name: /view all columns/i }).click();

    await expect(page.getByRole("columnheader", { name: /^Queue$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Event$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Dispatched$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Completed$/i })).toBeVisible();
  });

  test("Services add page uses channel-specific fields", async ({ page }) => {
    await page.getByRole("button", { name: "Services" }).click();
    await expect(page).toHaveURL(/\/notifications\/services/);

    const addBtn = page.getByRole("button", { name: /add service/i });
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await expect(page).toHaveURL(/\/notifications\/services\/new/);
      await expect(page.getByText("Display Name")).toBeVisible();
      await expect(page.getByText(/webhook path/i)).toHaveCount(0);

      await page.locator("select").first().selectOption("whatsapp");
      await expect(page.getByText("Template name")).toBeVisible();
      await expect(page.getByText(/email subject/i)).toHaveCount(0);

      await page.locator("select").first().selectOption("email");
      await expect(page.getByText(/email subject/i)).toBeVisible();
      await expect(page.getByText("Template name")).toHaveCount(0);
      await page.getByRole("button", { name: "HTML" }).click();
      await expect(page.getByText(/email body \(html\)/i)).toBeVisible();
    }
  });

  test("Event Rules bindings tab loads list with search", async ({ page }) => {
    await page.getByRole("button", { name: "Event Rules" }).click();
    await expect(page).toHaveURL(/\/notifications\/notifications$/);
    await expect(page.getByPlaceholder(/search events, recipients, services/i)).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Event/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Recipient/i })).toBeVisible();
  });
});
