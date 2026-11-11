import { describe, expect, it } from "vitest";
import type { CatalogEventItem } from "../../lib/api";
import {
  canonicalCatalogEventCode,
  catalogEventForEventCode,
  normalizeRecipientTypeForWizard,
} from "./notificationsUiShared";

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
    expect(normalizeRecipientTypeForWizard("departments.ops")).toBe("departments.ops");
  });
});

describe("catalogEventForEventCode", () => {
  it("resolves onboarding.completed to users.onboarded catalog row", () => {
    const ev = catalogEventForEventCode(catalog, "onboarding.completed");
    expect(ev.code).toBe("users.onboarded");
    expect(ev.default_recipients).toContain("assistants");
    expect(ev.trigger_notes).toContain("Enrollment");
  });

  it("resolves support.ticket.created route to support.ticket_created", () => {
    const ev = catalogEventForEventCode(catalog, "support.ticket.created");
    expect(ev.code).toBe("support.ticket_created");
    expect(ev.default_recipients).toContain("departments.ops");
  });
});

describe("canonicalCatalogEventCode", () => {
  it("normalizes dotted support routes", () => {
    expect(canonicalCatalogEventCode("support.ticket.created")).toBe("support.ticket_created");
  });
});
