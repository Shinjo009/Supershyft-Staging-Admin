import { test, expect, type Page } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

async function openFirstServiceDetail(page: Page): Promise<boolean> {
  await page.goto("/notifications/services");
  await expect(page).toHaveURL(/\/notifications\/services/);

  const empty = page.getByText(/No notification services configured yet/i);
  if (await empty.isVisible().catch(() => false)) {
    return false;
  }

  const viewBtn = page.locator('button[title="View"], button[aria-label="View"]').first();
  if (await viewBtn.isVisible().catch(() => false)) {
    await viewBtn.click();
  } else {
    const firstNameCell = page.locator("table tbody tr").first().locator("td").first();
    await expect(firstNameCell).toBeVisible({ timeout: 15000 });
    await firstNameCell.click();
  }

  await expect(page).toHaveURL(/\/notifications\/services\/\d+/);
  return true;
}

test.describe("Notification service detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test("detail page shows metadata strip fields", async ({ page }) => {
    const opened = await openFirstServiceDetail(page);
    test.skip(!opened, "No services available on staging to open detail.");

    await expect(page.getByText("Display Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Channel", { exact: true })).toBeVisible();
    await expect(page.getByText("Status", { exact: true })).toBeVisible();
    await expect(page.getByText("Template", { exact: true })).toBeVisible();
    await expect(page.getByText("Created", { exact: true })).toBeVisible();
  });

  test("WhatsApp detail shows preview, slot variables, and not JSON block", async ({ page }) => {
    await page.goto("/notifications/services");
    // Filter chip label is title-cased channel value: "Whatsapp"
    await page.getByRole("button", { name: "Whatsapp", exact: true }).click();

    const empty = page.getByText(/No services match|No notification services/i);
    if (await empty.isVisible().catch(() => false)) {
      test.skip(true, "No WhatsApp services on staging.");
      return;
    }

    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await firstRow.locator("td").first().click();
    await expect(page).toHaveURL(/\/notifications\/services\/\d+/);

    await expect(page.getByRole("heading", { name: "Message Preview" })).toBeVisible();
    await expect(
      page.getByText("Template variables (use {{field}} or literal text)", { exact: true })
    ).toBeVisible();
    await expect(page.getByText(/Template [Vv]ariables \(JSON\)/)).toHaveCount(0);
  });

  test("Email detail shows Email Preview and Plain text panels", async ({ page }) => {
    await page.goto("/notifications/services");
    await page.getByRole("button", { name: /^Email$/i }).click();

    const empty = page.getByText(/No services match|No notification services/i);
    if (await empty.isVisible().catch(() => false)) {
      test.skip(true, "No email services on staging.");
      return;
    }

    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await firstRow.locator("td").first().click();
    await expect(page).toHaveURL(/\/notifications\/services\/\d+/);

    await expect(page.getByRole("heading", { name: "Email Preview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Plain text" })).toBeVisible();
    await expect(page.getByText("Subject:", { exact: false })).toBeVisible();
  });
});
