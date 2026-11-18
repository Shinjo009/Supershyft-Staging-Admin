import { test, expect } from "./fixtures/auth";

/**
 * Command overview uses camp KPI rules for questionnaire done + Action Center pending.
 * Mocks assert the dashboard calls the endpoints and renders totals.
 */
test.describe("Command dashboard questionnaire KPI", () => {
  test("overview shows questionnaire done and action center pending from API meta", async ({
    page,
    counters,
  }) => {
    await page.goto("/?tab=overview&period=this_week");
    await expect(page.getByTestId("command-dashboard")).toBeVisible();

    const doneCard = page.getByTestId("card-questionnaire_done");
    await expect(doneCard).toContainText("87");
    await expect(doneCard.getByTestId("audience-split")).toContainText("57");

    const actionCenter = page.getByTestId("card-action_center");
    await expect(actionCenter.getByTestId("action-tile-questionnaire_pending")).toContainText(
      "14"
    );

    expect(counters.getQuestionnaireCalls()).toBeGreaterThanOrEqual(1);
    expect(counters.getQuestionnairePendingCalls()).toBeGreaterThanOrEqual(1);
  });
});