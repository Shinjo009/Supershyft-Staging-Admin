import { test, expect } from "@playwright/test";
import { loginAdmin, STAGING_API } from "./helpers/staging-auth";

const ENGAGEMENT_CODE = "8S2NVCA5";

test.describe("code onboard notifications (staging)", () => {
  test("engagement tab shows effective onboarding bindings", async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`/engagements/${ENGAGEMENT_CODE}?tab=notifications`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("Global default").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/onboarding completed/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("POST code onboard creates OA alert and participant welcome log rows", async ({
    page,
    request,
  }) => {
    await loginAdmin(page);

    const stamp = Date.now();
    const phoneSuffix = String(stamp % 100000).padStart(5, "0");
    const onboardBody = {
      first_name: "Staging",
      last_name: "Onboard",
      phone: `87628${phoneSuffix}`,
      email: `staging.ob${phoneSuffix}@fitnastic.com`,
      age: 30,
      gender: "male",
      blood_collection_date: "2026-12-15",
      blood_collection_time_slot: "09:00",
    };

    const onboardRes = await request.post(
      `${STAGING_API}/users/code/${ENGAGEMENT_CODE}/onboard`,
      { data: onboardBody }
    );

    const onboardText = await onboardRes.text();
    if (onboardRes.status() === 409) {
      test.skip(true, `Already enrolled: ${onboardText}`);
    }
    expect(onboardRes.ok(), onboardText).toBeTruthy();

    await page.goto("/notifications/logs", { waitUntil: "networkidle" });
    await page.getByPlaceholder(/engagement|search|filter/i).first().fill("1079").catch(() => {});

    await expect(
      page.getByText(/booking-alert|welcome-whatsapp|welcome-email/i).first()
    ).toBeVisible({ timeout: 120_000 });
  });
});
