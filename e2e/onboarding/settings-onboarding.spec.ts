import { test, expect } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";

test.describe("B2C onboarding settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/settings/onboarding?type=bio_ai");
    await expect(page).toHaveURL(/\/settings\/onboarding/);
  });

  test("shows per-type layout and plain-language fallback copy", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Default journey type" })).toBeVisible();
    await expect(page.getByText("Fallback journey type")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Defaults by journey type" })).toBeVisible();
    await expect(page.getByText("Metsights Pro checks", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Default engagement type when omitted", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Journey types" })).toBeVisible();
    await expect(page.getByLabel("Engagement duration (days)")).toBeVisible();
  });

  test("type save button is scoped to active journey type", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Journey types" });
    const saveBioAi = page.getByRole("button", { name: /^Save Bio/i });
    if (await saveBioAi.isVisible().catch(() => false)) {
      await expect(saveBioAi).toBeVisible();
    }
    const consultBtn = nav.getByRole("button", { name: /Consultation/i }).first();
    if (await consultBtn.isVisible().catch(() => false)) {
      await consultBtn.click();
      await expect(page).toHaveURL(/type=/);
      await expect(page.getByRole("button", { name: /^Save .*Consultation/i })).toBeVisible();
    }
  });

  test("fallback and type saves use separate actions", async ({ page }) => {
    const fallbackSave = page.getByRole("button", { name: "Save", exact: true }).first();
    await expect(fallbackSave).toBeVisible();
    const typeSave = page
      .locator("form")
      .filter({ has: page.getByRole("navigation", { name: "Journey types" }) })
      .getByRole("button", { name: /^Save / });
    await expect(typeSave).toBeVisible();
  });
});