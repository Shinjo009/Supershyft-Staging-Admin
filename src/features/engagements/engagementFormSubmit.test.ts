import { describe, expect, it } from "vitest";
import {
  buildEngagementCreatePayload,
  buildEngagementUpdatePayload,
  buildEngagementUpdatePayloadForWizardStep,
} from "./engagementFormSubmit";
import type { EngagementCreate } from "../../lib/api";

function minimalEngagementCreate(
  overrides: Partial<EngagementCreate> = {},
): EngagementCreate {
  return {
    engagement_name: "Test",
    engagement_code: "TST001",
    organization_id: 1,
    engagement_type: 1,
    assessment_package_id: 1,
    city: "Mumbai",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    slot_duration: 60,
    create_profile_on_metsights: true,
    enroll_for_fitprint_full: true,
    ...overrides,
  };
}

describe("buildEngagementCreatePayload", () => {
  it("omits notifications when undefined or empty so API seeds from global defaults", () => {
    const base = buildEngagementCreatePayload(minimalEngagementCreate());
    expect(base).not.toHaveProperty("notifications");
    const empty = buildEngagementCreatePayload(minimalEngagementCreate({ notifications: [] }));
    expect(empty).not.toHaveProperty("notifications");
  });
});

describe("buildEngagementUpdatePayload", () => {
  it("omits notifications and slot_detail when undefined on partial wizard save", () => {
    const { payload } = buildEngagementUpdatePayload(minimalEngagementCreate());
    expect(payload).not.toHaveProperty("notifications");
    expect(payload).not.toHaveProperty("slot_detail");
  });

  it("includes notifications when provided", () => {
    const notifications = [
      {
        event_code: "users.onboarded",
        notification_services: [{ service_key: "welcome-email" }],
      },
    ];
    const { payload } = buildEngagementUpdatePayload(
      minimalEngagementCreate({ notifications }),
    );
    expect(payload.notifications).toEqual(notifications);
  });

  it("includes payment_type and auto_booking", () => {
    const { payload } = buildEngagementUpdatePayload(
      minimalEngagementCreate({
        payment_type: "paid_by_patient",
        auto_booking: true,
      }),
    );
    expect(payload.payment_type).toBe("paid_by_patient");
    expect(payload.auto_booking).toBe(true);
  });

  it("includes slot_detail when provided", () => {
    const slot_detail = { blood_collection: { is_enable: true } };
    const { payload } = buildEngagementUpdatePayload(
      minimalEngagementCreate({ slot_detail }),
    );
    expect(payload.slot_detail).toEqual(slot_detail);
  });
});

describe("buildEngagementUpdatePayloadForWizardStep", () => {
  it("basics step does not include assessment or Metsights offering fields", () => {
    const { payload } = buildEngagementUpdatePayloadForWizardStep(
      minimalEngagementCreate({ assessment_package_id: 0 }),
      "basics",
    );
    expect(payload.engagement_name).toBe("Test");
    expect(payload).not.toHaveProperty("assessment_package_id");
    expect(payload).not.toHaveProperty("create_profile_on_metsights");
    expect(payload).not.toHaveProperty("enroll_for_fitprint_full");
    expect(payload).not.toHaveProperty("diagnostic_package_id");
  });

  it("offerings step includes normalized package ids", () => {
    const { payload } = buildEngagementUpdatePayloadForWizardStep(
      minimalEngagementCreate({
        assessment_package_id: 5,
        diagnostic_package_id: 9,
      }),
      "offerings",
    );
    expect(payload.assessment_package_id).toBe(5);
    expect(payload.diagnostic_package_id).toBe(9);
    expect(payload).not.toHaveProperty("engagement_name");
  });

  it("schedule step only sends slot_detail plus identity", () => {
    const slot_detail = { blood_collection: { is_enable: true } };
    const { payload } = buildEngagementUpdatePayloadForWizardStep(
      minimalEngagementCreate({ slot_detail, assessment_package_id: 0 }),
      "schedule",
    );
    expect(payload.slot_detail).toEqual(slot_detail);
    expect(payload).not.toHaveProperty("assessment_package_id");
  });
});
