import { test, expect, PACKAGE_ID } from "../fixtures/diagnosticPackageEditForm";

test.describe("Diagnostic package Edit form UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/diagnostics/packages/${PACKAGE_ID}/edit`);
    await expect(page.getByTestId("diag-package-form-fields")).toBeVisible();
  });

  test("renders collapsible sections with icons and subtitles", async ({ page }) => {
    await expect(page.getByTestId("diag-package-form-section-basic")).toContainText("Basic Information");
    await expect(page.getByTestId("diag-package-form-section-basic")).toContainText(
      "Package name, lab and provider details"
    );
    await expect(page.getByTestId("diag-package-form-section-basic-icon")).toBeVisible();

    await expect(page.getByTestId("diag-package-form-section-lab")).toContainText("Lab");
    await expect(page.getByTestId("diag-package-form-section-lab")).toContainText(
      "Provider and lab package code"
    );
    await expect(page.getByTestId("diag-package-form-section-lab-icon")).toBeVisible();

    await expect(page.getByTestId("diag-package-form-section-pricing")).toContainText("Pricing");
    await expect(page.getByTestId("diag-package-form-section-pricing")).toContainText(
      "Set package pricing and limits"
    );
    await expect(page.getByTestId("diag-package-form-section-pricing-icon")).toBeVisible();

    await expect(page.getByTestId("diag-package-form-section-consultations")).toContainText(
      "Consultations"
    );
    await expect(page.getByTestId("diag-package-form-section-consultations-icon")).toBeVisible();

    await expect(page.getByTestId("diag-package-form-section-content")).toContainText("Content");
    await expect(page.getByTestId("diag-package-form-section-content")).toContainText(
      "Package description and details"
    );
    await expect(page.getByTestId("diag-package-form-section-content-icon")).toBeVisible();
  });

  test("collapses and expands a form section", async ({ page }) => {
    const basic = page.getByTestId("diag-package-form-section-basic");
    const packageName = basic.getByRole("textbox").first();
    await expect(packageName).toBeVisible();
    await page.getByTestId("diag-package-form-section-basic-toggle").click();
    await expect(basic.getByRole("textbox")).toHaveCount(0);
    await page.getByTestId("diag-package-form-section-basic-toggle").click();
    await expect(basic.getByRole("textbox").first()).toBeVisible();
  });

  test("shows Save changes and Cancel actions", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Basic Information hides Package image URL and shows B2C/B2B Package for labels", async ({
    page,
  }) => {
    const basic = page.getByTestId("diag-package-form-section-basic");
    await expect(basic.getByText("Package image URL")).toHaveCount(0);
    await expect(basic.locator("label.block").filter({ hasText: "Upload package image" })).toBeVisible();

    const packageFor = basic.locator("select").filter({ has: page.locator('option[value="public"]') });
    await expect(packageFor).toBeVisible();
    await expect(packageFor.locator('option[value="public"]')).toHaveText("B2C");
    await expect(packageFor.locator('option[value="camp"]')).toHaveText("B2B");
    await expect(packageFor.locator('option[value="both"]')).toHaveText("both");
  });
});
