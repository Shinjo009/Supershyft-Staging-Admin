import { describe, expect, it } from "vitest";
import { buildEngagementUpdatePayload } from "./engagementFormSubmit";
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
    ...overrides,
  };
}

describe("buildEngagementUpdatePayload", () => {
  it("omits notifications and slot_detail when undefined on partial wizard save", () => {
    const { payload } = buildEngagementUpdatePayload(minimalEngagementCreate());
    expect(payload).not.toHaveProperty("notifications");
    expect(payload).not.toHaveProperty("slot_detail");
  });

  it("includes notifications when provided", () => {
    const notifications = [
      {
        notification_event_id: 10,
        notification_services: [{ service_key: "email", enabled: true }],
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
