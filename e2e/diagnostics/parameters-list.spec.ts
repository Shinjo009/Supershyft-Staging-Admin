import { test, expect, PARAMETER_ROWS } from "../fixtures/diagnosticParametersList";

test.describe("Diagnostic parameters list UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagnostics/tests");
    await expect(page.getByRole("columnheader", { name: "Parameter name" })).toBeVisible();
  });

  test("catalog tab is labeled Parameters (not Tests)", async ({ page }) => {
    const tabBar = page.locator("div.flex.gap-1.mb-5.border-b.border-zinc-200");
    await expect(tabBar.getByRole("link", { name: "Parameters", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("link", { name: "Tests", exact: true })).toHaveCount(0);
    await expect(tabBar.getByRole("link", { name: "Packages", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("link", { name: "Profiles", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("link", { name: "Filter chips", exact: true })).toBeVisible();
  });

  test("shows columns as # → Parameter name → Unit → Available → Actions without Order label", async ({
    page,
  }) => {
    const headers = page.locator("thead th");
    const labels = (await headers.allTextContents()).map((text) => text.trim()).filter(Boolean);

    expect(labels).not.toContain("Order");
    expect(labels).not.toContain("Test name");
    expect(labels).not.toContain("Price");

    const hashIdx = labels.indexOf("#");
    const nameIdx = labels.indexOf("Parameter name");
    const unitIdx = labels.indexOf("Unit");
    const availableIdx = labels.indexOf("Available");
    const actionsIdx = labels.indexOf("Actions");

    expect(hashIdx).toBeGreaterThanOrEqual(0);
    expect(nameIdx).toBeGreaterThan(hashIdx);
    expect(unitIdx).toBeGreaterThan(nameIdx);
    expect(availableIdx).toBeGreaterThan(unitIdx);
    expect(actionsIdx).toBeGreaterThan(availableIdx);
  });

  test("parameter name cell shows parameter key underneath", async ({ page }) => {
    const first = PARAMETER_ROWS[0];
    await expect(page.getByText(first.test_name, { exact: true })).toBeVisible();
    await expect(page.getByText(first.parameter_key, { exact: true })).toBeVisible();
    await expect(page.getByText(first.unit, { exact: true }).first()).toBeVisible();
  });

  test("shows icon-only Edit Delete without text or 3-dot menu", async ({ page }) => {
    const firstId = PARAMETER_ROWS[0].test_id;
    const actions = page.getByTestId(`diag-parameters-actions-${firstId}`);
    await expect(actions).toBeVisible();

    const edit = actions.getByTestId("diag-parameters-action-edit");
    const del = actions.getByTestId("diag-parameters-action-delete");
    await expect(edit).toBeVisible();
    await expect(del).toBeVisible();
    await expect(edit).toHaveAttribute("aria-label", "Edit");
    await expect(del).toHaveAttribute("aria-label", "Delete");
    await expect(edit).not.toContainText("Edit");
    await expect(del).not.toContainText("Delete");

    await expect(page.getByRole("button", { name: "Actions" })).toHaveCount(0);
    await expect(page.locator('button[title="Actions"]')).toHaveCount(0);
  });

  test("drag handles are present for reorder", async ({ page }) => {
    const rowCount = await page.locator("tbody tr").count();
    expect(rowCount).toBe(PARAMETER_ROWS.length);
    // DataTable renders a grip cell with cursor-grab when onReorder is enabled.
    await expect(page.locator("tbody .cursor-grab")).toHaveCount(PARAMETER_ROWS.length);
  });

  test("search and Add Parameter sit in the list toolbar", async ({ page }) => {
    const search = page.getByTestId("diag-parameters-search");
    const addButton = page.getByTestId("diag-parameters-add");
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("placeholder", /Search parameters/i);
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveText(/Add Parameter/i);

    await addButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add Parameter" })).toBeVisible();
  });

  test("edit modal uses Parameter labels and organized fields", async ({ page }) => {
    const firstId = PARAMETER_ROWS[0].test_id;
    await page.getByTestId(`diag-parameters-actions-${firstId}`).getByTestId("diag-parameters-action-edit").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit Parameter" })).toBeVisible();
    await expect(dialog.getByText("Parameter name *", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Parameter key", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Healthians parameter key", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Orange Health parameter key", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Unit", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Order", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Available", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Most popular", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Reference ranges", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Meaning" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Causes" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Effects" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "What to do when" })).toBeVisible();

    await expect(dialog.getByText("Test name", { exact: true })).toHaveCount(0);
    await expect(dialog.getByTestId("diag-parameters-field-name")).toHaveValue(
      PARAMETER_ROWS[0].test_name
    );
    await expect(dialog.getByTestId("diag-parameters-field-key")).toHaveValue(
      PARAMETER_ROWS[0].parameter_key
    );
    await expect(dialog.getByRole("button", { name: "Save Changes" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
