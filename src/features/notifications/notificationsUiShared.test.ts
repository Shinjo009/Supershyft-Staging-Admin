import { describe, expect, it } from "vitest";
import type { CatalogEventItem } from "../../lib/api";
import {
  applyWizardBindingRow,
  canonicalCatalogEventCode,
  catalogEventForEventCode,
  groupNotificationBindingsByEvent,
  formatBindingEmitConditionLabel,
  normalizeRecipientTypeForWizard,
  wizardRecipientOptionsForEvent,
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

describe("wizardRecipientOptionsForEvent", () => {
  const paymentsEvent: CatalogEventItem = {
    code: "payments.completed",
    name: "Payment completed",
    status: "current",
    variable_groups: ["payment"],
    variable_fields: [],
    default_recipients: ["user", "payload"],
    trigger_notes: "",
    legacy_event_code: null,
    recipient_payload_hints: {},
    allows_payload_recipient: true,
    payload_contact_fields: [],
  };

  it("hides members when payload recipient is allowed", () => {
    const opts = wizardRecipientOptionsForEvent(paymentsEvent, "payload");
    expect(opts).toContain("payload");
    expect(opts).not.toContain("members");
  });
});

describe("formatBindingEmitConditionLabel", () => {
  it("formats discount operators", () => {
    expect(formatBindingEmitConditionLabel({ emit_condition: null })).toBe("Always");
    expect(
      formatBindingEmitConditionLabel({
        emit_condition: { op: "equals", value: "VIP" },
      })
    ).toBe("Discount = VIP");
    expect(
      formatBindingEmitConditionLabel({
        emit_condition: { op: "is_empty" },
      })
    ).toBe("No discount");
  });
});

describe("applyWizardBindingRow", () => {
  it("normalizes ops recipient and selects reuse when service is known", () => {
    const calls: string[] = [];
    let recipient = "";
    let mode: "reuse" | "create" = "create";
    applyWizardBindingRow(
      {
        ...bindingStub({ id: 6519 }),
        event_code: "users.onboarded",
        recipient_type: "departments.ops",
        delivery_channel: "whatsapp",
        notification_services: [{ service_key: "users-onboarded-whatsapp" }],
        service_key: "users-onboarded-whatsapp",
      },
      {
        prefilledRecipient: "",
        services: [
          {
            notification_service_id: 7,
            service_key: "users-onboarded-whatsapp",
            display_name: "Users onboarded WA",
            channel: "whatsapp",
            can_delete: true,
            is_active: true,
            require_blood_report_url: false,
            require_bio_ai_report_url: false,
            require_participant_detail: false,
            require_otp: false,
            require_session_details: false,
            require_external_link: false,
            template_name: "test_tpl",
            template_variables: null,
            email_subject: null,
            email_body: null,
            email_html: null,
            created_at: null,
          },
        ],
        selectServiceForReuse: (svc) => {
          calls.push(svc.service_key);
        },
        setServiceMode: (m) => {
          mode = m;
        },
        setBindingEventCode: () => {},
        setRecipientType: (rt) => {
          recipient = rt;
        },
        setCustomPhones: () => {},
        setCustomEmails: () => {},
        setPayloadPath: () => {},
        setEmitWhenMode: () => {},
        setEmitConditionOp: () => {},
        setEmitConditionValue: () => {},
      }
    );
    expect(recipient).toBe("departments.ops");
    expect(mode).toBe("reuse");
    expect(calls).toEqual(["users-onboarded-whatsapp"]);
  });
});
