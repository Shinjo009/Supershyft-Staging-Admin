import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const PACKAGE_ID = 13150;

type Reason = {
  reason_id: number;
  diagnostic_package_id: number;
  display_order: number;
  reason_text: string;
};

type Tag = {
  tag_id: number;
  diagnostic_package_id: number;
  tag_name: string;
  display_order: number;
};

type FilterChip = {
  filter_chip_id: number;
  chip_key: string;
  display_name: string;
  display_order: number;
};

const FILTER_CHIP_CATALOG: FilterChip[] = [
  { filter_chip_id: 101, chip_key: "popular", display_name: "Popular", display_order: 1 },
  { filter_chip_id: 102, chip_key: "new", display_name: "New", display_order: 2 },
  { filter_chip_id: 103, chip_key: "value", display_name: "Best value", display_order: 3 },
];

function clonePackageDetail() {
  return {
    diagnostic_package_id: PACKAGE_ID,
    package_name: "Supershyft Core+",
    package_image: null,
    diagnostic_provider: "healthians",
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
    package_for: "public" as const,
    status: "active",
    package_group_id: 501,
    same_packages: [
      {
        diagnostic_package_id: 13151,
        diagnostic_provider: "orange_health",
        package_name: "Supershyft Core+",
        price: 2099,
        status: "active",
        is_default_for_group: false,
      },
    ],
    health_areas_covered:
      "Bio Age, Kidney, Metabolism, Heart, Thyroid, Liver, Diabetes, Haematology, Iron, Vitamins",
    about_text:
      "A comprehensive full-body diagnostic package covering metabolic, cardiac, thyroid, liver, kidney, and vitamin panels for proactive health tracking. Designed for adults who want actionable insights from a single home collection visit with clear reporting turnaround.",
    bookings_count: 57,
    reasons: [
      {
        reason_id: 1,
        diagnostic_package_id: PACKAGE_ID,
        display_order: 1,
        reason_text: "Full-body coverage in one visit",
      },
      {
        reason_id: 2,
        diagnostic_package_id: PACKAGE_ID,
        display_order: 2,
        reason_text: "Home collection available",
      },
      {
        reason_id: 3,
        diagnostic_package_id: PACKAGE_ID,
        display_order: 3,
        reason_text: "Includes nutritionist consultation",
      },
      {
        reason_id: 4,
        diagnostic_package_id: PACKAGE_ID,
        display_order: 4,
        reason_text: "Tracks metabolic and cardiac risk",
      },
      {
        reason_id: 5,
        diagnostic_package_id: PACKAGE_ID,
        display_order: 5,
        reason_text: "Clear digital report experience",
      },
    ] as Reason[],
    samples: [],
    preparations: [],
    tags: [
      { tag_id: 11, diagnostic_package_id: PACKAGE_ID, tag_name: "Bio Age", display_order: 1 },
      { tag_id: 12, diagnostic_package_id: PACKAGE_ID, tag_name: "Vitamins", display_order: 2 },
      { tag_id: 13, diagnostic_package_id: PACKAGE_ID, tag_name: "Metabolism", display_order: 3 },
      { tag_id: 14, diagnostic_package_id: PACKAGE_ID, tag_name: "Haematology", display_order: 4 },
    ] as Tag[],
    filter_chips: [
      {
        filter_chip_id: 101,
        chip_key: "popular",
        display_name: "Popular",
        display_order: 1,
      },
    ] as FilterChip[],
  };
}

export type DiagnosticOverviewCounters = {
  getDetailCalls: () => number;
  getAddReasonCalls: () => number;
  getAddTagCalls: () => number;
  getAddFilterChipCalls: () => number;
  getDeleteTagCalls: () => number;
  getDeleteFilterChipCalls: () => number;
};

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ data, meta: {} }),
  });
}

