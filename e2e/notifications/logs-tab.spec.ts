import { test as base, expect, type Page } from "@playwright/test";
import { seedAdminSession } from "../fixtures/auth";

async function mockNotificationLogsApis(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (url.includes("/employees/auth/me") || url.includes("/employees/auth/refresh-token")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: url.includes("refresh-token")
            ? {
                tokens: {
                  access_token: "e2e-access-token",
                  refresh_token: "e2e-refresh-token",
                },
              }
            : {
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

    if (url.includes("/notifications/services")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              notification_service_id: 1,
              service_key: "bioai_ready",
              display_name: "Bio AI Ready",
              channel: "whatsapp",
              status: "active",
            },
          ],
          meta: { page: 1, limit: 100, total: 1 },
        }),
      });
      return;
    }

    if (url.includes("/users") && !url.includes("/users/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              user_id: 42,
              first_name: "Ada",
              last_name: "Lovelace",
              phone: "9999999999",
              email: "ada@example.com",
            },
          ],
          meta: { page: 1, limit: 20, total: 1 },
        }),
      });
      return;
    }

    if (url.includes("/notifications") && !url.includes("/notifications/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              notification_id: 101,
              service_key: "bioai_ready",
              service_display_name: "Bio AI Ready",
              channel: "whatsapp",
              status: "sent",
              recipients: [{ name: "Ada Lovelace", phone: "******9999" }],
              engagement_name: "Camp Alpha",
              message: "Your Bio AI is ready",
              queue_name: "default",
              event_code: "bioai.ready",
              dispatched_at: "2026-11-27T10:00:00+00:00",
              completed_at: "2026-11-27T10:00:05+00:00",
            },
          ],
          meta: { page: 1, limit: 20, total: 1 },
        }),
      });
      return;
    }

    if (url.includes("/api/") || url.includes(":8000/")) {
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

base.describe("Notification logs tab (mocked API)", () => {
  base.beforeEach(async ({ page }) => {
    await mockNotificationLogsApis(page);
    await seedAdminSession(page);
    await page.goto("/notifications/logs");
    await expect(page).toHaveURL(/\/notifications\/logs/);
  });

  base("defaults date range to 1h and uses user search combobox", async ({ page }) => {
    const search = page.getByRole("combobox", { name: /search by name, phone, or email/i });
    await expect(search).toBeVisible();

    const allStatus = page.getByRole("button", { name: "All" }).first();
    await expect(allStatus).toBeVisible();

    const searchBox = await search.boundingBox();
    const allBox = await allStatus.boundingBox();
    expect(searchBox).toBeTruthy();
    expect(allBox).toBeTruthy();
    if (searchBox && allBox) {
      expect(searchBox.x).toBeLessThan(allBox.x);
    }

    await expect(page.getByLabel("Date range")).toHaveValue("1h");
    await expect(page.getByLabel("Service", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Channel", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Engagement")).toBeVisible();

    await expect(page.getByRole("columnheader", { name: /ID/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Service$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Channel$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Status$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Recipient$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Engagement$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^Message$/i })).toBeVisible();

    await expect(page.getByRole("columnheader", { name: /^Queue$/i })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: /^Event$/i })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: /^Dispatched$/i })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: /^Completed$/i })).toHaveCount(0);
  });

  base("shows Logs / Services / Event Rules tabs without Events", async ({ page }) => {
    const tabBar = page.locator("div.flex.gap-1.mb-5.border-b.border-zinc-200");
    await expect(tabBar.getByRole("button", { name: "Logs", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Services", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Event Rules", exact: true })).toBeVisible();
    await expect(tabBar.getByRole("button", { name: "Events", exact: true })).toHaveCount(0);
  });
});
