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

    const bloodCard = page.getByTestId("card-blood_report_generated");
    await expect(bloodCard.getByTestId("audience-split-total")).toHaveText("28");
    await expect(bloodCard.getByTestId("audience-split")).toContainText("19");
    await expect(bloodCard.getByTestId("audience-split")).toContainText("9");

    const bioaiCard = page.getByTestId("card-bioai_report_generated");
    await expect(bioaiCard.getByTestId("audience-split-total")).toHaveText("21");
    await expect(bioaiCard.getByTestId("audience-split")).toContainText("14");
    await expect(bioaiCard.getByTestId("audience-split")).toContainText("7");

    const consultCard = page.getByTestId("card-consultation_done");
    await expect(consultCard.getByTestId("audience-split-total")).toHaveText("15");
    await expect(consultCard.getByTestId("audience-split")).toContainText("10");
    await expect(consultCard.getByTestId("audience-split")).toContainText("5");

    const openCard = page.getByTestId("card-open_engagement");
    await expect(openCard.getByTestId("audience-split-total")).toHaveText("8");
    await expect(openCard.getByTestId("audience-split")).toContainText("5");
    await expect(openCard.getByTestId("audience-split")).toContainText("3");

    const ticketsCard = page.getByTestId("card-tickets");
    await expect(ticketsCard.getByTestId("tickets-raised-total")).toHaveText("15");
    await expect(ticketsCard.getByTestId("tickets-slice-open")).toContainText("4");
    await expect(ticketsCard.getByTestId("tickets-slice-solved")).toContainText("11");

    const actionCenter = page.getByTestId("card-action_center");
    await expect(actionCenter).toBeVisible();
    await expect(actionCenter.getByTestId("action-tile-upcoming_collections")).toContainText(
      "11"
    );
    await expect(actionCenter.getByTestId("action-tile-overdue_collections")).toContainText(
      "7"
    );
    await expect(actionCenter.getByTestId("action-tile-questionnaire_pending")).toContainText(
      "14"
    );
    await expect(actionCenter.getByTestId("action-tile-blood_reports_pending")).toContainText(
      "9"
    );
    await expect(actionCenter.getByTestId("action-tile-bio_ai_pending")).toContainText("6");
    await expect(actionCenter.getByTestId("action-tile-consultation_pending")).toContainText(
      "4"
    );

    expect(counters.getServerCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getNotifCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getPeopleCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getTestsCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getQuestionnaireCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getBloodReportCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getBioaiReportCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getConsultationDoneCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getOpenEngagementCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getTicketsCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getUpcomingCollectionsCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getOverdueCollectionsCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getQuestionnairePendingCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getBloodReportsPendingCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getBioaiPendingCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getConsultationPendingCalls()).toBeGreaterThanOrEqual(1);
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
    const bloodBefore = counters.getBloodReportCalls();
    const bioaiBefore = counters.getBioaiReportCalls();
    const consultBefore = counters.getConsultationDoneCalls();
    const openBefore = counters.getOpenEngagementCalls();
    const ticketsBefore = counters.getTicketsCalls();
    const upcomingBefore = counters.getUpcomingCollectionsCalls();
    const overdueBefore = counters.getOverdueCollectionsCalls();
    const questPendingBefore = counters.getQuestionnairePendingCalls();
    const bloodPendingBefore = counters.getBloodReportsPendingCalls();
    const bioaiPendingBefore = counters.getBioaiPendingCalls();
    const consultPendingBefore = counters.getConsultationPendingCalls();

    await page.getByRole("button", { name: "This month", exact: true }).click();
    await expect(page).toHaveURL(/period=this_month/);

    await expect.poll(() => counters.getNotifCalls()).toBeGreaterThan(notifBefore);
    await expect.poll(() => counters.getPeopleCalls()).toBeGreaterThan(peopleBefore);
    await expect.poll(() => counters.getTestsCalls()).toBeGreaterThan(testsBefore);
    await expect
      .poll(() => counters.getQuestionnaireCalls())
      .toBeGreaterThan(questBefore);
    await expect.poll(() => counters.getBloodReportCalls()).toBeGreaterThan(bloodBefore);
    await expect.poll(() => counters.getBioaiReportCalls()).toBeGreaterThan(bioaiBefore);
    await expect
      .poll(() => counters.getConsultationDoneCalls())
      .toBeGreaterThan(consultBefore);
    await expect
      .poll(() => counters.getOpenEngagementCalls())
      .toBeGreaterThan(openBefore);
    await expect.poll(() => counters.getTicketsCalls()).toBeGreaterThan(ticketsBefore);
    await expect
      .poll(() => counters.getUpcomingCollectionsCalls())
      .toBeGreaterThan(upcomingBefore);
    await expect
      .poll(() => counters.getOverdueCollectionsCalls())
      .toBeGreaterThan(overdueBefore);
    await expect
      .poll(() => counters.getQuestionnairePendingCalls())
      .toBeGreaterThan(questPendingBefore);
    await expect
      .poll(() => counters.getBloodReportsPendingCalls())
      .toBeGreaterThan(bloodPendingBefore);
    await expect
      .poll(() => counters.getBioaiPendingCalls())
      .toBeGreaterThan(bioaiPendingBefore);
    await expect
      .poll(() => counters.getConsultationPendingCalls())
      .toBeGreaterThan(consultPendingBefore);
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

  test("blood_report_generated shows B2B/B2C split and opens journey detail", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    const card = page.getByTestId("card-blood_report_generated");
    await expect(card).toHaveAttribute("type", "button");
    await expect(card.getByTestId("audience-split-total")).toHaveText("28");
    const splitText = (await card.getByTestId("audience-split").innerText()).replace(
      /\s+/g,
      " "
    );
    expect(splitText.indexOf("B2B")).toBeLessThan(splitText.indexOf("B2C"));

    await card.click();
    await expect(page).toHaveURL(/card=blood_report_generated/);
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();
    const detail = page.getByTestId("detail-blood_report_generated");
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("columnheader", { name: "Person", exact: true })).toBeVisible();
    await expect(detail.getByRole("columnheader", { name: "Lab report", exact: true })).toBeVisible();
    await expect(detail.getByText("Ada Lovelace")).toBeVisible();
    await expect(detail.getByText("loaded")).toBeVisible();
    const back = detail.getByRole("button", { name: "Back" });
    await expect(back).toBeVisible();
    await back.focus();
    await expect(back).toBeFocused();
    await back.click();
    await expect(page).not.toHaveURL(/card=/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });

  test("bioai_report_generated and consultation_done open new-page details", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week");

    await page.getByTestId("card-bioai_report_generated").click();
    await expect(page).toHaveURL(/card=bioai_report_generated/);
    await expect(page.getByTestId("detail-bioai_report_generated")).toBeVisible();
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();
    await expect(page.getByText("Ada Lovelace")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();

    await page.getByTestId("card-consultation_done").click();
    await expect(page).toHaveURL(/card=consultation_done/);
    await expect(page.getByTestId("detail-consultation_done")).toBeVisible();
    await expect(page.getByText("Attended")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });

  test("open_engagement detail lists engagements and row navigates by code", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    const card = page.getByTestId("card-open_engagement");
    await expect(card.getByTestId("audience-split-total")).toHaveText("8");
    await card.click();
    await expect(page).toHaveURL(/card=open_engagement/);
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();

    const detail = page.getByTestId("detail-open_engagement");
    await expect(detail).toBeVisible();
    for (const header of ["Engagement name", "Type", "City", "Package", "Duration"]) {
      await expect(detail.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }
    await expect(detail.getByText("Open Camp Alpha")).toBeVisible();
    await expect(detail.getByText("Bengaluru")).toBeVisible();
    await expect(detail.getByText("Full Body")).toBeVisible();

    await page.getByTestId("open-engagement-row-ENG-OPEN-201").click();
    await expect(page).toHaveURL(/\/engagements\/ENG-OPEN-201/);
  });

  test("tickets card shows open/solved and opens detail table", async ({ page }) => {
    await page.goto("/?tab=overview&period=this_week");
    const card = page.getByTestId("card-tickets");
    await expect(card).toHaveAttribute("type", "button");
    await expect(card.getByTestId("tickets-raised-total")).toHaveText("15");
    await expect(card.getByTestId("tickets-slice-open")).toContainText("Open");
    await expect(card.getByTestId("tickets-slice-open")).toContainText("4");
    await expect(card.getByTestId("tickets-slice-solved")).toContainText("Solved");
    await expect(card.getByTestId("tickets-slice-solved")).toContainText("11");

    await card.click();
    await expect(page).toHaveURL(/card=tickets/);
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();

    const detail = page.getByTestId("detail-tickets");
    await expect(detail).toBeVisible();
    for (const header of [
      "Ticket ID",
      "Raised by",
      "Contact",
      "Query",
      "Raised at",
      "Status",
    ]) {
      await expect(detail.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }
    await expect(detail.getByText("Ada Lovelace")).toBeVisible();
    await expect(detail.getByText("Need help with booking")).toBeVisible();
    await expect(detail.getByText("Open", { exact: true })).toBeVisible();
    await detail.getByRole("button", { name: "Back" }).click();
    await expect(page).not.toHaveURL(/card=/);
  });

  test("direct URLs for cards 7-11 load details", async ({ page }) => {
    for (const card of [
      "blood_report_generated",
      "bioai_report_generated",
      "consultation_done",
      "open_engagement",
      "tickets",
    ]) {
      await page.goto(`/?tab=overview&period=this_week&card=${card}`);
      await expect(page.getByTestId(`detail-${card}`)).toBeVisible();
      await expect(page.getByTestId("tabs-hidden")).toBeAttached();
      await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toHaveCount(0);
    }
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

  const ACTION_SUBCARDS = [
    {
      id: "upcoming_collections",
      label: "Upcoming collections",
      count: "11",
    },
    {
      id: "overdue_collections",
      label: "Overdue collections",
      count: "7",
    },
    {
      id: "questionnaire_pending",
      label: "Questionnaire pending",
      count: "14",
    },
    {
      id: "blood_reports_pending",
      label: "Blood reports pending",
      count: "9",
    },
    {
      id: "bio_ai_pending",
      label: "Bio-AI pending",
      count: "6",
    },
    {
      id: "consultation_pending",
      label: "Consultations pending",
      count: "4",
    },
  ] as const;

  const JOURNEY_HEADERS = [
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
  ] as const;

  test("action center tiles show labels, counts, and are keyboard-focusable", async ({
    page,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    const actionCenter = page.getByTestId("card-action_center");
    await expect(actionCenter).toBeVisible();

    for (const tile of ACTION_SUBCARDS) {
      const btn = actionCenter.getByTestId(`action-tile-${tile.id}`);
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute("type", "button");
      await expect(btn).toContainText(tile.label);
      await expect(btn).toContainText(tile.count);
      await btn.focus();
      await expect(btn).toBeFocused();
    }
  });

  for (const tile of ACTION_SUBCARDS) {
    test(`action tile ${tile.id} opens detail table and back clears params`, async ({
      page,
    }) => {
      await page.goto("/?tab=overview&period=this_week");
      await page.getByTestId(`action-tile-${tile.id}`).click();

      await expect(page).toHaveURL(/tab=overview/);
      await expect(page).toHaveURL(/card=action_center/);
      await expect(page).toHaveURL(new RegExp(`subcard=${tile.id}`));
      await expect(page.getByTestId("tabs-hidden")).toBeAttached();
      await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toHaveCount(0);

      const detail = page.getByTestId(`detail-action_center-${tile.id}`);
      await expect(detail).toBeVisible();
      await expect(detail.getByRole("heading", { name: tile.label })).toBeVisible();
      await expect(detail).toContainText(`(${tile.count})`);

      for (const header of JOURNEY_HEADERS) {
        await expect(
          detail.getByRole("columnheader", { name: header, exact: true })
        ).toBeVisible();
      }
      await expect(detail.getByText("Ada Lovelace")).toBeVisible();
      await expect(detail.getByText("9999999999")).toBeVisible();

      await detail.getByRole("button", { name: "Back" }).click();
      await expect(page).not.toHaveURL(/card=/);
      await expect(page).not.toHaveURL(/subcard=/);
      await expect(page.getByRole("tablist", { name: "Dashboard tabs" })).toBeVisible();
      await expect(page.getByTestId("overview-grid")).toBeVisible();
    });
  }

  test("invalid action_center subcard is stripped back to overview", async ({ page }) => {
    await page.goto(
      "/?tab=overview&period=this_week&card=action_center&subcard=not_a_real_tile"
    );
    await expect(page).not.toHaveURL(/card=/);
    await expect(page).not.toHaveURL(/subcard=/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();
    await expect(page.getByTestId("card-action_center")).toBeVisible();
  });

  test("action_center without subcard normalizes to overview", async ({ page }) => {
    await page.goto("/?tab=overview&period=this_week&card=action_center");
    await expect(page).not.toHaveURL(/card=/);
    await expect(page.getByTestId("overview-grid")).toBeVisible();
  });

  test("direct action_center subcard URL loads detail without prior click", async ({
    page,
  }) => {
    await page.goto(
      "/?tab=overview&period=this_week&card=action_center&subcard=blood_reports_pending"
    );
    await expect(page.getByTestId("detail-action_center-blood_reports_pending")).toBeVisible();
    await expect(page.getByTestId("tabs-hidden")).toBeAttached();
    await expect(page.getByText("Ada Lovelace")).toBeVisible();
  });
});