export async function mockDiagnosticPackageOverviewApis(
  page: Page
): Promise<DiagnosticOverviewCounters> {
  let detail = clonePackageDetail();
  let nextReasonId = 100;
  let nextTagId = 200;
  let detailCalls = 0;
  let addReasonCalls = 0;
  let addTagCalls = 0;
  let addFilterChipCalls = 0;
  let deleteTagCalls = 0;
  let deleteFilterChipCalls = 0;

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

    if (url.includes("/diagnostic-packages/filters-chips")) {
      await fulfillJson(route, FILTER_CHIP_CATALOG);
      return;
    }

    const packageMatch = url.match(/\/diagnostic-packages\/(\d+)(?:\/([^?#]*))?/);
    if (packageMatch) {
      const packageId = Number(packageMatch[1]);
      const resource = (packageMatch[2] ?? "").replace(/\/$/, "");

      if (packageId !== PACKAGE_ID && packageId !== 13151) {
        await fulfillJson(route, {});
        return;
      }

      if (method === "GET" && resource === "") {
        detailCalls += 1;
        await fulfillJson(route, detail);
        return;
      }

      if (method === "GET" && resource === "tests") {
        await fulfillJson(route, { groups: [] });
        return;
      }

      if (method === "GET" && resource === "provider-test-diff") {
        await fulfillJson(route, {
          status: "in_sync",
          counts: { matched: 0, missing_in_product: 0, extra_in_product: 0 },
          missing_in_product: [],
          extra_in_product: [],
        });
        return;
      }

      if (method === "PATCH" && resource === "status") {
        const body = request.postDataJSON() as { status?: string };
        detail = { ...detail, status: body.status ?? detail.status };
        await fulfillJson(route, {
          diagnostic_package_id: PACKAGE_ID,
          status: detail.status,
        });
        return;
      }

      if (method === "POST" && resource === "reasons") {
        addReasonCalls += 1;
        const body = request.postDataJSON() as {
          reason_text?: string;
          display_order?: number;
        };
        const reason: Reason = {
          reason_id: nextReasonId++,
          diagnostic_package_id: PACKAGE_ID,
          display_order: body.display_order ?? detail.reasons.length + 1,
          reason_text: body.reason_text?.trim() || "New reason",
        };
        detail = { ...detail, reasons: [...detail.reasons, reason] };
        await fulfillJson(route, reason);
        return;
      }

      if (method === "PUT" && /^reasons\/\d+$/.test(resource)) {
        const reasonId = Number(resource.split("/")[1]);
        const body = request.postDataJSON() as { reason_text?: string };
        detail = {
          ...detail,
          reasons: detail.reasons.map((reason) =>
            reason.reason_id === reasonId
              ? { ...reason, reason_text: body.reason_text?.trim() || reason.reason_text }
              : reason
          ),
        };
        const updated = detail.reasons.find((reason) => reason.reason_id === reasonId);
        await fulfillJson(route, updated ?? {});
        return;
      }

      if (method === "PATCH" && resource === "reasons/order") {
        const body = request.postDataJSON() as { reason_ids?: number[] };
        const order = body.reason_ids ?? [];
        detail = {
          ...detail,
          reasons: order
            .map((id, index) => {
              const reason = detail.reasons.find((row) => row.reason_id === id);
              return reason ? { ...reason, display_order: index + 1 } : null;
            })
            .filter((row): row is Reason => Boolean(row)),
        };
        await fulfillJson(route, { reordered: true });
        return;
      }

      if (method === "DELETE" && /^reasons\/\d+$/.test(resource)) {
        const reasonId = Number(resource.split("/")[1]);
        detail = {
          ...detail,
          reasons: detail.reasons.filter((reason) => reason.reason_id !== reasonId),
        };
        await fulfillJson(route, { reason_id: reasonId, deleted: true });
        return;
      }

      if (method === "POST" && resource === "tags") {
        addTagCalls += 1;
        const body = request.postDataJSON() as { tag_name?: string; display_order?: number };
        const tag: Tag = {
          tag_id: nextTagId++,
          diagnostic_package_id: PACKAGE_ID,
          tag_name: body.tag_name?.trim() || "New tag",
          display_order: body.display_order ?? detail.tags.length + 1,
        };
        detail = { ...detail, tags: [...detail.tags, tag] };
        await fulfillJson(route, tag);
        return;
      }

      if (method === "DELETE" && /^tags\/\d+$/.test(resource)) {
        deleteTagCalls += 1;
        const tagId = Number(resource.split("/")[1]);
        detail = {
          ...detail,
          tags: detail.tags.filter((tag) => tag.tag_id !== tagId),
        };
        await fulfillJson(route, { tag_id: tagId, deleted: true });
        return;
      }

      if (method === "POST" && resource === "filter-chips") {
        addFilterChipCalls += 1;
        const body = request.postDataJSON() as { filter_chip_id?: number };
        const chip =
          FILTER_CHIP_CATALOG.find((row) => row.filter_chip_id === body.filter_chip_id) ??
          FILTER_CHIP_CATALOG[0];
        if (!detail.filter_chips.some((row) => row.filter_chip_id === chip.filter_chip_id)) {
          detail = {
            ...detail,
            filter_chips: [...detail.filter_chips, { ...chip }],
          };
        }
        await fulfillJson(route, chip);
        return;
      }

      if (method === "DELETE" && /^filter-chips\/\d+$/.test(resource)) {
        deleteFilterChipCalls += 1;
        const chipId = Number(resource.split("/")[1]);
        detail = {
          ...detail,
          filter_chips: detail.filter_chips.filter((chip) => chip.filter_chip_id !== chipId),
        };
        await fulfillJson(route, { filter_chip_id: chipId, deleted: true });
        return;
      }
    }

    if (url.includes("/api/") || url.includes(":8000/")) {
      await fulfillJson(route, {});
      return;
    }

    await route.continue();
  });

  return {
    getDetailCalls: () => detailCalls,
    getAddReasonCalls: () => addReasonCalls,
    getAddTagCalls: () => addTagCalls,
    getAddFilterChipCalls: () => addFilterChipCalls,
    getDeleteTagCalls: () => deleteTagCalls,
    getDeleteFilterChipCalls: () => deleteFilterChipCalls,
  };
}

export async function prepareDiagnosticPackageOverview(page: Page) {
  await seedAdminSession(page);
  return mockDiagnosticPackageOverviewApis(page);
}

export const test = base.extend<{ counters: DiagnosticOverviewCounters }>({
  counters: [
    async ({ page }, use) => {
      const counters = await prepareDiagnosticPackageOverview(page);
      await use(counters);
    },
    { auto: true },
  ],
});

export { expect };
