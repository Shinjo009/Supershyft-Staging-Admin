import { test, expect, PACKAGE_ID } from "../fixtures/diagnosticPackageOverview";

test.describe("Diagnostic package Overview UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/diagnostics/packages/${PACKAGE_ID}`);
    await expect(page.getByTestId("diag-overview")).toBeVisible();
  });

  test("renders overview structure and key fields", async ({ page, counters }) => {
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await expect(page.getByTestId("diag-overview-header")).toContainText("Supershyft Core+");
    await expect(page.getByTestId("diag-overview-header")).toContainText("71 tests");
    await expect(page.getByTestId("diag-overview-header")).toContainText("Lab code: 13150");
    await expect(page.getByTestId("diag-overview-status-badge")).toHaveText("Active");
    await expect(page.getByTestId("diag-overview-header-icon")).toBeVisible();

    await expect(page.getByTestId("diag-overview-package")).toContainText("Package Details");
    await expect(page.getByTestId("diag-overview-package-icon")).toBeVisible();
    await expect(page.getByTestId("diag-overview-package")).toContainText("home_collection");
    await expect(page.getByTestId("diag-overview-package")).toContainText("public");

    await expect(page.getByTestId("diag-overview-price")).toContainText("Price Details");
    await expect(page.getByTestId("diag-overview-price-icon")).toBeVisible();
    await expect(page.getByTestId("diag-overview-price")).toContainText("₹1999");
    await expect(page.getByTestId("diag-overview-price")).toContainText("₹2499");
    await expect(page.getByTestId("diag-overview-price")).toContainText("Most popular");
    await expect(page.getByTestId("diag-overview-price")).toContainText("nutritionist");

    await expect(page.getByTestId("diag-overview-for-customers")).toContainText("For customers");
    await expect(page.getByTestId("diag-overview-for-customers-icon")).toBeVisible();
    await expect(page.getByTestId("diag-overview-health-areas")).toContainText("Bio Age");
    await expect(page.getByTestId("diag-overview-reasons")).toContainText("Full-body coverage");
    await expect(page.getByTestId("diag-overview-reasons-icon")).toBeVisible();

    await expect(page.getByTestId("diag-overview-categorization")).toContainText("Categorization");
    await expect(page.getByTestId("diag-overview-categorization-icon")).toBeVisible();
    await expect(page.getByTestId("diag-overview-tag-11")).toContainText("Bio Age");
    await expect(page.getByTestId("diag-overview-filter-chip-101")).toContainText("Popular");

    await expect(page.getByTestId("diag-overview-add-reason")).toBeVisible();
    await expect(page.getByTestId("diag-overview-add-tag")).toBeVisible();
    await expect(page.getByTestId("diag-overview-add-filter-chip")).toBeVisible();
    expect(counters.getDetailCalls()).toBeGreaterThan(0);
  });

  test("collapses and expands For customers, Reasons, and Categorization", async ({ page }) => {
    await expect(page.getByTestId("diag-overview-health-areas")).toBeVisible();
    await page.getByTestId("diag-overview-for-customers-toggle").click();
    await expect(page.getByTestId("diag-overview-health-areas")).toHaveCount(0);
    await page.getByTestId("diag-overview-for-customers-toggle").click();
    await expect(page.getByTestId("diag-overview-health-areas")).toBeVisible();

    await expect(page.getByTestId("diag-overview-reasons")).toBeVisible();
    await page.getByTestId("diag-overview-reasons-toggle").click();
    await expect(page.getByTestId("diag-overview-reasons")).toHaveCount(0);
    await page.getByTestId("diag-overview-reasons-toggle").click();
    await expect(page.getByTestId("diag-overview-reasons")).toBeVisible();

    await expect(page.getByTestId("diag-overview-tags")).toBeVisible();
    await page.getByTestId("diag-overview-categorization-toggle").click();
    await expect(page.getByTestId("diag-overview-tags")).toHaveCount(0);
    await page.getByTestId("diag-overview-categorization-toggle").click();
    await expect(page.getByTestId("diag-overview-tags")).toBeVisible();
  });

  test("adds a reason from For customers", async ({ page, counters }) => {
    await page.getByTestId("diag-overview-reasons-view-all").click();
    await page.getByTestId("diag-overview-reason-input").fill("Trusted lab network nationwide");
    await page.getByTestId("diag-overview-reason-submit").click();

    await expect(page.getByTestId("diag-overview-reasons")).toContainText(
      "Trusted lab network nationwide"
    );
    expect(counters.getAddReasonCalls()).toBe(1);
  });

  test("adds a tag from Categorization", async ({ page, counters }) => {
    await page.getByTestId("diag-overview-tag-input").fill("Iron");
    await page.getByTestId("diag-overview-tag-submit").click();

    await expect(page.getByTestId("diag-overview-tags")).toContainText("Iron");
    expect(counters.getAddTagCalls()).toBe(1);
  });

  test("adds a filter chip from Categorization", async ({ page, counters }) => {
    await page.getByTestId("diag-overview-filter-chip-select").selectOption("102");
    await expect(page.getByTestId("diag-overview-filter-chip-submit")).toBeEnabled();
    await page.getByTestId("diag-overview-filter-chip-submit").click();

    await expect(page.getByTestId("diag-overview-filter-chip-102")).toContainText("New");
    expect(counters.getAddFilterChipCalls()).toBe(1);
  });

  test("removes an existing tag and filter chip", async ({ page, counters }) => {
    await page.getByTestId("diag-overview-remove-tag-14").click();
    await expect(page.getByTestId("diag-overview-tag-14")).toHaveCount(0);
    expect(counters.getDeleteTagCalls()).toBe(1);

    await page.getByTestId("diag-overview-remove-filter-chip-101").click();
    await expect(page.getByTestId("diag-overview-filter-chip-101")).toHaveCount(0);
    expect(counters.getDeleteFilterChipCalls()).toBe(1);
  });

  test("keeps Add actions usable and empty-state safe", async ({ page }) => {
    await expect(page.getByTestId("diag-overview-reason-submit")).toBeEnabled();
    await expect(page.getByTestId("diag-overview-tag-submit")).toBeEnabled();
    await expect(page.getByTestId("diag-overview-filter-chip-submit")).toBeDisabled();

    await page.getByTestId("diag-overview-about-toggle").click();
    await expect(page.getByTestId("diag-overview-about-toggle")).toHaveText("Show less");

    await page.getByTestId("diag-overview-reasons-view-all").click();
    await expect(page.getByTestId("diag-overview-reasons")).toContainText(
      "Clear digital report experience"
    );
  });
});
