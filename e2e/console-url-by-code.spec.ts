import { test, expect, type Page } from "@playwright/test";
import { seedAdminSession } from "./fixtures/auth";
import { CAMP_CODE, prepareEngagementOverview } from "./fixtures/engagementOverview";

const ENGAGEMENT_ID = 7001;
const ENGAGEMENT_CODE = "E2E-CONSOLE-CODE";
const ENGAGEMENT_NAME = "E2E Console Engagement";

const MOCK_LIST_ITEM = {
  engagement_id: ENGAGEMENT_ID,
  engagement_code: ENGAGEMENT_CODE,
  engagement_name: ENGAGEMENT_NAME,
  status: "running",
  start_date: "2026-01-01",
  end_date: "2026-01-31",
  participant_count: 0,
};

const MOCK_BOOTSTRAP = {
  engagement: MOCK_LIST_ITEM,
  participants: [],
  filter_facets: {},
};

async function mockConsoleEmployeeApis(page: Page, listItems = [MOCK_LIST_ITEM]) {
  await seedAdminSession(page);

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (url.includes("/employees/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            employee_id: 9001,
            name: "E2E Admin",
            role: "admin",
            permissions: null,
            pending_task_count: 0,
          },
          meta: {},
        }),
      });
      return;
    }

    if (url.includes("/engagements/console/engagements")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: listItems, meta: {} }),
      });
      return;
    }

    if (/\/engagements\/\d+\/console\/bootstrap/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: MOCK_BOOTSTRAP,
          meta: { page: 1, limit: 25, total: 0 },
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe("Engagement console URL by code", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("ID route still opens engagement console", async ({ page }) => {
    await mockConsoleEmployeeApis(page);
    await page.goto(`/engagements/${ENGAGEMENT_ID}/console`);

    await expect(page.getByPlaceholder("Search name, phone, email...")).toBeVisible();
    await expect(page.getByText(ENGAGEMENT_NAME, { exact: true })).toBeVisible();
  });

  test("code route resolves and opens the same console", async ({ page }) => {
    await mockConsoleEmployeeApis(page);
    await page.goto(`/engagements/code/${encodeURIComponent(ENGAGEMENT_CODE)}/console`);

    await expect(page.getByPlaceholder("Search name, phone, email...")).toBeVisible();
    await expect(page.getByText(ENGAGEMENT_NAME, { exact: true })).toBeVisible();
  });

  test("code route matches case-insensitively and trims URL code", async ({ page }) => {
    await mockConsoleEmployeeApis(page);

    await page.goto(`/engagements/code/${encodeURIComponent(ENGAGEMENT_CODE.toLowerCase())}/console`);
    await expect(page.getByPlaceholder("Search name, phone, email...")).toBeVisible();

    await page.goto(
      `/engagements/code/${encodeURIComponent(` ${ENGAGEMENT_CODE} `)}/console`,
    );
    await expect(page.getByPlaceholder("Search name, phone, email...")).toBeVisible();
  });

  test("unknown code redirects to console list", async ({ page }) => {
    await mockConsoleEmployeeApis(page);
    await page.goto("/engagements/code/DOES-NOT-EXIST/console");

    await expect(page).toHaveURL(/\/engagements\/console$/);
    await expect(page.getByRole("heading", { name: "Engagement Console" })).toBeVisible();
  });

  test("console list links use code path when code is present", async ({ page }) => {
    await mockConsoleEmployeeApis(page);
    await page.goto("/engagements/console");

    const link = page.getByRole("link", { name: new RegExp(ENGAGEMENT_NAME) });
    await expect(link).toHaveAttribute(
      "href",
      `/engagements/code/${encodeURIComponent(ENGAGEMENT_CODE)}/console`,
    );
  });

  test("engagement overview shows code console URL and Copy URL uses it", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await prepareEngagementOverview(page);
    await page.goto(`/engagements/${CAMP_CODE}`);

    const expectedPath = `/engagements/code/${encodeURIComponent(CAMP_CODE)}/console`;
    await expect(page.locator("code").filter({ hasText: expectedPath })).toBeVisible();

    await page.getByRole("button", { name: "Copy URL" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(expectedPath);
  });

  test("Share falls back to clipboard when Web Share is unavailable", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await prepareEngagementOverview(page);
    await page.goto(`/engagements/${CAMP_CODE}`);

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("button", { name: "Copied" }).first()).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(`/engagements/code/${encodeURIComponent(CAMP_CODE)}/console`);
  });
});