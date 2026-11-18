import { describe, expect, it } from "vitest";

import type { EngagementNotificationSetupEventRow } from "./api";
import {
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