import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const DAY_A = "2026-11-17";
export const DAY_B = "2026-11-18";
export const CAMP_CODE = "ENG-CAMP-E2E";
export const HOME_CODE = "ENG-HOME-E2E";

const BASE_ENGAGEMENT = {
  engagement_id: 9101,
  engagement_name: "E2E Camp Engagement",
  engagement_code: CAMP_CODE,
  city: "Mumbai",
  status: "running",
  start_date: "2026-11-01",
  end_date: "2026-11-30",
  participant_count: 8,
  assessment_package_id: 1,
  diagnostic_package_id: 1,
  slot_duration: 20,
  engagement_type: "corporate_camp",
  consultation_mode: "offline",
};

function campEngagement() {
  return {
    ...BASE_ENGAGEMENT,
    organization_id: 42,
    camp_no: 7,
    blood_collection_type: "camp_collection",
    slot_detail: {
      blood_collection: {
        is_enable: true,
        [DAY_A]: { is_enable: true, cabins: [] },
        [DAY_B]: { is_enable: true, cabins: [] },
      },
      consultation: {
        is_enable: true,
        [DAY_A]: { is_enable: true, cabins: [] },
        [DAY_B]: { is_enable: true, cabins: [] },
      },
    },
  };
}

function homeEngagement() {
  return {
    ...BASE_ENGAGEMENT,
    engagement_id: 9102,
    engagement_code: HOME_CODE,
    engagement_name: "E2E Home Engagement",
    organization_id: 42,
    blood_collection_type: "home_collection",
    slot_detail: null,
  };
}

const PROGRESS = {
  total_registered: 8,
  blood_collected: 1,
  questionnaire_filled: 8,
  blood_report_sent: 0,
  bio_ai_report_sent: 0,
  consultation_done: 0,
};

const DAY_WISE = {
  blood_collection_dates: [DAY_A, DAY_B],
  consultation_dates: [DAY_A, DAY_B],
  blood_collection: {
    [DAY_A]: {
      expected_collection: 5,
      sample_collected: 1,
      questionnaire_completed: 2,
    },
    [DAY_B]: {
      expected_collection: 3,
      sample_collected: 0,
      questionnaire_completed: 0,
    },
  },
  consultation: {
    [DAY_A]: { consultation_want: 4, consultation_done: 1 },
    [DAY_B]: { consultation_want: 2, consultation_done: 0 },
  },
};

const BOOKING_SUMMARY = {
  today_expected_booking_count: 2,
  today_pending_booking_count: 1,
  today_booking_count: 1,
  total_booking_count: 4,
  completed_booking_count: 0,
  pending_booking_count: 3,
  cancelled_booking_count: 0,
  as_of_date: DAY_A,
};

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta: {} }),
  });
}

export async function mockEngagementOverviewApis(page: Page) {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

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

    if (url.includes("/engagements/by-code/")) {
      const code = decodeURIComponent(url.split("/engagements/by-code/")[1]?.split("?")[0] ?? "");
      if (code === HOME_CODE) {
        await fulfillJson(route, homeEngagement());
        return;
      }
      await fulfillJson(route, campEngagement());
      return;
    }

    if (url.includes("/engagements/form-bootstrap")) {
      await fulfillJson(route, {
        engagement_types: [
          { id: 1, code: "corporate_camp", display_name: "Corporate Camp", is_active: true },
        ],
        organizations: [{ organization_id: 42, name: "Acme Corp" }],
        assessment_packages: [],
        diagnostic_packages: [],
        notification_services: [],
        expert_types: [],
      });
      return;
    }

    if (url.includes("/engagement-types")) {
      await fulfillJson(route, [
        { id: 1, code: "corporate_camp", display_name: "Corporate Camp", is_active: true },
      ]);
      return;
    }

    if (/\/engagements\/\d+\/checklists/.test(url)) {
      await fulfillJson(route, []);
      return;
    }

    if (/\/engagements\/\d+\/data-completeness/.test(url)) {
      await fulfillJson(route, {
        summary: {
          total_participants: 8,
          with_booking_id: 4,
          blood_report: 1,
          blood_values: 1,
          bio_ai_report: 0,
          bio_ai_json: 0,
          fitprint_report: 0,
          fitprint_values: 0,
          questionnaire_filled: 8,
        },
        participants: [],
      });
      return;
    }

    if (/\/engagements\/\d+\/progress-report/.test(url)) {
      await fulfillJson(route, PROGRESS);
      return;
    }

    if (/\/engagements\/\d+\/day-wise-summary/.test(url)) {
      await fulfillJson(route, DAY_WISE);
      return;
    }

    if (/\/engagements\/\d+\/booking-summary/.test(url)) {
      await fulfillJson(route, BOOKING_SUMMARY);
      return;
    }

    if (url.includes("/api/") || url.includes(":8000/")) {
      await fulfillJson(route, {});
      return;
    }

    await route.continue();
  });
}

export async function prepareEngagementOverview(page: Page) {
  await seedAdminSession(page);
  await mockEngagementOverviewApis(page);
}

export const test = base;
export { expect };
