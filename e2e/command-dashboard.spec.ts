import { test, expect } from "./fixtures/auth";

test.describe("Command dashboard UI/UX", () => {
  test("defaults to overview + this_week and shows 12 card slots", async ({
    page,
    counters,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("command-dashboard")).toBeVisible();
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page).toHaveURL(/period=this_week/);

    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Date period" })).toBeVisible();

    const grid = page.getByTestId("overview-grid");
    await expect(grid).toBeVisible();
    await expect(grid.locator("[data-testid^='card-']")).toHaveCount(12);

    await expect(page.getByTestId("card-server_load")).toContainText("CPU");
    await expect(page.getByTestId("card-server_load")).toContainText("22%");
    await expect(page.getByTestId("card-notification_health")).toContainText("100");
    await expect(page.getByTestId("card-people_registered")).toContainText("42");

    expect(counters.getServerCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getNotifCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getPeopleCalls()).toBeGreaterThanOrEqual(1);
  });

  test("B2B/B2C tabs are inert; invalid tab normalizes to overview", async ({ page }) => {
    await page.goto("/?tab=foo&period=this_week");
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();

    await page.goto("/?tab=b2b&period=this_week");
    await expect(page).toHaveURL(/tab=overview/);

    const b2b = page.getByRole("tab", { name: "B2B" });
    await expect(b2b).toBeDisabled();
    await b2b.click({ force: true });
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });

  test("period chips update URL and refetch period-scoped data; server load does not refetch", async ({
    page,
    counters,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    await expect(page.getByTestId("overview-grid")).toBeVisible();

    const serverBefore = counters.getServerCalls();
    const notifBefore = counters.getNotifCalls();
    const peopleBefore = counters.getPeopleCalls();

    await page.getByRole("button", { name: "This month", exact: true }).click();
    await expect(page).toHaveURL(/period=this_month/);

    await expect.poll(() => counters.getNotifCalls()).toBeGreaterThan(notifBefore);
    await expect.poll(() => counters.getPeopleCalls()).toBeGreaterThan(peopleBefore);
    expect(counters.getServerCalls()).toBe(serverBefore);
  });

  test("custom period sets from and to in the URL", async ({ page }) => {
    await page.goto("/?tab=overview&period=this_week");
    await page.getByRole("button", { name: "Custom" }).click();
    await page.locator('input[type="date"]').nth(0).fill("2026-01-01");
    await page.locator('input[type="date"]').nth(1).fill("2026-01-31");
    await page.getByRole("button", { name: "Apply range" }).click();
    await expect(page).toHaveURL(/period=custom/);
    await expect(page).toHaveURL(/from=2026-01-01/);
    await expect(page).toHaveURL(/to=2026-01-31/);
  });

  test("server_load is not clickable", async ({ page }) => {
    await page.goto("/?tab=overview&period=this_week");
    const card = page.getByTestId("card-server_load");
    await expect(card).toBeVisible();
    await expect(card).not.toHaveAttribute("type", "button");
    await card.click();
    await expect(page).not.toHaveURL(/card=/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });

  test("notification_health opens detail, hides tabs, shows failed table; back clears card", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    await page.getByTestId("card-notification_health").click();
    await expect(page).toHaveURL(/card=notification_health/);
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toHaveCount(0);

    const detail = page.getByTestId("detail-notification_health");
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("columnheader", { name: "Recipients" })).toBeVisible();
    await expect(detail.getByRole("columnheader", { name: "Engagement" })).toBeVisible();
    await expect(detail.getByRole("columnheader", { name: "Channel" })).toBeVisible();
    await expect(detail.getByRole("columnheader", { name: "Message" })).toBeVisible();
    await expect(detail.getByText("Ada Lovelace")).toBeVisible();

    await detail.getByRole("button", { name: "Back" }).click();
    await expect(page).not.toHaveURL(/card=/);
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
  });

  test("people_registered opens detail table with required columns", async ({ page }) => {
    await page.goto("/?tab=overview&period=this_week");
    await page.getByTestId("card-people_registered").click();
    await expect(page).toHaveURL(/card=people_registered/);
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toHaveCount(0);

    const detail = page.getByTestId("detail-people_registered");
    await expect(detail).toBeVisible();
    for (const header of [
      "Person",
      "Type",
      "Engagement",
      "Package",
      "Collection",
      "Blood Collection",
      "Questionnaire",
      "Lab report",
      "BIO-AI",
      "Consult",
    ]) {
      await expect(detail.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }
    await expect(detail.getByText("Ada Lovelace")).toBeVisible();
    await expect(detail.getByText("9999999999")).toBeVisible();
  });
});
