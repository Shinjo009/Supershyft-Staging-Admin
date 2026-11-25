import { test, expect, GROUP_ID, PROFILE_DETAIL, PROFILE_TESTS } from "../fixtures/diagnosticProfileDetail";

test.describe("Diagnostic profile detail UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/diagnostics/test-groups/${GROUP_ID}`);
    await expect(page.getByTestId("diag-profile-overview")).toBeVisible();
  });

  test("shows Overview fields without Image or Flags", async ({ page }) => {
    const overview = page.getByTestId("diag-profile-overview");
    await expect(overview.getByText("Provider", { exact: true })).toBeVisible();
    await expect(overview.getByText("Healthians", { exact: true })).toBeVisible();
    await expect(overview.getByText("Price", { exact: true })).toBeVisible();
    await expect(overview.getByText(`₹${PROFILE_DETAIL.price}`, { exact: true })).toBeVisible();
    await expect(overview.getByText("Gender", { exact: true })).toBeVisible();
    await expect(overview.getByText("Healthians test group code", { exact: true })).toBeVisible();
    await expect(overview.getByText(PROFILE_DETAIL.external_test_group_code!, { exact: true })).toBeVisible();
    await expect(overview.getByText("Original price", { exact: true })).toBeVisible();
    await expect(overview.getByText("Package for", { exact: true })).toBeVisible();
    await expect(overview.getByText(PROFILE_DETAIL.package_for!, { exact: true })).toBeVisible();

    await expect(overview.getByText("Image", { exact: true })).toHaveCount(0);
    await expect(overview.getByText("Flags", { exact: true })).toHaveCount(0);
  });

  test("does not show Healthians compare when Healthians provider is selected", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Healthians compare" })).toHaveCount(0);
  });

  test("shows Filter chips and Tests sections", async ({ page }) => {
    await expect(page.getByTestId("diag-profile-filter-chips")).toBeVisible();
    await expect(page.getByTestId("diag-profile-filter-chips").getByText("Progressive tests")).toBeVisible();
    await expect(page.getByTestId("diag-profile-tests")).toBeVisible();
    await expect(page.getByTestId("diag-profile-add-tests")).toBeVisible();
    await expect(page.getByTestId("diag-profile-add-tests")).toHaveText("Add Tests");
  });

  test("tests list shows order, name, parameter key, Yes/No and Delete without drag handles", async ({
    page,
  }) => {
    const tests = page.getByTestId("diag-profile-tests");
    await expect(tests.getByText("#")).toBeVisible();
    await expect(tests.getByText("Test name")).toBeVisible();
    await expect(tests.getByText("Actions")).toBeVisible();
    await expect(tests.getByRole("button", { name: "Reorder" })).toHaveCount(0);

    const first = PROFILE_TESTS[0];
    await expect(tests.getByText(first.test_name, { exact: true })).toBeVisible();
    await expect(page.getByTestId(`diag-profile-test-key-${first.test_id}`)).toHaveText("neutrophils");
    await expect(page.getByTestId(`diag-profile-test-available-${first.test_id}`)).toHaveText("Yes");
    await expect(page.getByTestId(`diag-profile-test-delete-${first.test_id}`)).toBeVisible();

    const second = PROFILE_TESTS[1];
    await expect(page.getByTestId(`diag-profile-test-available-${second.test_id}`)).toHaveText("No");
  });
});
