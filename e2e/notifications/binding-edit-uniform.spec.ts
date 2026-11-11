import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

const selectableCardBorder = /border-zinc-900/;

test.describe("Notification binding edit (uniform UX)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test("support ticket edit step 2 pre-selects ops department", async ({ page }) => {
    await page.goto("/notifications/notifications/events/support.ticket.created");
    await page.getByRole("button", { name: "Actions" }).first().click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page).toHaveURL(/\/notifications\/notifications\/\d+\/edit\?step=2/);
    const ops = page.getByRole("button", { name: /Ops department/i });
    await expect(ops).toHaveClass(selectableCardBorder);
  });

  test("onboarding.completed edit matches support (recipient + reuse service)", async ({ page }) => {
    await page.goto("/notifications/notifications/27/edit?step=2");
    const assistants = page.getByRole("button", { name: /All onboarding assistants/i });
    await expect(assistants).toHaveClass(selectableCardBorder);
    await page.goto("/notifications/notifications/events/onboarding.completed");
    await page.getByRole("button", { name: "Actions" }).first().click();
    await page.getByRole("button", { name: "Edit content" }).click();
    await expect(page).toHaveURL(/\/notifications\/notifications\/\d+\/edit\?step=3/);
    await expect(page.getByRole("button", { name: "Reuse existing" })).toHaveClass(selectableCardBorder);
    const linkedService = page
      .locator("button")
      .filter({ hasText: /booking-alert-whatsapp|welcome-email|welcome-whatsapp/ })
      .first();
    await expect(linkedService).toHaveClass(selectableCardBorder);
  });
});
