import type { Page, Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

export const ENGAGEMENT_TYPES = [
  { id: 1, code: "bio_ai", display_name: "BioAI", is_active: true },
  { id: 2, code: "blood_test", display_name: "Blood Test", is_active: true },
  { id: 3, code: "consultation", display_name: "Consultation", is_active: true },
  {
    id: 4,
    code: "blood_test_with_consultation",
    display_name: "Blood Test with Consultation",
    is_active: true,
  },
  {
    id: 5,
    code: "bio_ai_with_consultation",
    display_name: "BioAI with Consultation",
    is_active: true,
  },
  { id: 6, code: "vifc", display_name: "Aurae - Face Scan", is_active: true },
] as const;

const typeDefaults = (overrides: Record<string, unknown> = {}) => ({
  assessment_package_id: 1,
  diagnostic_package_id: 10,
  diagnostic_package_id_male: null,
  diagnostic_package_id_female: null,
  blood_collection_type: "home_collection",
  create_profile_on_metsights: true,
  enroll_for_fitprint_full: false,
  load_prev_assessment_questionnaires: false,
  load_prev_questionnaire_category_keys: null,
  slot_duration: 20,
  consultation_mode: "online",
  auto_booking: false,
  payment_type: "paid_by_patient",
  engagement_duration_days: 10,
  ...overrides,
});

function buildDefaultsByType() {
  const map: Record<string, ReturnType<typeof typeDefaults>> = {};
  for (const t of ENGAGEMENT_TYPES) {
    map[t.code] = typeDefaults(
      t.code === "vifc"
        ? {
            assessment_package_id: 4,
            diagnostic_package_id: null,
            blood_collection_type: null,
            consultation_mode: null,
            engagement_duration_days: 7,
          }
        : t.code === "consultation"
          ? {
              diagnostic_package_id: null,
              blood_collection_type: null,
              consultation_mode: "online",
            }
          : {}
    );
  }
  return map;
}

export type OnboardingSettingsMockState = {
  defaultEngagementTypeCode: string;
  defaultsByType: Record<string, ReturnType<typeof typeDefaults>>;
};

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

export async function mockOnboardingSettingsApi(page: Page): Promise<OnboardingSettingsMockState> {
  const state: OnboardingSettingsMockState = {
    defaultEngagementTypeCode: "bio_ai",
    defaultsByType: buildDefaultsByType(),
  };

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

    if (url.includes("/employees/auth/refresh-token")) {
      await fulfillJson(route, {
        employee_id: 9001,
        role: "admin",
        tokens: {
          access_token: "e2e-access-token",
          refresh_token: "e2e-refresh-token",
        },
      });
      return;
    }

    if (url.includes("/platform-settings/bootstrap")) {
      await fulfillJson(route, {
        b2c_onboarding: {
          defaults_by_engagement_type: state.defaultsByType,
          default_engagement_type_code: state.defaultEngagementTypeCode,
        },
        support_query_notification: {},
        geocoding_provider: { geocoding_provider: "nominatim" },
        notification_resolution: { strict_engagement_notification_bindings: true },
        engagement_types: ENGAGEMENT_TYPES,
      });
      return;
    }

    if (url.includes("/platform-settings/b2c-onboarding")) {
      if (method === "GET") {
        await fulfillJson(route, {
          defaults_by_engagement_type: state.defaultsByType,
          default_engagement_type_code: state.defaultEngagementTypeCode,
        });
        return;
      }
      if (method === "PATCH") {
        const body = request.postDataJSON() as {
          defaults_by_engagement_type?: Record<string, Record<string, unknown>>;
          default_engagement_type_code?: string;
        };
        if (body.default_engagement_type_code) {
          state.defaultEngagementTypeCode = body.default_engagement_type_code;
        }
        if (body.defaults_by_engagement_type) {
          for (const [code, entry] of Object.entries(body.defaults_by_engagement_type)) {
            state.defaultsByType[code] = {
              ...(state.defaultsByType[code] ?? typeDefaults()),
              ...entry,
            };
          }
        }
        await fulfillJson(route, {
          defaults_by_engagement_type: state.defaultsByType,
          default_engagement_type_code: state.defaultEngagementTypeCode,
        });
        return;
      }
    }

    if (url.includes("/assessment-packages")) {
      await fulfillJson(
        route,
        [
          {
            package_id: 1,
            package_code: "metsights_essentials",
            display_name: "MetSights Essentials",
            status: "active",
          },
          {
            package_id: 4,
            package_code: "aurae_face_scan",
            display_name: "Aurae Face Scan",
            status: "active",
          },
        ],
        { page: 1, limit: 100, total: 2 }
      );
      return;
    }

    if (url.includes("/diagnostic-packages/groups")) {
      await fulfillJson(route, [
        {
          diagnostic_package_id: 10,
          package_name: "Supershyft Core",
          diagnostic_provider: "healthians",
          gender_suitability: "unisex",
          package_group_id: 100,
          package_group: { healthians: 10 },
          no_of_tests: 2,
          status: "active",
        },
      ]);
      return;
    }

    if (url.includes("/engagements/form-bootstrap")) {
      await fulfillJson(route, {
        diagnostic_packages: [
          {
            diagnostic_package_id: 10,
            package_name: "Supershyft Core",
            diagnostic_provider: "healthians",
            gender_suitability: "unisex",
          },
        ],
      });
      return;
    }

    if (url.includes("/questionnaire/categories")) {
      await fulfillJson(
        route,
        [
          {
            category_id: 1,
            category_key: "lifestyle",
            display_name: "Lifestyle",
            category_of: "metsights",
            status: "active",
          },
          {
            category_id: 2,
            category_key: "habits",
            display_name: "Habits",
            category_of: "supershyft",
            status: "active",
          },
        ],
        { page: 1, limit: 100, total: 2 }
      );
      return;
    }

    // Prevent real backend 401 → refresh → logout redirects during e2e.
    if (url.includes("/api/") || url.includes(":8000/")) {
      await fulfillJson(route, {});
      return;
    }

    await route.continue();
  });

  return state;
}

export async function openOnboardingSettings(page: Page, type = "bio_ai") {
  await seedAdminSession(page);
  await mockOnboardingSettingsApi(page);
  await page.goto(`/settings/onboarding?type=${type}`);
  await page.getByRole("heading", { name: "Default journey type" }).waitFor({ state: "visible" });
  await page.getByRole("navigation", { name: "Journey types" }).waitFor({ state: "visible" });
}
