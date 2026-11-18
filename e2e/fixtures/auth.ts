import { test as base, expect, type Page, type Route } from "@playwright/test";

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
  getTestsCalls: () => number;
  getQuestionnaireCalls: () => number;
  getBloodReportCalls: () => number;
  getBioaiReportCalls: () => number;
  getConsultationDoneCalls: () => number;
  getOpenEngagementCalls: () => number;
  getTicketsCalls: () => number;
  getUpcomingCollectionsCalls: () => number;
  getOverdueCollectionsCalls: () => number;
  getQuestionnairePendingCalls: () => number;
  getBloodReportsPendingCalls: () => number;
  getBioaiPendingCalls: () => number;
  getConsultationPendingCalls: () => number;
  getB2bSummaryCalls: () => number;
  getB2bEngagementsCalls: () => number;
};

const JOURNEY_DETAIL_ROW = {
  user_id: 1,
  person: { name: "Ada Lovelace", phone: "9999999999" },
  type: "B2C",
  engagement: "Camp Alpha",
  package: "Full Body",
  collection: "2026-11-20 09:00:00",
  blood_collection: "done",
  questionnaire: "completed",
  lab_report: "pending",
  bio_ai: "pending",
  consult: "Not Booked",
};

export async function mockCommandApis(page: Page): Promise<ApiCounters> {
  let serverCalls = 0;
  let notifCalls = 0;
  let peopleCalls = 0;
  let testsCalls = 0;
  let questionnaireCalls = 0;
  let bloodReportCalls = 0;
  let bioaiReportCalls = 0;
  let consultationDoneCalls = 0;
  let openEngagementCalls = 0;
  let ticketsCalls = 0;
  let upcomingCollectionsCalls = 0;
  let overdueCollectionsCalls = 0;
  let questionnairePendingCalls = 0;
  let bloodReportsPendingCalls = 0;
  let bioaiPendingCalls = 0;
  let consultationPendingCalls = 0;
  let b2bSummaryCalls = 0;
  let b2bEngagementsCalls = 0;

  const fulfillAudience = async (route: Route, total: number, includeRows: boolean) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: includeRows ? [JOURNEY_DETAIL_ROW] : [],
        meta: {
          period: "this_week",
          page: 1,
          limit: includeRows ? 20 : 1,
          total,
          b2b: Math.floor(total / 2),
          b2c: total - Math.floor(total / 2),
        },
      }),
    });
  };

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
          data: includeRows ? [{ ...JOURNEY_DETAIL_ROW, blood_collection: "pending" }] : [],
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

    if (url.includes("/admin/dashboard/command/tests-completed")) {
      testsCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows ? [JOURNEY_DETAIL_ROW] : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            total: 63,
            b2b: 46,
            b2c: 17,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/questionnaire-done")) {
      questionnaireCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows ? [JOURNEY_DETAIL_ROW] : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            total: 87,
            b2b: 57,
            b2c: 30,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/blood-report-generated")) {
      bloodReportCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows
            ? [{ ...JOURNEY_DETAIL_ROW, lab_report: "loaded" }]
            : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            total: 28,
            b2b: 19,
            b2c: 9,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/bioai-report-generated")) {
      bioaiReportCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows
            ? [{ ...JOURNEY_DETAIL_ROW, bio_ai: "loaded" }]
            : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            total: 21,
            b2b: 14,
            b2c: 7,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/consultation-done")) {
      consultationDoneCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows
            ? [{ ...JOURNEY_DETAIL_ROW, consult: "Attended" }]
            : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            total: 15,
            b2b: 10,
            b2c: 5,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/open-engagements")) {
      openEngagementCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows
            ? [
                {
                  engagement_id: 201,
                  engagement_code: "ENG-OPEN-201",
                  engagement_name: "Open Camp Alpha",
                  type: "B2B",
                  city: "Bengaluru",
                  package: "Full Body",
                  start_date: "2026-11-10",
                  end_date: "2026-11-20",
                },
              ]
            : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            total: 8,
            b2b: 5,
            b2c: 3,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/tickets")) {
      ticketsCalls += 1;
      const parsed = new URL(url);
      const includeRows = parsed.searchParams.get("include_rows") !== "false";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: includeRows
            ? [
                {
                  ticket_id: 501,
                  raised_by: { name: "Ada Lovelace", phone: "9999999999" },
                  contact: "9999999999",
                  query: "Need help with booking",
                  raised_at: "2026-11-15T10:00:00+00:00",
                  status: "open",
                },
              ]
            : [],
          meta: {
            period: "this_week",
            page: 1,
            limit: includeRows ? 20 : 1,
            open: 4,
            solved: 11,
            total: 15,
          },
        }),
      });
      return;
    }

    if (url.includes("/admin/dashboard/command/upcoming-collections")) {
      upcomingCollectionsCalls += 1;
      const includeRows = new URL(url).searchParams.get("include_rows") !== "false";
      await fulfillAudience(route, 11, includeRows);
      return;
    }

    if (url.includes("/admin/dashboard/command/overdue-collections")) {
      overdueCollectionsCalls += 1;
      const includeRows = new URL(url).searchParams.get("include_rows") !== "false";
      await fulfillAudience(route, 7, includeRows);
      return;
    }

    if (url.includes("/admin/dashboard/command/questionnaire-pending")) {
      questionnairePendingCalls += 1;
      const includeRows = new URL(url).searchParams.get("include_rows") !== "false";
      await fulfillAudience(route, 14, includeRows);
      return;
    }

    if (url.includes("/admin/dashboard/command/blood-reports-pending")) {
      bloodReportsPendingCalls += 1;
      const includeRows = new URL(url).searchParams.get("include_rows") !== "false";
      await fulfillAudience(route, 9, includeRows);
      return;
    }

    if (url.includes("/admin/dashboard/command/bioai-pending")) {
      bioaiPendingCalls += 1;
      const includeRows = new URL(url).searchParams.get("include_rows") !== "false";
      await fulfillAudience(route, 6, includeRows);
      return;
    }

    if (url.includes("/admin/dashboard/command/consultation-pending")) {
      consultationPendingCalls += 1;
      const includeRows = new URL(url).searchParams.get("include_rows") !== "false";
      await fulfillAudience(route, 4, includeRows);
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
    getTestsCalls: () => testsCalls,
    getQuestionnaireCalls: () => questionnaireCalls,
    getBloodReportCalls: () => bloodReportCalls,
    getBioaiReportCalls: () => bioaiReportCalls,
    getConsultationDoneCalls: () => consultationDoneCalls,
    getOpenEngagementCalls: () => openEngagementCalls,
    getTicketsCalls: () => ticketsCalls,
    getUpcomingCollectionsCalls: () => upcomingCollectionsCalls,
    getOverdueCollectionsCalls: () => overdueCollectionsCalls,
    getQuestionnairePendingCalls: () => questionnairePendingCalls,
    getBloodReportsPendingCalls: () => bloodReportsPendingCalls,
    getBioaiPendingCalls: () => bioaiPendingCalls,
    getConsultationPendingCalls: () => consultationPendingCalls,
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
