import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const PACKAGE_ID = 7;

const PACKAGE_DETAIL = {
  diagnostic_package_id: PACKAGE_ID,
  package_name: "Supershyft Core+",
  package_image: null,
  diagnostic_provider: "Healthians",
  external_package_code: "13150",
  no_of_tests: 71,
  report_duration_hours: null,
  collection_type: "home_collection",
  price: 1999,
  original_price: 2499,
  min_price: null,
  is_most_popular: true,
  is_default_for_group: true,
  complementary_consultation: { nutritionist: true },
  gender_suitability: "both",
  package_for: "public",
  status: "active",
  package_group_id: 501,
  same_packages: [
    {
      diagnostic_package_id: 8,
      diagnostic_provider: "orange_health",
      package_name: "Supershyft Core+",
      price: 2099,
      status: "active",
      is_default_for_group: false,
    },
  ],
  health_areas_covered: "Bio Age, Kidney, Heart",
  about_text: "A comprehensive full-body diagnostic package.",
  bookings_count: 57,
  reasons: [],
  samples: [],
  preparations: [],
  tags: [],
  filter_chips: [],
};

const EXPERT_TYPES = [
  { id: 1, type_key: "doctor", type: "Doctor", is_active: true },
  { id: 2, type_key: "nutritionist", type: "Nutritionist", is_active: true },
  { id: 3, type_key: "eye", type: "Eye", is_active: true },
];

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

export async function mockDiagnosticPackageEditFormApis(page: Page) {
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

    if (method === "GET" && url.includes("/expert-types")) {
      await fulfillJson(route, EXPERT_TYPES);
      return;
    }

    if (method === "GET" && /\/diagnostic-packages\/\d+(\?|$)/.test(url)) {
      await fulfillJson(route, PACKAGE_DETAIL);
      return;
    }

    if (method === "GET" && /\/diagnostic-packages\/\d+\/tests/.test(url)) {
      await fulfillJson(route, { groups: [] });
      return;
    }

    if (method === "PUT" && /\/diagnostic-packages\/\d+/.test(url)) {
      await fulfillJson(route, { diagnostic_package_id: PACKAGE_ID });
      return;
    }

    if (url.includes("/api/") || url.includes(":8000/")) {
      await fulfillJson(route, {});
      return;
    }

    await route.continue();
  });
}

export async function prepareDiagnosticPackageEditForm(page: Page) {
  await seedAdminSession(page);
  await mockDiagnosticPackageEditFormApis(page);
}

export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await prepareDiagnosticPackageEditForm(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
