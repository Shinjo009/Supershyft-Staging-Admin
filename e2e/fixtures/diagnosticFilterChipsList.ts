import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const PUBLIC_CHIPS = [
  {
    filter_chip_id: 1,
    chip_key: "for_you",
    display_name: "For You",
    display_order: 1,
    chip_for: "public_package",
    status: "active",
  },
  {
    filter_chip_id: 2,
    chip_key: "popular",
    display_name: "Popular",
    display_order: 2,
    chip_for: "public_package",
    status: "active",
  },
  {
    filter_chip_id: 3,
    chip_key: "cancer",
    display_name: "Cancer Risk",
    display_order: 3,
    chip_for: "public_package",
    status: "active",
  },
];

export const CUSTOM_CHIPS = [
  {
    filter_chip_id: 11,
    chip_key: "camp_focus",
    display_name: "Camp Focus",
    display_order: 1,
    chip_for: "custom_package",
    status: "active",
  },
  {
    filter_chip_id: 12,
    chip_key: "vip",
    display_name: "VIP",
    display_order: 2,
    chip_for: "custom_package",
    status: "inactive",
  },
];

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

function chipsForUrl(url: string) {
  const parsed = new URL(url);
  const scope = parsed.searchParams.get("for") ?? "public_package";
  return scope === "custom_package" ? CUSTOM_CHIPS : PUBLIC_CHIPS;
}

export async function mockDiagnosticFilterChipsListApis(page: Page) {
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

    if (method === "GET" && url.includes("/diagnostic-packages/filters-chips")) {
      const rows = chipsForUrl(url);
      await fulfillJson(route, rows, {
        page: 1,
        limit: 10,
        total: rows.length,
      });
      return;
    }

    if (method === "POST" && url.includes("/diagnostic-packages/filters-chips")) {
      await fulfillJson(route, {
        filter_chip_id: 99,
        chip_key: "new_chip",
        display_name: "New Chip",
        display_order: 99,
        chip_for: "public_package",
        status: "active",
      });
      return;
    }

    if (method === "PUT" && /\/diagnostic-packages\/filters-chips\/\d+/.test(url)) {
      const id = Number(url.match(/\/filters-chips\/(\d+)/)?.[1]);
      const existing =
        PUBLIC_CHIPS.find((chip) => chip.filter_chip_id === id) ??
        CUSTOM_CHIPS.find((chip) => chip.filter_chip_id === id) ??
        PUBLIC_CHIPS[0];
      await fulfillJson(route, { ...existing });
      return;
    }

    if (method === "DELETE" && /\/diagnostic-packages\/filters-chips\/\d+/.test(url)) {
      const id = Number(url.match(/\/filters-chips\/(\d+)/)?.[1]);
      await fulfillJson(route, { filter_chip_id: id, deleted: true });
      return;
    }

    if (method === "PATCH" && url.includes("/diagnostic-packages/filters-chips/order")) {
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

export async function prepareDiagnosticFilterChipsList(page: Page) {
  await seedAdminSession(page);
  await mockDiagnosticFilterChipsListApis(page);
}

export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await prepareDiagnosticFilterChipsList(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
