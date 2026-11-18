import { test, expect, type Page } from "@playwright/test";
import { seedAdminSession } from "../fixtures/auth";

const ENGAGEMENT_CODE = "E2E001";
const ENGAGEMENT_ID = 9001;

const MOCK_NOTIFICATION_SETUP = {
  profile_key: "b2b_camp|paid_by_group",
  profile_label: "B2B camp · Paid by group",
  engagement_id: ENGAGEMENT_ID,
  applicable_event_count: 2,
  addable_events: [],
  events: [
    {
      event_code: "reports.bioai_ready",
      name: "BioAI report ready",
      is_applicable: true,
      is_extra: false,
      global_bindings: [],
      engagement_bindings: [
        {
          id: 10,
          engagement_id: ENGAGEMENT_ID,
          event_code: "reports.bioai_ready",
          recipient_type: "user",
          delivery_channel: "whatsapp",
          notification_services: [
            { service_key: "bioai-report-wa" },
            { service_key: "bioai-report-email" },
          ],
        },
      ],
    },
    {
      event_code: "users.onboarded",
      name: "User onboarded to engagement",
      is_applicable: true,
      is_extra: false,
      global_bindings: [],
      engagement_bindings: [
        {
          id: 11,
          engagement_id: ENGAGEMENT_ID,
          event_code: "users.onboarded",
          recipient_type: "user",
          delivery_channel: "whatsapp",
          notification_services: [{ service_key: "welcome-wa" }],
        },
      ],
    },
  ],
};

const MOCK_ENGAGEMENT = {
  engagement_id: ENGAGEMENT_ID,
  engagement_code: ENGAGEMENT_CODE,
  engagement_name: "E2E Notifications Engagement",
  engagement_type: "b2b_camp",
  payment_type: "paid_by_group",
  status: "active",
  organization_id: 1,
  blood_collection_type: "on_site",
  consultation_mode: "virtual",
  auto_booking: false,
  notifications: [],
};

async function mockEngagementNotificationApis(page: Page) {
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

    if (url.includes(`/engagements/by-code/${ENGAGEMENT_CODE}`) && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: MOCK_ENGAGEMENT, meta: {} }),
      });
      return;
    }

    if (url.includes("/engagements/form-bootstrap")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            organizations: [{ organization_id: 1, name: "Acme" }],
            assessment_packages: [],
            diagnostic_packages: [],
            notification_services: [
              { service_key: "bioai-report-wa", display_name: "BioAI Report", channel: "whatsapp" },
              { service_key: "bioai-report-email", display_name: "BioAI & Blood Report", channel: "email" },
              { service_key: "welcome-wa", display_name: "Welcome", channel: "whatsapp" },
            ],
          },
          meta: {},
        }),
      });
      return;
    }

    if (url.includes("/engagement-types")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [{ id: 1, code: "b2b_camp", display_name: "B2B Camp" }],
          meta: {},
        }),
      });
      return;
    }

    if (url.includes("/engagements/notification-setup")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: MOCK_NOTIFICATION_SETUP, meta: {} }),
      });
      return;
    }

    if (url.includes("/engagements") && url.includes("/checklists")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: {} }),
      });
      return;
    }

    if (url.includes("/notifications/services") && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: {} }),
      });
      return;
    }

    await route.continue();
  });
}

async function openNotificationsViewTab(page: Page) {
  await page.goto(`/engagements/${ENGAGEMENT_CODE}?tab=notifications`);
  await expect(page.getByTestId("engagement-notifications-events-list")).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Engagement notifications setup UI", () => {
  test.beforeEach(async ({ page }) => {
    await mockEngagementNotificationApis(page);
  });

  test("view tab uses plain summary and modal without actions", async ({ page }) => {
    await openNotificationsViewTab(page);

    await expect(page.getByText(/notifications triggered/i).first()).toBeVisible();
    await expect(page.getByText(/bindings/i)).toHaveCount(0);

    await page.getByText("BioAI report ready").click();
    await expect(page.getByTestId("engagement-event-notifications-modal")).toBeVisible();
    await expect(page.getByTestId("engagement-notification-trigger-row")).toHaveCount(2);
    await expect(page.getByTestId("engagement-notification-edit-row")).toHaveCount(0);
    await expect(page.getByTestId("engagement-notifications-events-list")).toBeVisible();
  });

  test("modal closes back to event list", async ({ page }) => {
    await openNotificationsViewTab(page);
    await page.getByText("BioAI report ready").click();
    await expect(page.getByTestId("engagement-event-notifications-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("engagement-event-notifications-modal")).toHaveCount(0);
  });

  test("edit step shows per-notification row actions", async ({ page }) => {
    await page.goto(`/engagements/${ENGAGEMENT_CODE}/edit?step=notifications`);
    await expect(page.getByTestId("engagement-notifications-events-list")).toBeVisible({
      timeout: 60_000,
    });
    await page.getByText("BioAI report ready").click();
    await expect(page.getByTestId("engagement-event-notifications-modal")).toBeVisible();
    await expect(page.getByTestId("engagement-notification-trigger-row")).toHaveCount(2);
    await expect(page.getByTestId("engagement-notification-edit-row")).toHaveCount(2);
    await expect(page.getByTestId("engagement-notification-delete-row")).toHaveCount(2);
    await expect(page.getByTestId("engagement-notification-add-binding")).toBeVisible();
  });
});