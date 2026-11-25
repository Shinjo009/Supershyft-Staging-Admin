import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const PROFILE_LIST_ROWS = [
  {
    group_id: 101,
    group_name: "CBC Profile",
    test_count: 12,
    price: 799,
    discount_percent: 10,
    gender_suitability: "both",
    diagnostic_provider: "healthians",
    profile_group_id: 501,
    profile_group: { healthians: 101, orange_health: 102 },
    warnings: [],
  },
  {
    group_id: 201,
    group_name: "Lipid Profile",
    test_count: 6,
    price: 499,
    discount_percent: null,
    gender_suitability: "both",
    diagnostic_provider: "healthians",
    profile_group_id: 601,
    profile_group: { healthians: 201 },
    warnings: [],
  },
];

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

export async function mockDiagnosticProfilesListApis(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (url.includes("/employees/auth/me")) {
      await fulfillJson(route, {
        employee_id: 9001,
        name: "E2E Admin",
        role: "admin",
        permissions: null,
        pending_task_count: 0,
      });
      return;
    }

    if (method === "GET" && url.includes("/diagnostic-test-groups/groups")) {
      await fulfillJson(route, PROFILE_LIST_ROWS, {
        page: 1,
        limit: 10,
        total: PROFILE_LIST_ROWS.length,
      });
      return;
    }

    if (method === "DELETE" && /\/diagnostic-test-groups\/\d+/.test(url)) {
      await fulfillJson(route, { deleted: true });
      return;
    }

    if (url.includes("/api/") || url.includes(":8000/")) {
      await fulfillJson(route, {});
      return;
    }

    await route.continue();
  });
}

export async function prepareDiagnosticProfilesList(page: Page) {
  await seedAdminSession(page);
  await mockDiagnosticProfilesListApis(page);
}

export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await prepareDiagnosticProfilesList(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
