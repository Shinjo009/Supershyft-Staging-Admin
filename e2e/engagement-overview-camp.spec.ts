import {
  CAMP_CODE,
  DAY_A,
  DAY_B,
  HOME_CODE,
  expect,
  prepareEngagementOverview,
  test,
} from "./fixtures/engagementOverview";

test.describe("Engagement Overview — camp progress + day-wise", () => {
  test.beforeEach(async ({ page }) => {
    await prepareEngagementOverview(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("camp engagement shows progress + day-wise and hides booking summary", async ({
    page,
  }) => {
    await page.goto(`/engagements/${CAMP_CODE}`);

    await expect(page.getByTestId("camp-overview-metrics")).toBeVisible();
    await expect(page.getByTestId("camp-progress-report")).toBeVisible();
    await expect(page.getByTestId("day-wise-summary")).toBeVisible();
    await expect(page.getByTestId("booking-summary")).toHaveCount(0);

    // Total registered shows a single count (no /total).
    await expect(page.getByTestId("camp-progress-total_registered")).toContainText("8");
    await expect(page.getByTestId("camp-progress-total_registered")).not.toContainText("/ 8");
    await expect(page.getByTestId("camp-progress-blood_collected")).toContainText("1 / 8");
    await expect(page.getByTestId("camp-progress-questionnaire_filled")).toContainText("8 / 8");
    await expect(page.getByTestId("camp-progress-blood_report_sent")).toContainText("2 / 8");
    await expect(page.getByTestId("camp-progress-blood_report_sent")).toContainText("6 pending");
    await expect(page.getByTestId("camp-progress-bio_ai_report_sent")).toContainText("1 / 8");
    await expect(page.getByTestId("camp-progress-bio_ai_report_sent")).toContainText("7 pending");
    await expect(page.getByTestId("camp-progress-consultation_done")).toContainText("0 / 8");

    await expect(page.getByTestId("camp-progress-blood_collected")).toContainText("13%");
    await expect(page.getByTestId("camp-progress-blood_collected")).toContainText("7 pending");
    await expect(page.getByTestId("camp-progress-bar-blood_collected")).toBeVisible();
    await expect(page.getByTestId("camp-progress-bar-blood_report_sent")).toBeVisible();
    await expect(page.getByTestId("camp-progress-bar-bio_ai_report_sent")).toBeVisible();

    // Six progress metric cards (exclude progress-bar testids).
    await expect(page.locator("article[data-testid^='camp-progress-']")).toHaveCount(6);

    // Progress metric tiles are display-only articles (not buttons/links).
    await expect(
      page.getByTestId("camp-progress-total_registered").locator("xpath=self::article")
    ).toHaveCount(1);
    await expect(
      page.locator("[data-testid^='camp-progress-'][href], button[data-testid^='camp-progress-']")
    ).toHaveCount(0);
  });

  test("day-wise tabs and date pills update visible metrics", async ({ page }) => {
    await page.goto(`/engagements/${CAMP_CODE}`);
    await expect(page.getByTestId("day-wise-summary")).toBeVisible();

    await expect(page.getByTestId("day-wise-tab-blood_collection")).toBeVisible();
    await expect(page.getByTestId("day-wise-tab-consultation")).toBeVisible();
    await expect(page.getByTestId(`day-wise-date-${DAY_A}`)).toBeVisible();
    await expect(page.getByTestId(`day-wise-date-${DAY_B}`)).toBeVisible();

    // Prefer Day A explicitly so assertions are stable regardless of "today".
    await page.getByTestId(`day-wise-date-${DAY_A}`).click();
    await expect(page.getByTestId("day-wise-metric-expected_collection")).toContainText("5");
    await expect(page.getByTestId("day-wise-metric-expected_collection")).toContainText("Expected collection");
    await expect(page.getByTestId("day-wise-metric-sample_collected")).toContainText("1");
    await expect(page.getByTestId("day-wise-metric-sample_collected")).toContainText("Sample collected");
    await expect(page.getByTestId("day-wise-metric-questionnaire_completed")).toContainText("2");
    await expect(page.getByTestId("day-wise-metric-questionnaire_completed")).toContainText(
      "Questionnaire completed"
    );

    // Blood metrics use a 2-column grid (third card wraps to next row).
    const expectedBox = await page.getByTestId("day-wise-metric-expected_collection").boundingBox();
    const sampleBox = await page.getByTestId("day-wise-metric-sample_collected").boundingBox();
    const qBox = await page.getByTestId("day-wise-metric-questionnaire_completed").boundingBox();
    expect(expectedBox && sampleBox && qBox).toBeTruthy();
    if (expectedBox && sampleBox && qBox) {
      expect(Math.abs(expectedBox.y - sampleBox.y)).toBeLessThan(20);
      expect(qBox.y).toBeGreaterThan(expectedBox.y + expectedBox.height * 0.5);
    }

    await page.getByTestId(`day-wise-date-${DAY_B}`).click();
    await expect(page.getByTestId("day-wise-metric-expected_collection")).toContainText("3");
    await expect(page.getByTestId("day-wise-metric-sample_collected")).toContainText("0");

    await page.getByTestId("day-wise-tab-consultation").click();
    await page.getByTestId(`day-wise-date-${DAY_A}`).click();
    await expect(page.getByTestId("day-wise-metric-consultation_want")).toContainText("4");
    await expect(page.getByTestId("day-wise-metric-consultation_done")).toContainText("1");

    await page.getByTestId(`day-wise-date-${DAY_B}`).click();
    await expect(page.getByTestId("day-wise-metric-consultation_want")).toContainText("2");
    await expect(page.getByTestId("day-wise-metric-consultation_done")).toContainText("0");
  });

  test("desktop layout places progress and day-wise side by side", async ({ page }) => {
    await page.goto(`/engagements/${CAMP_CODE}`);
    const row = page.getByTestId("camp-overview-metrics");
    const progress = page.getByTestId("camp-progress-report");
    const dayWise = page.getByTestId("day-wise-summary");

    await expect(row).toBeVisible();
    const rowBox = await row.boundingBox();
    const progressBox = await progress.boundingBox();
    const dayWiseBox = await dayWise.boundingBox();

    expect(rowBox).toBeTruthy();
    expect(progressBox).toBeTruthy();
    expect(dayWiseBox).toBeTruthy();
    if (!progressBox || !dayWiseBox) return;

    // Same horizontal band: day-wise sits to the right of progress.
    expect(dayWiseBox.x).toBeGreaterThan(progressBox.x + progressBox.width * 0.5);
    expect(Math.abs(progressBox.y - dayWiseBox.y)).toBeLessThan(40);
    // Progress is the wider column (~2/3).
    expect(progressBox.width).toBeGreaterThan(dayWiseBox.width);
  });

  test("home collection keeps booking summary and hides camp metrics", async ({ page }) => {
    await page.goto(`/engagements/${HOME_CODE}`);

    await expect(page.getByTestId("booking-summary")).toBeVisible();
    await expect(page.getByTestId("camp-overview-metrics")).toHaveCount(0);
    await expect(page.getByTestId("camp-progress-report")).toHaveCount(0);
    await expect(page.getByTestId("day-wise-summary")).toHaveCount(0);
    await expect(page.getByText("Today's expected")).toBeVisible();
  });
});
