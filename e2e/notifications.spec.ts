import { test, expect } from "@playwright/test";

const PHONE = "8762830757";
const OTP = "654321";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Phone number").fill(PHONE);
  await page.getByRole("button", { name: "Send OTP" }).click();
  await expect(page.getByLabel("Verification code")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Verification code").fill(OTP);
  await page.getByRole("button", { name: "Verify & Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
}

test.describe("notifications admin (Prompt 5)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("logs tab shows dispatch table", async ({ page }) => {
    await page.goto("/notifications/logs", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Logs", exact: true })).toBeVisible();
    await expect(page.getByText("Service").first()).toBeVisible();
    await expect(page.getByText("Status").first()).toBeVisible();
  });

  test("services add modal has template fields without webhook path", async ({ page }) => {
    await page.goto("/notifications/services", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add Service" }).click();
    await page.locator('select').first().selectOption("whatsapp");
    await expect(page.getByText("Template name")).toBeVisible();
    await expect(page.getByText("Webhook Path")).toHaveCount(0);
  });

  test("binding wizard step 1 to auth.otp.sent and step labels", async ({ page }) => {
    await page.route("**/notifications/whatsapp/templates*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            name: "camp17",
            language: "en",
            category: "UTILITY",
            status: "APPROVED",
            components: [{ type: "BODY", format: null, parameter_count: 2 }],
          },
          meta: {},
        }),
      });
    });

    await page.goto("/notifications/notifications/new", { waitUntil: "networkidle" });
    await expect(page.getByText("Choose event")).toBeVisible();
    await page.getByPlaceholder("Search events…").fill("auth.otp");
    await page.getByText("auth.otp.sent").first().click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Recipient")).toBeVisible();
    await page.getByRole("button", { name: "participant", exact: true }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Content")).toBeVisible();
  });

  test("engagement notifications step shows Set up notification", async ({ page }) => {
    await page.route("**/notification-events/catalog*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            groups: [
              {
                prefix: "auth",
                events: [
                  {
                    event_code: "auth.otp.sent",
                    display_name: "OTP sent",
                    trigger_description: "OTP",
                    recipient_types: ["participant"],
                    variable_bags: [],
                    extra_variables: [],
                    nested_under: null,
                    legacy_event_code: null,
                    legacy_service_keys: null,
                  },
                ],
              },
            ],
            shared_variable_bags: {},
            legacy_event_code_map: {},
          },
          meta: {},
        }),
      });
    });
    await page.route("**/notification-events/bindings*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: {} }),
      });
    });
    await page.goto("/engagements/new?step=notifications", { waitUntil: "networkidle" });
    await page.locator("select").first().selectOption({ index: 1 });
    await expect(page.getByText("Set up notification").first()).toBeVisible({ timeout: 30_000 });
  });
});
