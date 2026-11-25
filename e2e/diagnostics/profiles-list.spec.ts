import { test, expect, PROFILE_LIST_ROWS } from "../fixtures/diagnosticProfilesList";

test.describe("Diagnostic profiles list UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagnostics/test-groups");
    await expect(page.getByRole("columnheader", { name: "Group name" })).toBeVisible();
  });

  test("catalog tab is labeled Profiles", async ({ page }) => {
    const profilesTab = page.getByRole("link", { name: "Profiles" });
    await expect(profilesTab).toBeVisible();
    await expect(page.getByRole("link", { name: "Test Groups" })).toHaveCount(0);
  });

  test("shows icon-only View Edit Delete without text or 3-dot menu", async ({ page }) => {
    const firstId = PROFILE_LIST_ROWS[0].group_id;
    const actions = page.getByTestId(`diag-profiles-actions-${firstId}`);
    await expect(actions).toBeVisible();

    const view = actions.getByTestId("diag-profiles-action-view");
    const edit = actions.getByTestId("diag-profiles-action-edit");
    const del = actions.getByTestId("diag-profiles-action-delete");
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

  test("View navigates to profile detail", async ({ page }) => {
    const firstId = PROFILE_LIST_ROWS[0].group_id;
    await page
      .getByTestId(`diag-profiles-actions-${firstId}`)
      .getByTestId("diag-profiles-action-view")
      .click();
    await expect(page).toHaveURL(new RegExp(`/diagnostics/test-groups/${firstId}`));
  });

  test("Delete opens confirmation modal", async ({ page }) => {
    const firstId = PROFILE_LIST_ROWS[0].group_id;
    await page
      .getByTestId(`diag-profiles-actions-${firstId}`)
      .getByTestId("diag-profiles-action-delete")
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /Delete test group/i })).toBeVisible();
    await expect(dialog.getByText(PROFILE_LIST_ROWS[0].group_name)).toBeVisible();
  });
});
