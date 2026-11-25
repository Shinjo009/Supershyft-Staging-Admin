import { test, expect, PUBLIC_CHIPS, CUSTOM_CHIPS } from "../fixtures/diagnosticFilterChipsList";

test.describe("Diagnostic filter chips list UI/UX", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/diagnostics/filter-chips");
    await expect(page.getByRole("columnheader", { name: "Display name" })).toBeVisible();
  });

  test("shows columns as # → Display name → Chip key → Scope → Status without Order label", async ({
    page,
  }) => {
    const headers = page.locator("thead th");
    const labels = (await headers.allTextContents()).map((text) => text.trim()).filter(Boolean);

    expect(labels).not.toContain("Order");
    const hashIdx = labels.indexOf("#");
    const displayIdx = labels.indexOf("Display name");
    const keyIdx = labels.indexOf("Chip key");
    const scopeIdx = labels.indexOf("Scope");
    const statusIdx = labels.indexOf("Status");
    const actionsIdx = labels.indexOf("Actions");

    expect(hashIdx).toBeGreaterThanOrEqual(0);
    expect(displayIdx).toBeGreaterThan(hashIdx);
    expect(keyIdx).toBeGreaterThan(displayIdx);
    expect(scopeIdx).toBeGreaterThan(keyIdx);
    expect(statusIdx).toBeGreaterThan(scopeIdx);
    expect(actionsIdx).toBeGreaterThan(statusIdx);
  });

  test("places compact search, separate scope pills, and Add far right of Custom packages", async ({
    page,
  }) => {
    const search = page.getByTestId("diag-filter-chips-search");
    const publicPill = page.getByTestId("diag-filter-chips-scope-public");
    const customPill = page.getByTestId("diag-filter-chips-scope-custom");
    const addButton = page.getByTestId("diag-filter-chips-add");

    await expect(search).toBeVisible();
    await expect(publicPill).toBeVisible();
    await expect(customPill).toBeVisible();
    await expect(addButton).toBeVisible();

    const searchBox = await search.boundingBox();
    const publicBox = await publicPill.boundingBox();
    const customBox = await customPill.boundingBox();
    const addBox = await addButton.boundingBox();
    expect(searchBox).toBeTruthy();
    expect(publicBox).toBeTruthy();
    expect(customBox).toBeTruthy();
    expect(addBox).toBeTruthy();

    // Search stays compact (design ~25–30% width), not full-bleed.
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    expect(searchBox!.width).toBeLessThan((viewport!.width) * 0.4);

    // Separate pills: Public left of Custom with a small gap.
    expect(publicBox!.x).toBeLessThan(customBox!.x);
    expect(customBox!.x - (publicBox!.x + publicBox!.width)).toBeGreaterThan(4);
    expect(customBox!.x - (publicBox!.x + publicBox!.width)).toBeLessThan(24);

    // Large gap between Custom packages and Add Filter Chip (Add pinned far right).
    expect(addBox!.x).toBeGreaterThan(customBox!.x + customBox!.width + 80);
    expect(addBox!.x + addBox!.width).toBeGreaterThan(viewport!.width * 0.7);

    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: /Tasks/i })).toBeVisible();
    await expect(header.getByRole("button", { name: /Add filter chip/i })).toHaveCount(0);
    await expect(header.getByTestId("diag-filter-chips-add")).toHaveCount(0);

    await addButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add filter chip" })).toBeVisible();
  });

  test("Public / Custom pills switch list scope", async ({ page }) => {
    await expect(page.getByText(PUBLIC_CHIPS[0].display_name)).toBeVisible();
    await expect(page.getByText(CUSTOM_CHIPS[0].display_name)).toHaveCount(0);

    const customRequest = page.waitForRequest(
      (req) =>
        req.method() === "GET" &&
        req.url().includes("/diagnostic-packages/filters-chips") &&
        req.url().includes("for=custom_package")
    );
    await page.getByTestId("diag-filter-chips-scope-custom").click();
    await customRequest;

    await expect(page.getByText(CUSTOM_CHIPS[0].display_name)).toBeVisible();
    await expect(page.getByText(PUBLIC_CHIPS[0].display_name)).toHaveCount(0);

    const publicRequest = page.waitForRequest(
      (req) =>
        req.method() === "GET" &&
        req.url().includes("/diagnostic-packages/filters-chips") &&
        req.url().includes("for=public_package")
    );
    await page.getByTestId("diag-filter-chips-scope-public").click();
    await publicRequest;

    await expect(page.getByText(PUBLIC_CHIPS[0].display_name)).toBeVisible();
  });

  test("shows icon-only Edit Delete without text or 3-dot menu", async ({ page }) => {
    const firstId = PUBLIC_CHIPS[0].filter_chip_id;
    const actions = page.getByTestId(`diag-filter-chips-actions-${firstId}`);
    await expect(actions).toBeVisible();

    const edit = actions.getByTestId("diag-filter-chips-action-edit");
    const del = actions.getByTestId("diag-filter-chips-action-delete");
    await expect(edit).toBeVisible();
    await expect(del).toBeVisible();
    await expect(edit).toHaveAttribute("aria-label", "Edit");
    await expect(del).toHaveAttribute("aria-label", "Delete");
    await expect(edit).not.toContainText("Edit");
    await expect(del).not.toContainText("Delete");

    await expect(page.getByRole("button", { name: "Actions" })).toHaveCount(0);
    await expect(page.locator('button[title="Actions"]')).toHaveCount(0);
  });

  test("Edit opens edit modal", async ({ page }) => {
    const firstId = PUBLIC_CHIPS[0].filter_chip_id;
    await page
      .getByTestId(`diag-filter-chips-actions-${firstId}`)
      .getByTestId("diag-filter-chips-action-edit")
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit filter chip" })).toBeVisible();
    await expect(dialog.locator('input[type="text"]').first()).toHaveValue(PUBLIC_CHIPS[0].display_name);
  });

  test("Delete opens confirmation modal", async ({ page }) => {
    const firstId = PUBLIC_CHIPS[0].filter_chip_id;
    await page
      .getByTestId(`diag-filter-chips-actions-${firstId}`)
      .getByTestId("diag-filter-chips-action-delete")
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Delete filter chip" })).toBeVisible();
    await expect(dialog.getByText(/cannot be undone/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
