import { describe, expect, it } from "vitest";

import type { EngagementNotificationSetupEventRow } from "./api";
import {
  engagementHasCustomNotificationSlots,
  flattenEngagementEventNotifications,
  formatEngagementEventTriggerSummary,
} from "./engagementNotificationTriggers";

const servicesByKey = new Map([
  ["wa-a", { service_key: "wa-a", display_name: "Welcome WA", channel: "whatsapp" }],
  ["em-a", { service_key: "em-a", display_name: "Welcome Email", channel: "email" }],
]);

function event(partial: Partial<EngagementNotificationSetupEventRow>): EngagementNotificationSetupEventRow {
  return {
    event_code: "users.onboarded",
    name: "User onboarded",
    is_applicable: true,
    is_extra: false,
    global_bindings: [],
    engagement_bindings: [],
    ...partial,
  };
}

describe("flattenEngagementEventNotifications", () => {
  it("expands multi-service slots into one row per service", () => {
    const rows = flattenEngagementEventNotifications(
      event({
        engagement_bindings: [
          {
            id: 1,
            engagement_id: 10,
            event_code: "users.onboarded",
            recipient_type: "user",
            delivery_channel: "whatsapp",
            notification_services: [{ service_key: "wa-a" }, { service_key: "em-a" }],
          },
        ],
      }),
      servicesByKey as never
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.serviceKey).sort()).toEqual(["em-a", "wa-a"]);
  });

  it("falls back to platform globals when engagement is not customized", () => {
    const rows = flattenEngagementEventNotifications(
      event({
        global_bindings: [
          {
            id: 99,
            event_code: "users.onboarded",
            event_name: "User onboarded",
            recipient_type: "user",
            delivery_channel: "whatsapp",
            notification_services: [{ service_key: "wa-a" }],
            engagement_type_id: null,
            recipient_config: null,
            service_key: "wa-a",
            condition_key: "default",
            emit_condition: null,
          },
        ],
      }),
      servicesByKey as never
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].platformDefault).toBe(true);
    expect(rows[0].serviceKey).toBe("wa-a");
  });

  it("keeps an empty engagement event empty when engagement is already customized", () => {
    const rows = flattenEngagementEventNotifications(
      event({
        event_code: "reminders.consultation_ready_to_book",
        global_bindings: [
          {
            id: 99,
            event_code: "reminders.consultation_ready_to_book",
            event_name: "Ready to book consultation",
            recipient_type: "user",
            delivery_channel: "whatsapp",
            notification_services: [{ service_key: "wa-a" }],
            engagement_type_id: null,
            recipient_config: null,
            service_key: "wa-a",
            condition_key: "default",
            emit_condition: null,
          },
        ],
        engagement_bindings: [],
      }),
      servicesByKey as never,
      { engagementCustomized: true }
    );
    expect(rows).toHaveLength(0);
  });

  it("coerces string binding ids", () => {
    const rows = flattenEngagementEventNotifications(
      event({
        engagement_bindings: [
          {
            id: "42" as unknown as number,
            engagement_id: 10,
            event_code: "users.onboarded",
            recipient_type: "user",
            delivery_channel: "whatsapp",
            notification_services: [{ service_key: "wa-a" }],
          },
        ],
      }),
      servicesByKey as never
    );
    expect(rows[0].bindingId).toBe(42);
  });
});

describe("engagementHasCustomNotificationSlots", () => {
  it("detects any engagement-level slot", () => {
    expect(
      engagementHasCustomNotificationSlots([
        event({ engagement_bindings: [] }),
        event({
          engagement_bindings: [
            {
              id: 1,
              engagement_id: 10,
              event_code: "users.onboarded",
              recipient_type: "user",
              delivery_channel: "whatsapp",
              notification_services: [{ service_key: "wa-a" }],
            },
          ],
        }),
      ])
    ).toBe(true);
    expect(engagementHasCustomNotificationSlots([event({ engagement_bindings: [] })])).toBe(false);
  });
});

describe("formatEngagementEventTriggerSummary", () => {
  it("formats recipient counts in plain language", () => {
    const rows = flattenEngagementEventNotifications(
      event({
        engagement_bindings: [
          {
            id: 1,
            engagement_id: 10,
            event_code: "users.onboarded",
            recipient_type: "departments.ops",
            delivery_channel: "whatsapp",
            notification_services: [{ service_key: "wa-a" }],
          },
          {
            id: 2,
            engagement_id: 10,
            event_code: "users.onboarded",
            recipient_type: "user",
            delivery_channel: "email",
            notification_services: [{ service_key: "em-a" }, { service_key: "wa-a" }],
          },
        ],
      }),
      servicesByKey as never
    );
    const summary = formatEngagementEventTriggerSummary(rows);
    expect(summary).toContain("3 notifications triggered");
    expect(summary).toContain("1 for Ops department");
    expect(summary).toContain("2 for Participant");
  });
});