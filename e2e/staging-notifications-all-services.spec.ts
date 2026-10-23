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
const TEST_USER_ID = process.env.STAGING_TEST_USER_ID ? Number(process.env.STAGING_TEST_USER_ID) : 0;
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

function templateBlob(svc: NotificationService): string {
  try {
    return JSON.stringify(svc.template_variables ?? []);
  } catch {
    return "";
  }
}

function buildDispatchPayload(
  svc: NotificationService,
  userId: number,
): Record<string, unknown> {
  const blob = templateBlob(svc);
  const body: Record<string, unknown> = {
    service_key: svc.service_key,
    user_ids: [userId],
  };
  if (blob.includes("{{first_name}}") || blob.includes("participant_details")) {
    body.participant_details = hints.defaults.participant_details;
  }
  if (blob.includes("session_details")) {
    body.session_details = hints.defaults.session_details;
  }
  if (blob.includes("{{otp}}")) {
    body.otp = hints.defaults.otp;
  }
  if (blob.includes("external_link")) {
    body.external_link = hints.defaults.external_link;
  }
  const per = hints.per_service[svc.service_key];
  if (per) {
    if (per.session_details && body.session_details) {
      body.session_details = { ...(body.session_details as object), ...(per.session_details as object) };
    }
    if (per.participant_details && body.participant_details) {
      body.participant_details = {
        ...(body.participant_details as object),
        ...(per.participant_details as object),
      };
    }
    const { session_details: _s, participant_details: _p, ...rest } = per;
    Object.assign(body, rest);
  }
  return body;
}

async function accessToken(page: import("@playwright/test").Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  if (!token) throw new Error("Missing access_token after login");
  return token;
}

test.describe.configure({ mode: "serial", timeout: 600_000 });

test.describe("Staging notifications — all active services", () => {
  let token = "";
  let testUserId = 0;
  const failures: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await employeeLogin(page);
    token = await accessToken(page);
    let testUserIdCandidate = TEST_USER_ID;
    if (!testUserIdCandidate) {
      const usersRes = await page.request.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { phone: PHONE, search: PHONE, limit: 10 },
      });
      if (usersRes.ok()) {
        const usersBody = await usersRes.json();
        const users = usersBody.data as { user_id: number; phone?: string }[];
        const match = users.find((u) => (u.phone || "").includes(PHONE)) ?? users[0];
        testUserIdCandidate = match?.user_id ?? 0;
      }
    }
    if (!testUserIdCandidate) {
      const onboardRes = await page.request.post(`${API_BASE}/employees/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: {
          first_name: "Notify",
          last_name: "Testuser",
          phone: PHONE,
          email: `notify.test.${PHONE}@test.supershyft.com`,
          is_participant: true,
        },
      });
      if (onboardRes.ok()) {
        const onboardBody = await onboardRes.json();
        testUserIdCandidate = onboardBody.data?.user_id as number;
      }
    }
    if (!testUserIdCandidate) {
      throw new Error(
        `No user_id for phone ${PHONE}. Set STAGING_TEST_USER_ID or onboard a participant with this phone.`,
      );
    }
    testUserId = testUserIdCandidate;
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
      const body = buildDispatchPayload(svc, testUserId);
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
    await search.waitFor({ state: "visible", timeout: 15000 });
    await search.fill("Notify Testuser");
    await page.waitForTimeout(1200);
    const sendBtn = page.getByRole("button", { name: /send message/i }).first();
    const canSend = await sendBtn.isVisible().catch(() => false);
    test.skip(!canSend, "Send Message not visible in users list (API dispatch test covers services).");
    await sendBtn.click();
    await page.getByLabel(/service/i).click().catch(() => page.locator('[name="service_key"]').click());
    await page.getByRole("option", { name: /welcome-whatsapp/i }).click();
    await page.getByRole("button", { name: /send|dispatch/i }).click();
    await expect(page.getByText(/dispatched|success/i).first()).toBeVisible({ timeout: 20000 });
  });
});
