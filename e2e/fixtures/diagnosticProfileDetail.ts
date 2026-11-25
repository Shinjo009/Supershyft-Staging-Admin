import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const GROUP_ID = 101;

export const PROFILE_DETAIL = {
  group_id: GROUP_ID,
  group_name: "CBC Profile",
  group_key: "cbc_profile",
  test_group_image: null,
  diagnostic_provider: "healthians",
  external_test_group_code: "HGRP001",
  is_default_for_group: true,
  display_order: 1,
  test_count: 2,
  price: 1799,
  original_price: 1999,
  discount_percent: 10,
  gender_suitability: "both",
  package_for: "public",
  is_most_popular: false,
  has_allergy_screening: false,
  has_cancer_screening: false,
  same_test_groups: [],
  filter_chips: [
    {
      filter_chip_id: 5,
      chip_key: "progressive",
      display_name: "Progressive tests",
      display_order: 1,
    },
  ],
};

export const PROFILE_TESTS = [
  {
    test_id: 11,
    parameter_type: "test",
    test_name: "Neutrophils",
    healthians_parameter_key: "neutrophils",
    orangehealth_parameter_key: null,
    parameter_key: "neutrophils",
    is_available: true,
  },
  {
    test_id: 12,
    parameter_type: "test",
    test_name: "Lymphocytes",
    healthians_parameter_key: "lymphocytes",
    orangehealth_parameter_key: null,
    parameter_key: "lymphocytes",
    is_available: false,
  },
];

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

export async function mockDiagnosticProfileDetailApis(page: Page) {
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

    if (method === "GET" && /\/diagnostic-test-groups\/\d+\/tests/.test(url)) {
      await fulfillJson(route, PROFILE_TESTS);
      return;
    }

    if (method === "GET" && /\/diagnostic-test-groups\/\d+(\?|$)/.test(url)) {
      await fulfillJson(route, PROFILE_DETAIL);
      return;
    }

    if (method === "GET" && url.includes("/diagnostic-packages/filters-chips")) {
      await fulfillJson(route, [], { page: 1, limit: 50, total: 0 });
      return;
    }

    if (method === "GET" && url.includes("/diagnostic-tests")) {
      await fulfillJson(route, PROFILE_TESTS, { page: 1, limit: 50, total: PROFILE_TESTS.length });
      return;
    }

    if (url.includes("/api/") || url.includes(":8000/")) {
      await fulfillJson(route, {});
      return;
    }

    await route.continue();
  });
}

export async function prepareDiagnosticProfileDetail(page: Page) {
  await seedAdminSession(page);
  await mockDiagnosticProfileDetailApis(page);
}

export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await prepareDiagnosticProfileDetail(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
