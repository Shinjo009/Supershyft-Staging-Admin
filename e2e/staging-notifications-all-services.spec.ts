import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const hints = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/notification-dispatch-hints.json"), "utf8"),
) as {
  defaults: Record<string, unknown>;
  skip_service_keys: string[];
  per_service: Record<string, Record<string, unknown>>;
};

const ADMIN_BASE = process.env.STAGING_ADMIN_URL ?? "https://staging-admin.supershyft.com";
const API_BASE = process.env.STAGING_API_URL ?? "https://staging-api.supershyft.com";
const PHONE = process.env.STAGING_EMPLOYEE_PHONE ?? "8762830757";
const OTP = process.env.STAGING_BYPASS_OTP ?? "654321";

type NotificationService = {
  service_key: string;
  channel: string;
  is_active: boolean;
  template_name?: string | null;
  template_variables?: unknown;
};

async function employeeLogin(page: import("@playwright/test").Page) {
  await page.goto(`${ADMIN_BASE}/login`);
  const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first();
  await phoneInput.fill(PHONE);
  await page.getByRole("button", { name: /send|continue|get otp|sign in/i }).first().click();
  const otpInput = page.locator('input[name="otp"], input[placeholder*="otp" i], input[inputmode="numeric"]').first();
  await otpInput.waitFor({ state: "visible", timeout: 20000 });
  await otpInput.fill(OTP);
  await page.getByRole("button", { name: /verify|submit|continue|sign in/i }).first().click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
}

async function accessToken(page: import("@playwright/test").Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  if (!token) throw new Error("Missing access_token after login");
  return token;
}

test.describe.configure({ mode: "serial" });

test.describe("Staging notifications — all active services", () => {
  let token = "";
  let testUserId = 0;
  const failures: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await employeeLogin(page);
    token = await accessToken(page);
    const usersRes = await page.request.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { phone: PHONE, limit: 5 },
    });
    expect(usersRes.ok()).toBeTruthy();
    const usersBody = await usersRes.json();
    const users = usersBody.data as { user_id: number; phone?: string }[];
    const match = users.find((u) => (u.phone || "").includes(PHONE)) ?? users[0];
    if (!match?.user_id) {
      throw new Error(`No user found for test phone ${PHONE}`);
    }
    testUserId = match.user_id;
    await page.close();
  });

  test("dispatch each active notification service to test user", async ({ page }) => {
    await employeeLogin(page);
    token = await accessToken(page);

    const servicesRes = await page.request.get(`${API_BASE}/notifications/services`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(servicesRes.ok()).toBeTruthy();
    const servicesPayload = await servicesRes.json();
    const services = (servicesPayload.data ?? servicesPayload) as NotificationService[];
    const skip = new Set(hints.skip_service_keys as string[]);
    const active = services.filter((s) => s.is_active && !skip.has(s.service_key));

    for (const svc of active) {
      const per = (hints.per_service as Record<string, Record<string, unknown>>)[svc.service_key] ?? {};
      const body: Record<string, unknown> = {
        service_key: svc.service_key,
        user_ids: [testUserId],
        ...per,
      };
      if (hints.defaults.engagement_id) {
        body.engagement_id = hints.defaults.engagement_id;
      }

      const res = await page.request.post(`${API_BASE}/notifications/dispatch`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: body,
      });

      if (!res.ok()) {
        const text = await res.text();
        failures.push(`${svc.service_key}: HTTP ${res.status()} ${text.slice(0, 300)}`);
      } else {
        const json = await res.json();
        const status = json?.data?.status ?? json?.status;
        if (status && !["sent", "queued", "pending", "success"].includes(String(status).toLowerCase())) {
          failures.push(`${svc.service_key}: unexpected status ${status}`);
        }
      }
      await page.waitForTimeout(400);
    }

    if (failures.length) {
      console.error("Notification dispatch failures:\n" + failures.join("\n"));
    }
    expect(failures, failures.join("\n")).toHaveLength(0);
  });

  test("UI send message — welcome-whatsapp", async ({ page }) => {
    await employeeLogin(page);
    await page.goto(`${ADMIN_BASE}/users`);
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(PHONE);
      await page.waitForTimeout(800);
    }
    const row = page.getByRole("row", { name: new RegExp(PHONE) }).first();
    await row.getByRole("button", { name: /send message/i }).click({ timeout: 15000 });
    await page.getByLabel(/service/i).click().catch(() => page.locator('[name="service_key"]').click());
    await page.getByRole("option", { name: /welcome-whatsapp/i }).click();
    await page.getByRole("button", { name: /send|dispatch/i }).click();
    await expect(page.getByText(/dispatched|success/i).first()).toBeVisible({ timeout: 20000 });
  });
});
