import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const PARAMETER_ROWS = [
  {
    test_id: 101,
    parameter_type: "test",
    test_name: "Neutrophils",
    parameter_key: "neutrophils",
    unit: "%",
    meaning: "White blood cell type",
    is_available: true,
    display_order: 1,
    price: 799,
    original_price: 999,
    is_most_popular: true,
    gender_suitability: "both",
    healthians_parameter_key: "neutrophils_h",
    orangehealth_parameter_key: "neutrophils_o",
    low_risk_lower_range_male: 40,
    low_risk_higher_range_male: 80,
    moderate_risk_lower_range_male: null,
    moderate_risk_higher_range_male: null,
    high_risk_lower_range_male: null,
    high_risk_higher_range_male: null,
    low_risk_lower_range_female: 40,
    low_risk_higher_range_female: 80,
    moderate_risk_lower_range_female: null,
    moderate_risk_higher_range_female: null,
    high_risk_lower_range_female: null,
    high_risk_higher_range_female: null,
    causes_when_high: null,
    causes_when_low: null,
    effects_when_high: null,
    effects_when_low: null,
    what_to_do_when_low: null,
    what_to_do_when_high: null,
  },
  {
    test_id: 102,
    parameter_type: "test",
    test_name: "Lymphocytes",
    parameter_key: "lymphocytes",
    unit: "cells/µL",
    meaning: null,
    is_available: true,
    display_order: 2,
    price: 499,
    original_price: null,
    is_most_popular: false,
    gender_suitability: "both",
    healthians_parameter_key: "lymphocytes_h",
    orangehealth_parameter_key: null,
    low_risk_lower_range_male: null,
    low_risk_higher_range_male: null,
    moderate_risk_lower_range_male: null,
    moderate_risk_higher_range_male: null,
    high_risk_lower_range_male: null,
    high_risk_higher_range_male: null,
    low_risk_lower_range_female: null,
    low_risk_higher_range_female: null,
    moderate_risk_lower_range_female: null,
    moderate_risk_higher_range_female: null,
    high_risk_lower_range_female: null,
    high_risk_higher_range_female: null,
    causes_when_high: null,
    causes_when_low: null,
    effects_when_high: null,
    effects_when_low: null,
    what_to_do_when_low: null,
    what_to_do_when_high: null,
  },
  {
    test_id: 103,
    parameter_type: "test",
    test_name: "Monocytes",
    parameter_key: "monocytes",
    unit: "%",
    meaning: null,
    is_available: false,
    display_order: 3,
    price: null,
    original_price: null,
    is_most_popular: false,
    gender_suitability: null,
    healthians_parameter_key: null,
    orangehealth_parameter_key: null,
    low_risk_lower_range_male: null,
    low_risk_higher_range_male: null,
    moderate_risk_lower_range_male: null,
    moderate_risk_higher_range_male: null,
    high_risk_lower_range_male: null,
    high_risk_higher_range_male: null,
    low_risk_lower_range_female: null,
    low_risk_higher_range_female: null,
    moderate_risk_lower_range_female: null,
    moderate_risk_higher_range_female: null,
    high_risk_lower_range_female: null,
    high_risk_higher_range_female: null,
    causes_when_high: null,
    causes_when_low: null,
    effects_when_high: null,
    effects_when_low: null,
    what_to_do_when_low: null,
    what_to_do_when_high: null,
  },
];

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

export async function mockDiagnosticParametersListApis(page: Page) {
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

    if (method === "GET" && url.includes("/diagnostics/health-parameters")) {
      await fulfillJson(route, PARAMETER_ROWS, {
        page: 1,
        limit: 10,
        total: PARAMETER_ROWS.length,
      });
      return;
    }

    if (method === "POST" && url.includes("/diagnostics/health-parameters")) {
      await fulfillJson(route, {
        ...PARAMETER_ROWS[0],
        test_id: 199,
        test_name: "New Parameter",
      });
      return;
    }

    if (method === "PUT" && /\/diagnostics\/health-parameters\/\d+/.test(url)) {
      const id = Number(url.match(/\/health-parameters\/(\d+)/)?.[1]);
      const existing = PARAMETER_ROWS.find((row) => row.test_id === id) ?? PARAMETER_ROWS[0];
      await fulfillJson(route, { ...existing });
      return;
    }

    if (method === "DELETE" && /\/diagnostics\/health-parameters\/\d+/.test(url)) {
      const id = Number(url.match(/\/health-parameters\/(\d+)/)?.[1]);
      await fulfillJson(route, { deleted: true, test_id: id });
      return;
    }

    if (method === "PATCH" && url.includes("/diagnostics/health-parameters/order")) {
      await fulfillJson(route, { reordered: true });
      return;
    }

    if (url.includes("/api/") || url.includes(":8000/")) {
      await fulfillJson(route, {});
      return;
    }

    await route.continue();
  });
}

export async function prepareDiagnosticParametersList(page: Page) {
  await seedAdminSession(page);
  await mockDiagnosticParametersListApis(page);
}

export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await prepareDiagnosticParametersList(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
