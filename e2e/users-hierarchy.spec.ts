import { test as base, expect, type Page } from "@playwright/test";
import { seedAdminSession } from "./fixtures/auth";

function isEmployeeUsersListUrl(url: string, method: string): boolean {
  if (method !== "GET") return false;
  try {
    const path = new URL(url).pathname;
    return path === "/api/users";
  } catch {
    return false;
  }
}

async function mockUsersListApi(page: Page) {
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

    if (
      isEmployeeUsersListUrl(url, method) &&
      !url.includes("participant-journey") &&
      !url.includes("dashboard/command")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              user_id: 100,
              first_name: "Mia",
              last_name: "Brooks",
              phone: "******7254",
              email: "m***@example.com",
              status: "active",
              is_participant: true,
              parent_id: null,
              relationship: "self",
              sub_account_count: 2,
              matched_sub_ids: [201],
              sub_accounts: [
                {
                  user_id: 201,
                  first_name: "Leo",
                  last_name: "Brooks",
                  phone: "******1122",
                  email: "l***@example.com",
                  status: "active",
                  is_participant: false,
                  parent_id: 100,
                  relationship: "child",
                },
                {
                  user_id: 202,
                  first_name: "Ava",
                  last_name: "Brooks",
                  phone: "******3344",
                  email: "a***@example.com",
                  status: "inactive",
                  is_participant: false,
                  parent_id: 100,
                  relationship: "child",
                },
              ],
            },
          ],
          meta: {
            page: 1,
            limit: 10,
            total: 1,
            total_profiles: 42,
            with_metsights_profile: 3,
            total_participants: 5,
            protected_user_ids: [],
          },
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

base.describe("Users page hierarchy (mocked API)", () => {
  base.beforeEach(async ({ page }) => {
    await seedAdminSession(page);
    await mockUsersListApi(page);
  });

  base("lists primary with badge and auto-expands matched sub-account", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText("Mia Brooks")).toBeVisible();
    await expect(page.getByText("2 Subaccounts")).toBeVisible();
    await expect(page.getByText("Leo Brooks")).toBeVisible();
    await expect(page.getByText("Sub-account").first()).toBeVisible();
  });

  base("expands and collapses sub-accounts via chevron", async ({ page }) => {
    await page.goto("/users");
    const toggle = page.getByRole("button", { name: "Collapse sub-accounts" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByText("Leo Brooks")).not.toBeVisible();
    await page.getByRole("button", { name: "Expand sub-accounts" }).click();
    await expect(page.getByText("Leo Brooks")).toBeVisible();
  });
});