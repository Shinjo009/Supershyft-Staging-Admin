import { test, expect, type Page, type Locator } from "@playwright/test";
import { loginAsEmployee } from "../helpers/adminLogin";
import { openOnboardingSettings, ENGAGEMENT_TYPES } from "../fixtures/onboardingSettings";

const hasStagingPhone = Boolean(process.env.E2E_ADMIN_PHONE?.trim());

function journeyNav(page: Page) {
  return page.getByRole("navigation", { name: "Journey types" });
}

function configPane(page: Page) {
  return page
    .locator("form")
    .filter({ has: journeyNav(page) });
}

function sectionTestId(name: string) {
  return `onboarding-section-${name.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

function section(page: Page, name: string) {
  return page.getByTestId(sectionTestId(name));
}

async function selectJourney(page: Page, displayName: string) {
  await journeyNav(page).getByRole("button", { name: displayName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`type=`));
  await expect(
    configPane(page).getByRole("heading", { name: `${displayName} configuration` })
  ).toBeVisible();
}

async function expectSections(
  page: Page,
  present: string[],
  absent: string[]
) {
  for (const name of present) {
    await expect(section(page, name)).toBeVisible();
  }
  for (const name of absent) {
    await expect(section(page, name)).toHaveCount(0);
  }
}

function typeSaveButton(page: Page): Locator {
  return configPane(page).getByRole("button", { name: /^Save / });
}

test.describe("B2C onboarding settings (mocked API)", () => {
  test.beforeEach(async ({ page }) => {
    await openOnboardingSettings(page, "bio_ai");
  });

  test("shows layout chrome and BioAI configuration header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Default journey type" })).toBeVisible();
    await expect(page.getByText("Fallback for new onboardings.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Defaults by journey type" })).toBeVisible();
    await expect(journeyNav(page)).toBeVisible();
    await expect(page.getByRole("heading", { name: "BioAI configuration" })).toBeVisible();
    await expect(
      page.getByText("Assessment + diagnostic packages with optional on-site blood collection.")
    ).toBeVisible();
    await expect(typeSaveButton(page)).toHaveText(/Save BioAI/);
    await expect(page.getByText("Metsights Pro checks", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Default engagement type when omitted", { exact: false })).toHaveCount(
      0
    );
  });

  test("lists all journey types in the sidebar", async ({ page }) => {
    const nav = journeyNav(page);
    for (const t of ENGAGEMENT_TYPES) {
      await expect(nav.getByRole("button", { name: t.display_name, exact: true })).toBeVisible();
    }
  });

  test("BioAI shows full section stack including profiles and questionnaires", async ({ page }) => {
    await expectSections(
      page,
      ["Schedule", "Packages", "Collection", "Payment", "Profiles", "Questionnaires"],
      ["Consultation"]
    );
    await expect(page.getByLabel("Engagement duration (days)")).toBeVisible();
    await expect(page.getByText("Diagnostic packages", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Default assessment package")).toBeVisible();
    await expect(page.getByText("Blood collection type", { exact: true })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Auto booking" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Create profile on Metsights" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Enroll for FitPrint Full" })).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: "Load previous assessment questionnaires" })
    ).toBeVisible();
  });

  test("Blood Test hides profiles, questionnaires, and consultation", async ({ page }) => {
    await selectJourney(page, "Blood Test");
    await expectSections(
      page,
      ["Schedule", "Packages", "Collection", "Payment"],
      ["Consultation", "Profiles", "Questionnaires"]
    );
    await expect(page.getByText("Diagnostic packages", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Default assessment package")).toHaveCount(0);
    await expect(typeSaveButton(page)).toHaveText(/Save Blood Test/);
  });

  test("Aurae Face Scan hides collection and consultation", async ({ page }) => {
    await selectJourney(page, "Aurae - Face Scan");
    await expectSections(
      page,
      ["Schedule", "Packages", "Payment", "Profiles", "Questionnaires"],
      ["Collection", "Consultation"]
    );
    await expect(page.getByLabel("Default assessment package")).toBeVisible();
    await expect(page.getByText("Diagnostic packages", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "Enroll for FitPrint Full" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Create profile on Metsights" })).toHaveCount(0);
    await expect(typeSaveButton(page)).toHaveText(/Save Aurae - Face Scan/);
  });

  test("Consultation shows only schedule, consultation, and payment", async ({ page }) => {
    await selectJourney(page, "Consultation");
    await expectSections(
      page,
      ["Schedule", "Consultation", "Payment"],
      ["Packages", "Collection", "Profiles", "Questionnaires"]
    );
    await expect(page.getByText("Consultation mode", { exact: true })).toBeVisible();
    await expect(typeSaveButton(page)).toHaveText(/^Save Consultation$/);
  });

  test("BioAI with Consultation composes BioAI sections plus consultation", async ({ page }) => {
    await selectJourney(page, "BioAI with Consultation");
    await expectSections(
      page,
      [
        "Schedule",
        "Packages",
        "Collection",
        "Consultation",
        "Payment",
        "Profiles",
        "Questionnaires",
      ],
      []
    );
    await expect(page.getByText("Diagnostic packages", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Default assessment package")).toBeVisible();
    await expect(page.getByText("Consultation mode", { exact: true })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Create profile on Metsights" })).toBeVisible();

    const order = await page.evaluate(() => {
      const ids = [
        "onboarding-section-schedule",
        "onboarding-section-packages",
        "onboarding-section-collection",
        "onboarding-section-consultation",
        "onboarding-section-payment",
      ];
      return ids.map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        return el ? el.getBoundingClientRect().top : -1;
      });
    });
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i]).toBeGreaterThan(order[i - 1]);
    }
  });

  test("Blood Test with Consultation composes blood sections plus consultation", async ({ page }) => {
    await selectJourney(page, "Blood Test with Consultation");
    await expectSections(
      page,
      ["Schedule", "Packages", "Collection", "Consultation", "Payment"],
      ["Profiles", "Questionnaires"]
    );
    await expect(page.getByText("Diagnostic packages", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Default assessment package")).toHaveCount(0);
    await expect(page.getByText("Consultation mode", { exact: true })).toBeVisible();
    await expect(typeSaveButton(page)).toHaveText(/Save Blood Test with Consultation/);
  });

  test("segmented controls mark form dirty and Discard restores", async ({ page }) => {
    const autoBooking = page.getByRole("radiogroup", { name: "Auto booking" });
    const save = typeSaveButton(page);
    const discard = configPane(page).getByRole("button", { name: "Discard" });

    await expect(save).toBeDisabled();
    await expect(discard).toBeDisabled();
    await expect(autoBooking.getByRole("radio", { name: "No" })).toHaveAttribute("aria-checked", "true");

    await autoBooking.getByRole("radio", { name: "Yes" }).click();
    await expect(autoBooking.getByRole("radio", { name: "Yes" })).toHaveAttribute("aria-checked", "true");
    await expect(save).toBeEnabled();
    await expect(discard).toBeEnabled();

    await discard.click();
    await expect(autoBooking.getByRole("radio", { name: "No" })).toHaveAttribute("aria-checked", "true");
    await expect(save).toBeDisabled();
  });

  test("diagnostic package mode segmented control switches options", async ({ page }) => {
    const diagMode = page.getByRole("radiogroup", { name: "Diagnostic packages" });
    await expect(diagMode.getByRole("radio", { name: "One package" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await diagMode.getByRole("radio", { name: "Male and female packages" }).click();
    await expect(diagMode.getByRole("radio", { name: "Male and female packages" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(page.getByText("Male package", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Female package", { exact: true }).first()).toBeVisible();
    await expect(typeSaveButton(page)).toBeEnabled();
  });

  test("default journey type auto-saves without Discard or Save", async ({ page }) => {
    const select = page.locator("#b2c-default-journey-type");
    const fallbackCard = page
      .getByRole("heading", { name: "Default journey type" })
      .locator("xpath=ancestor::form[1]");

    await expect(fallbackCard.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
    await expect(fallbackCard.getByRole("button", { name: "Discard" })).toHaveCount(0);
    await expect(typeSaveButton(page)).toBeVisible();

    await expect(select).toHaveValue("bio_ai");
    const patchPromise = page.waitForRequest(
      (req) =>
        req.method() === "PATCH" &&
        req.url().includes("/platform-settings/b2c-onboarding") &&
        Boolean(req.postDataJSON()?.default_engagement_type_code)
    );
    await select.selectOption("consultation");
    const patch = await patchPromise;
    expect(patch.postDataJSON()?.default_engagement_type_code).toBe("consultation");
    await expect(select).toHaveValue("consultation");
    await expect(page.getByText("Saved fallback journey type.")).toBeVisible();
  });

  test("type save button is scoped to active journey type", async ({ page }) => {
    await expect(typeSaveButton(page)).toHaveText(/Save BioAI/);
    await selectJourney(page, "Consultation");
    await expect(typeSaveButton(page)).toHaveText(/^Save Consultation$/);
  });
});

test.describe("B2C onboarding settings (staging smoke)", () => {
  test.skip(!hasStagingPhone, "Set E2E_ADMIN_PHONE for live staging smoke.");

  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto("/settings/onboarding?type=bio_ai");
    await expect(page).toHaveURL(/\/settings\/onboarding/);
  });

  test("live: shows per-type layout and journey nav", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Default journey type" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("navigation", { name: "Journey types" })).toBeVisible();
    await expect(page.getByLabel("Engagement duration (days)")).toBeVisible();
  });
});
