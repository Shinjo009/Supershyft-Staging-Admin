import { describe, expect, it } from "vitest";
import type { CatalogEventItem } from "../../lib/api";
import {
  canonicalCatalogEventCode,
  catalogEventForEventCode,
  groupNotificationBindingsByEvent,
  normalizeRecipientTypeForWizard,
} from "./notificationsUiShared";
import type { NotificationBindingItem } from "../../lib/api";

const catalog: CatalogEventItem[] = [
  {
    code: "users.onboarded",
    name: "User onboarded to engagement",
    status: "current",
    variable_groups: ["user"],
    variable_fields: ["user.name"],
    default_recipients: ["user", "assistants"],
    trigger_notes: "Enrollment into engagement",
    legacy_event_code: "onboarding",
    recipient_payload_hints: { assistants: "engagement_id → all onboarding assistants" },
  },
  {
    code: "support.ticket_created",
    name: "Support ticket created",
    status: "current",
    variable_groups: ["user", "support"],
    variable_fields: ["support.ticket_id"],
    default_recipients: ["departments.ops"],
    trigger_notes: "POST /support/tickets",
    legacy_event_code: null,
    recipient_payload_hints: { "departments.ops": "active employees in ops department" },
  },
];

describe("normalizeRecipientTypeForWizard", () => {
  it("maps legacy participant and onboarding assistant types", () => {
    expect(normalizeRecipientTypeForWizard("participant")).toBe("user");
    expect(normalizeRecipientTypeForWizard("onboarding_assistant")).toBe("assistants");
    expect(normalizeRecipientTypeForWizard("oa.all")).toBe("assistants");
    expect(normalizeRecipientTypeForWizard("departments.ops")).toBe("departments.ops");
  });
});

describe("catalogEventForEventCode", () => {
  it("returns null for unknown codes with no binding hint", () => {
    expect(catalogEventForEventCode(catalog, "not.a.real.event")).toBeNull();
    expect(catalogEventForEventCode(catalog, "legacy.deleted_event")).toBeNull();
  });

  it("resolves onboarding.completed to users.onboarded catalog row", () => {
    const ev = catalogEventForEventCode(catalog, "onboarding.completed");
    expect(ev).not.toBeNull();
    expect(ev!.code).toBe("users.onboarded");
    expect(ev!.default_recipients).toContain("assistants");
    expect(ev!.trigger_notes).toContain("Enrollment");
  });

  it("resolves support.ticket.created route to support.ticket_created", () => {
    const ev = catalogEventForEventCode(catalog, "support.ticket.created");
    expect(ev).not.toBeNull();
    expect(ev!.code).toBe("support.ticket_created");
    expect(ev!.default_recipients).toContain("departments.ops");
  });
});

describe("canonicalCatalogEventCode", () => {
  it("normalizes dotted support routes", () => {
    expect(canonicalCatalogEventCode("support.ticket.created")).toBe("support.ticket_created");
  });
});

function bindingStub(partial: Partial<NotificationBindingItem> & Pick<NotificationBindingItem, "id">): NotificationBindingItem {
  return {
    event_code: "auth.otp_sent",
    event_name: "OTP sent",
    recipient_type: "participant",
    delivery_channel: "email",
    engagement_type_id: null,
    notification_services: [{ service_key: "email-otp" }],
    ...partial,
  } as NotificationBindingItem;
}

describe("groupNotificationBindingsByEvent", () => {
  it("merges multiple bindings for the same global event", () => {
    const rows = [
      bindingStub({ id: 1, delivery_channel: "email" }),
      bindingStub({ id: 2, delivery_channel: "whatsapp", notification_services: [{ service_key: "whatapi-otp" }] }),
    ];
    const groups = groupNotificationBindingsByEvent(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.event_code).toBe("auth.otp_sent");
    expect(groups[0]!.bindingCount).toBe(2);
    expect(groups[0]!.bindings.map((b) => b.id)).toEqual([1, 2]);
  });

  it("keeps separate rows per engagement type override", () => {
    const rows = [
      bindingStub({ id: 1, engagement_type_id: null }),
      bindingStub({ id: 2, engagement_type_id: 5, event_code: "bookings.confirmed", event_name: "Booking confirmed" }),
    ];
    const groups = groupNotificationBindingsByEvent(rows);
    expect(groups).toHaveLength(2);
  });
});
