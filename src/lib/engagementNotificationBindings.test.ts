import { describe, expect, it } from "vitest";
import type { EngagementNotificationItem } from "./api";
import {
  engagementNotificationToBindingItem,
  pickEngagementBindingById,
} from "./engagementNotificationBindings";

function slot(
  partial: Partial<EngagementNotificationItem> & Pick<EngagementNotificationItem, "id" | "event_code">
): EngagementNotificationItem {
  return {
    engagement_id: 1032,
    notification_services: [],
    ...partial,
  };
}

describe("pickEngagementBindingById", () => {
  it("returns the matching slot", () => {
    const items = [
      slot({ id: 10, event_code: "users.onboarded" }),
      slot({ id: 6519, event_code: "users.onboarded", recipient_type: "departments.ops" }),
    ];
    expect(pickEngagementBindingById(items, 6519)?.recipient_type).toBe("departments.ops");
    expect(pickEngagementBindingById(items, 999)).toBeUndefined();
  });
});

describe("engagementNotificationToBindingItem", () => {
  it("maps engagement slot fields for wizard hydrate", () => {
    const row = engagementNotificationToBindingItem(
      slot({
        id: 6519,
        event_code: "users.onboarded",
        event_display_name: "User onboarded to engagement",
        recipient_type: "departments.ops",
        delivery_channel: "whatsapp",
        notification_services: [{ service_key: "users-onboarded-whatsapp" }],
      })
    );
    expect(row.event_code).toBe("users.onboarded");
    expect(row.recipient_type).toBe("departments.ops");
    expect(row.delivery_channel).toBe("whatsapp");
    expect(row.service_key).toBe("users-onboarded-whatsapp");
    expect(row.engagement_type_id).toBeNull();
  });
});