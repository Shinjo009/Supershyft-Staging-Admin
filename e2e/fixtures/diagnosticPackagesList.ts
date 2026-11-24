import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const LIST_ROWS = [
  {
    diagnostic_package_id: 101,
    package_name: "Supershyft Core+",
    diagnostic_provider: "healthians",
    no_of_tests: 71,
    price: 1999,
    original_price: 2499,
    discount_percent: 20,
    gender_suitability: "both",
    package_for: "public",
    collection_type: "home_collection",
    package_group_id: 501,
    package_group: { healthians: 101, orange_health: 102 },
    has_unmapped_tests: false,
    warnings: [],
    tags: [],
    filter_chips: [],
  },
  {
    diagnostic_package_id: 201,
    package_name: "Camp Essential",
    diagnostic_provider: "healthians",
    no_of_tests: 40,
    price: 999,
    original_price: 1299,
    discount_percent: 23,
    gender_suitability: "both",
    package_for: "camp",
    collection_type: "centre_visit",
    package_group_id: 601,
    package_group: { healthians: 201 },
    has_unmapped_tests: false,
    warnings: [],
    tags: [],
    filter_chips: [],
  },
  {
    diagnostic_package_id: 301,
    package_name: "Hybrid Panel",
    diagnostic_provider: "orange_health",
    no_of_tests: 55,
    price: 1499,
    original_price: null,
    discount_percent: null,
    gender_suitability: "female",
    package_for: "both",
    collection_type: "home_collection",
    package_group_id: 701,
    package_group: { orange_health: 301 },
    has_unmapped_tests: false,
    warnings: [],
    tags: [],
    filter_chips: [],
  },
];

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

export async function mockDiagnosticPackagesListApis(page: Page) {
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

    if (method === "GET" && url.includes("/diagnostic-packages/groups")) {
      await fulfillJson(route, LIST_ROWS, {
        page: 1,
        limit: 10,
        total: LIST_ROWS.length,
        filter_options: { tags: ["Bio Age", "Vitamins"] },
      });
      return;
    }

    if (method === "GET" && /\/diagnostic-packages\/\d+(\?|$)/.test(url)) {
      const id = Number(url.match(/\/diagnostic-packages\/(\d+)/)?.[1]);
      const row = LIST_ROWS.find((item) => item.diagnostic_package_id === id) ?? LIST_ROWS[0];
      await fulfillJson(route, {
        ...row,
        status: "active",
        about_text: "About text",
        health_areas_covered: "Heart, Liver",
        reasons: [],
        samples: [],
        preparations: [],
        same_packages: [],
        complementary_consultation: {},
      });
      return;
    }

    if (method === "GET" && /\/diagnostic-packages\/\d+\/tests/.test(url)) {
      await fulfillJson(route, { groups: [] });
      return;
    }

    if (method === "DELETE" && /\/diagnostic-packages\/\d+/.test(url)) {
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

export async function prepareDiagnosticPackagesList(page: Page) {
  await seedAdminSession(page);
  await mockDiagnosticPackagesListApis(page);
}

export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await prepareDiagnosticPackagesList(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
