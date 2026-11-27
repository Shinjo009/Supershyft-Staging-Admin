import { test as base, expect, type Page } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";
import { seedAdminSession } from "../fixtures/auth";

const hasStagingPhone = Boolean(process.env.E2E_ADMIN_PHONE?.trim());

async function mockNotificationResolutionApi(page: Page) {
  let strict = true;

  await page.route("**/employees/auth/me**", async (route) => {
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
  });

  await page.route("**/platform-settings/notification-resolution**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { strict_engagement_notification_bindings: strict },
          meta: {},
        }),
      });
      return;
    }
    if (method === "PATCH") {
      const body = route.request().postDataJSON() as {
        strict_engagement_notification_bindings?: boolean;
      };
      strict = Boolean(body.strict_engagement_notification_bindings);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { strict_engagement_notification_bindings: strict },
          meta: {},
        }),
      });
      return;
    }
    await route.continue();
  });
}

base.describe("Settings notifications (mocked API)", () => {
  base.beforeEach(async ({ page }) => {
    await mockNotificationResolutionApi(page);
    await seedAdminSession(page);
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL(/\/settings\/notifications/);
    await expect(page.getByText("Loading notification settings")).toHaveCount(0);
  });

  base("shows notification resolution card without legacy sections", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Notification resolution" })).toBeVisible();
    await expect(
      page.getByText("Use only engagement-specific notifications", { exact: false })
    ).toBeVisible();
    await expect(page.getByText("Support alerts", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Engagement notification defaults", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Manage default bindings in Event Rules/i })).toBeVisible();
  });

  base("updates help copy when toggling strict mode", async ({ page }) => {
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeChecked();
    await expect(
      page.getByText(/only bindings on that engagement count/i)
    ).toBeVisible();

    await checkbox.uncheck();
    await expect(
      page.getByText(/uses default bindings from Event Rules/i)
    ).toBeVisible();
  });

  base("saves and persists notification resolution policy", async ({ page }) => {
    const checkbox = page.getByRole("checkbox");
    const save = page.getByRole("button", { name: "Save" });

    await expect(save).toBeDisabled();
    await checkbox.uncheck();
    await expect(save).toBeEnabled();

    await save.click();
    await expect(page.getByText("Saved notification resolution policy.")).toBeVisible();
    await expect(save).toBeDisabled();

    await page.reload();
    await expect(page.getByText("Loading notification settings")).toHaveCount(0);
    await expect(checkbox).not.toBeChecked();
  });

  base("discard reverts unsaved toggle changes", async ({ page }) => {
    const checkbox = page.getByRole("checkbox");
    await checkbox.uncheck();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(checkbox).toBeChecked();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  base("link opens Event Rules default bindings", async ({ page }) => {
    await page.getByRole("link", { name: /Manage default bindings in Event Rules/i }).click();
    await expect(page).toHaveURL(/\/notifications\/notifications/);
  });
});

base.describe("Settings notifications (staging smoke)", () => {
  base.skip(!hasStagingPhone, "Set E2E_ADMIN_PHONE for live staging smoke.");

  base.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL(/\/settings\/notifications/);
  });

  base("live: notification resolution toggle is present", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Notification resolution" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Support alerts", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Engagement notification defaults", { exact: true })).toHaveCount(0);
  });
});