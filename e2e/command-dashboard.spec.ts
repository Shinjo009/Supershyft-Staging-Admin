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

    const testsCard = page.getByTestId("card-tests_completed");
    await expect(testsCard).toContainText("63");
    await expect(testsCard.getByTestId("audience-split")).toContainText("B2B");
    await expect(testsCard.getByTestId("audience-split")).toContainText("46");
    await expect(testsCard.getByTestId("audience-split")).toContainText("B2C");
    await expect(testsCard.getByTestId("audience-split")).toContainText("17");

    const questCard = page.getByTestId("card-questionnaire_done");
    await expect(questCard).toContainText("87");
    await expect(questCard.getByTestId("audience-split")).toContainText("57");
    await expect(questCard.getByTestId("audience-split")).toContainText("30");

    expect(counters.getServerCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getNotifCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getPeopleCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getTestsCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getQuestionnaireCalls()).toBeGreaterThanOrEqual(1);
  });

  test("B2B tab is enabled; B2C stays inert; invalid tab normalizes to overview", async ({
    page,
  }) => {
    await page.goto("/?tab=foo&period=this_week");
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();

    await page.goto("/?tab=b2c&period=this_week");
    await expect(page).toHaveURL(/tab=overview/);

    const b2c = page.getByRole("tab", { name: "B2C" });
    await expect(b2c).toBeDisabled();

    await page.goto("/?tab=b2b&period=this_week");
    await expect(page).toHaveURL(/tab=b2b/);
    await expect(page.getByTestId("b2b-grid")).toBeVisible();

    const b2b = page.getByRole("tab", { name: "B2B" });
    await expect(b2b).toBeEnabled();
    await expect(b2b).toHaveAttribute("aria-selected", "true");
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
    const testsBefore = counters.getTestsCalls();
    const questBefore = counters.getQuestionnaireCalls();

    await page.getByRole("button", { name: "This month", exact: true }).click();
    await expect(page).toHaveURL(/period=this_month/);

    await expect.poll(() => counters.getNotifCalls()).toBeGreaterThan(notifBefore);
    await expect.poll(() => counters.getPeopleCalls()).toBeGreaterThan(peopleBefore);
    await expect.poll(() => counters.getTestsCalls()).toBeGreaterThan(testsBefore);
    await expect
      .poll(() => counters.getQuestionnaireCalls())
      .toBeGreaterThan(questBefore);
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

  test("notification_health opens new-page detail, hides tabs, shows failed table; back clears card", async ({
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

  test("people_registered opens new-page detail table with required columns", async ({
    page,
  }) => {
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

  test("tests_completed shows B2B/B2C split and opens new-page detail", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    const card = page.getByTestId("card-tests_completed");
    await expect(card).toHaveAttribute("type", "button");
    await expect(card.getByTestId("audience-split-total")).toHaveText("63");
    await expect(card.getByTestId("audience-split")).toBeVisible();
    await expect(card.getByTestId("audience-split-divider")).toHaveCount(0);

    // Footer layout: B2B then B2C left-to-right
    const splitText = (await card.getByTestId("audience-split").innerText()).replace(
      /\s+/g,
      " "
    );
    expect(splitText.indexOf("B2B")).toBeLessThan(splitText.indexOf("B2C"));

    await card.click();
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page).toHaveURL(/card=tests_completed/);
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toHaveCount(0);

    const detail = page.getByTestId("detail-tests_completed");
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
    await expect(detail.getByText("done")).toBeVisible();

    await detail.getByRole("button", { name: "Back" }).click();
    await expect(page).not.toHaveURL(/card=/);
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });

  test("questionnaire_done shows B2B/B2C split and opens new-page detail", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    const card = page.getByTestId("card-questionnaire_done");
    await expect(card).toHaveAttribute("type", "button");
    await expect(card.getByTestId("audience-split-total")).toHaveText("87");
    await expect(card.getByTestId("audience-split-divider")).toHaveCount(0);
    await expect(card.getByTestId("audience-split")).toContainText("B2B");
    await expect(card.getByTestId("audience-split")).toContainText("B2C");

    await card.click();
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page).toHaveURL(/card=questionnaire_done/);
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();

    const detail = page.getByTestId("detail-questionnaire_done");
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
    await expect(detail.getByText("completed")).toBeVisible();

    await detail.getByRole("button", { name: "Back" }).click();
    await expect(page).not.toHaveURL(/card=/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });

  test("direct URL card=tests_completed and card=questionnaire_done load details", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week&card=tests_completed");
    await expect(page.getByTestId("detail-tests_completed")).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toHaveCount(0);

    await page.goto("/?tab=overview&period=this_week&card=questionnaire_done");
    await expect(page.getByTestId("detail-questionnaire_done")).toBeVisible();
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();
  });

  test("B2B shows three cards with counts and period refetch", async ({ page, counters }) => {
    await page.goto("/?tab=b2b&period=this_week");
    await expect(page.getByTestId("b2b-grid")).toBeVisible();
    await expect(page.getByTestId("card-ongoing")).toContainText("3");
    await expect(page.getByTestId("card-upcoming")).toContainText("5");
    await expect(page.getByTestId("card-completed")).toContainText("12");
    expect(counters.getB2bSummaryCalls()).toBeGreaterThanOrEqual(1);

    const before = counters.getB2bSummaryCalls();
    await page.getByRole("button", { name: "This month", exact: true }).click();
    await expect(page).toHaveURL(/period=this_month/);
    await expect.poll(() => counters.getB2bSummaryCalls()).toBeGreaterThan(before);
  });

  test("B2B ongoing card is current_page: tabs stay, table shows, row navigates", async ({
    page,
  }) => {
    await page.goto("/?tab=b2b&period=this_week");
    await page.getByTestId("card-ongoing").click();
    await expect(page).toHaveURL(/tab=b2b/);
    await expect(page).toHaveURL(/card=ongoing/);
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
    await expect(page.getByTestId("tabs-hidden")).toHaveCount(0);
    await expect(page.getByTestId("card-ongoing")).toBeVisible();
    await expect(page.getByTestId("card-upcoming")).toBeVisible();
    await expect(page.getByTestId("card-completed")).toBeVisible();

    const table = page.getByTestId("b2b-engagement-table");
    await expect(table).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: "Camp Name & Location" })
    ).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Dates" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "People" })).toBeVisible();
    await expect(table.getByText("Acme Wellness Camp")).toBeVisible();
    await expect(table.getByText("Mumbai")).toBeVisible();

    await page.getByTestId("b2b-row-ENG-B2B-101").click();
    await expect(page).toHaveURL(/\/engagements\/ENG-B2B-101/);
  });

  test("B2B upcoming and completed cards open table on current page", async ({ page }) => {
    await page.goto("/?tab=b2b&period=this_week");

    await page.getByTestId("card-upcoming").click();
    await expect(page).toHaveURL(/card=upcoming/);
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
    await expect(page.getByTestId("b2b-engagement-table")).toBeVisible();
    await expect(page.getByTestId("b2b-engagement-table")).toContainText("Upcoming");

    await page.getByTestId("card-completed").click();
    await expect(page).toHaveURL(/card=completed/);
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
    await expect(page.getByTestId("b2b-engagement-table")).toContainText("Completed");
  });

  test("direct URL ?tab=b2b&card=ongoing loads table without prior click", async ({
    page,
  }) => {
    await page.goto("/?tab=b2b&period=this_week&card=ongoing");
    await expect(page.getByTestId("b2b-grid")).toBeVisible();
    await expect(page.getByTestId("b2b-engagement-table")).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
    await expect(page.getByText("Acme Wellness Camp")).toBeVisible();
  });

  test("switching tab clears card param", async ({ page }) => {
    await page.goto("/?tab=b2b&period=this_week&card=ongoing");
    await expect(page).toHaveURL(/card=ongoing/);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page).not.toHaveURL(/card=/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });
});
