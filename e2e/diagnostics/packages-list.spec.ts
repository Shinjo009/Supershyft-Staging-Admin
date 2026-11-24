import { test, expect, LIST_ROWS } from "../fixtures/diagnosticPackagesList";

test.describe("Diagnostic packages list UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagnostics/packages");
    await expect(page.getByRole("columnheader", { name: "Package name" })).toBeVisible();
  });

  test("shows Type column and hides Collection", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Type" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Collection" })).toHaveCount(0);

    await expect(page.getByTestId(`diag-packages-type-${LIST_ROWS[0].diagnostic_package_id}`)).toHaveText(
      "B2C"
    );
    await expect(page.getByTestId(`diag-packages-type-${LIST_ROWS[1].diagnostic_package_id}`)).toHaveText(
      "B2B"
    );
    await expect(page.getByTestId(`diag-packages-type-${LIST_ROWS[2].diagnostic_package_id}`)).toHaveText(
      "B2B / B2C"
    );
  });

  test("shows icon-only View Edit Delete without text or 3-dot menu", async ({ page }) => {
    const firstGroupId = LIST_ROWS[0].package_group_id;
    const actions = page.getByTestId(`diag-packages-actions-${firstGroupId}`);
    await expect(actions).toBeVisible();

    const view = actions.getByTestId("diag-packages-action-view");
    const edit = actions.getByTestId("diag-packages-action-edit");
    const del = actions.getByTestId("diag-packages-action-delete");
    await expect(view).toBeVisible();
    await expect(edit).toBeVisible();
    await expect(del).toBeVisible();
    await expect(view).toHaveAttribute("aria-label", "View");
    await expect(edit).toHaveAttribute("aria-label", "Edit");
    await expect(del).toHaveAttribute("aria-label", "Delete");
    await expect(view).not.toContainText("View");
    await expect(edit).not.toContainText("Edit");
    await expect(del).not.toContainText("Delete");

    await expect(page.getByRole("button", { name: "Actions" })).toHaveCount(0);
    await expect(page.locator('button[title="Actions"]')).toHaveCount(0);
  });

  test("View navigates to package detail", async ({ page }) => {
    const firstGroupId = LIST_ROWS[0].package_group_id;
    await page
      .getByTestId(`diag-packages-actions-${firstGroupId}`)
      .getByTestId("diag-packages-action-view")
      .click();
    await expect(page).toHaveURL(new RegExp(`/diagnostics/packages/${LIST_ROWS[0].diagnostic_package_id}`));
  });

  test("Edit navigates to package edit", async ({ page }) => {
    const firstGroupId = LIST_ROWS[0].package_group_id;
    await page
      .getByTestId(`diag-packages-actions-${firstGroupId}`)
      .getByTestId("diag-packages-action-edit")
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/diagnostics/packages/${LIST_ROWS[0].diagnostic_package_id}/edit`)
    );
  });

  test("Delete opens confirmation modal", async ({ page }) => {
    const firstGroupId = LIST_ROWS[0].package_group_id;
    await page
      .getByTestId(`diag-packages-actions-${firstGroupId}`)
      .getByTestId("diag-packages-action-delete")
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Delete lab package" })).toBeVisible();
    await expect(dialog.getByText(/Supershyft Core\+/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
