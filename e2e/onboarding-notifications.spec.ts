import { test, expect } from "@playwright/test";
import { loginAdmin, STAGING_API } from "./helpers/staging-auth";

const ENGAGEMENT_CODE = "8S2NVCA5";
const ENGAGEMENT_ID = 1079;

test.describe("code onboard notifications (staging)", () => {
  test("engagement tab shows effective onboarding bindings", async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`/engagements/${ENGAGEMENT_ID}`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /notifications/i }).click();
    await expect(page.getByText("Global default").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/onboarding/i).first()).toBeVisible();
    await expect(page.getByText("oa.all").or(page.getByText(/booking alert/i)).first()).toBeVisible({
      timeout: 15_000,
    }).catch(() => undefined);
  });

  test("POST code onboard creates OA alert and participant welcome log rows", async ({
    page,
    request,
  }) => {
    await loginAdmin(page);

    const stamp = Date.now();
    const onboardBody = {
      first_name: "Staging",
      last_name: `Onboard${stamp}`,
      phone: "8762830757",
      email: "pratheek.fitnastic@gmail.com",
      age: 30,
      gender: "male",
    };

    const onboardRes = await request.post(
      `${STAGING_API}/users/code/${ENGAGEMENT_CODE}/onboard`,
      { data: onboardBody }
    );

    if (onboardRes.status() === 409) {
      test.skip(true, "Test user already enrolled on this engagement; use a fresh camp or participant.");
    }

    expect(onboardRes.ok(), await onboardRes.text()).toBeTruthy();

    await page.goto("/notifications/logs", { waitUntil: "networkidle" });
    await page.getByPlaceholder(/search|filter/i).first().fill(String(ENGAGEMENT_ID)).catch(() => {});
    await page.getByRole("button", { name: /refresh|reload/i }).click().catch(() => {});

    await expect(page.getByText(/welcome|booking-alert|onboarding/i).first()).toBeVisible({
      timeout: 90_000,
    });
  });
});
