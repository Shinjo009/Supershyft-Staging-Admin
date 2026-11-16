import { test as base, expect, type Page } from "@playwright/test";

export const ADMIN_PROFILE = {
  authKind: "employee",
  name: "E2E Admin",
  role: "admin",
  employeeId: 9001,
  partnerId: null,
  permissions: null,
  pendingTaskCount: 0,
};

export async function seedAdminSession(page: Page) {
  await page.addInitScript((profile) => {
    localStorage.setItem("access_token", "e2e-access-token");
    localStorage.setItem("refresh_token", "e2e-refresh-token");
    localStorage.setItem("auth_kind", "employee");
    localStorage.setItem("auth_profile", JSON.stringify(profile));
  }, ADMIN_PROFILE);
}

export type ApiCounters = {
  getServerCalls: () => number;
  getNotifCalls: () => number;
  getPeopleCalls: () => number;
  getB2bSummaryCalls: () => number;
  getB2bEngagementsCalls: () => number;
};

export async function mockCommandApis(page: Page): Promise<ApiCounters> {
  let serverCalls = 0;
  let notifCalls = 0;
  let peopleCalls = 0;
  let b2bSummaryCalls = 0;
  let b2bEngagementsCalls = 0;

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

    if (url.includes("/server-health/current")) {
      serverCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            run: {
              id: 1,
              run_at: new Date().toISOString(),
              ok_count: 10,
              warn_count: 0,
              crit_count: 0,
              overall_status: "ok",
              cpu_pct: 22,
              mem_pct: 41,
              storage_pct: 55,
            },
            checks_by_category: [],
            latest_metrics: {
              hostname: "e2e",
              cpu_usage: 22,
              memory_usage: 41,
              storage_usage: 55,
              load_1m: 0.5,
              cores: 4,
              timestamp: new Date().toISOString(),
            },
            cpu_alert: null,
          },
          meta: {},
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/notification-health/failed")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              notification_id: 1,
              recipients: "Ada Lovelace",
              engagement: "Camp Alpha",
              channel: "whatsapp",
              message: "Delivery failed",
            },
          ],
          meta: { period: "this_week", page: 1, limit: 20, total: 1 },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/notification-health")) {
      notifCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { sent: 80, failed: 5, pending: 15, total: 100 },
          meta: { period: "this_week" },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/people-registered")) {
      peopleCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows
            ? [
                {
                  user_id: 1,
                  person: { name: "Ada Lovelace", phone: "9999999999" },
                  type: "B2C",
                  engagement: "Camp Alpha",
                  package: "Full Body",
                  collection: "2026-11-20 09:00:00",
                  blood_collection: "pending",
                  questionnaire: "completed",
                  lab_report: "pending",
                  bio_ai: "pending",
                  consult: "Not Booked",
                },
              ]
            : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            total: 42,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/b2b/summary")) {
      b2bSummaryCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { ongoing: 3, upcoming: 5, completed: 12 },
          meta: { period: "this_week" },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/b2b/engagements")) {
      b2bEngagementsCalls += 1;
      const parsed = new URL(url);
      const bucket = parsed.searchParams.get("bucket") || "ongoing";
      const statusByBucket: Record<string, string> = {
        ongoing: "running",
        upcoming: "scheduled",
        completed: "completed",
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              engagement_id: 101,
              engagement_code: "ENG-B2B-101",
              engagement_name: "Acme Wellness Camp",
              city: "Mumbai",
              start_date: "2026-11-10",
              end_date: "2026-11-14",
              status: statusByBucket[bucket] || "running",
              participant_count: 24,
            },
          ],
          meta: {
            period: "this_week",
            page: 1,
            limit: 20,
            total: 1,
            bucket,
          },
        }),
      });
      return;
    }

    if (url.includes("/engagements/by-code/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            engagement_id: 101,
            engagement_code: "ENG-B2B-101",
            engagement_name: "Acme Wellness Camp",
            city: "Mumbai",
            status: "running",
          },
          meta: {},
        }),
      });
      return;
    }

    // Intercept remaining API calls; let static assets continue.
    if (url.includes("/api/") || url.includes(":8000/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: {}, meta: {} }),
      });
      return;
    }

    await route.continue();
  });

  return {
    getServerCalls: () => serverCalls,
    getNotifCalls: () => notifCalls,
    getPeopleCalls: () => peopleCalls,
    getB2bSummaryCalls: () => b2bSummaryCalls,
    getB2bEngagementsCalls: () => b2bEngagementsCalls,
  };
}

export const test = base.extend<{ counters: ApiCounters }>({
  counters: [
    async ({ page }, use) => {
      await seedAdminSession(page);
      const counters = await mockCommandApis(page);
      await use(counters);
    },
    { auto: true },
  ],
});

export { expect };
