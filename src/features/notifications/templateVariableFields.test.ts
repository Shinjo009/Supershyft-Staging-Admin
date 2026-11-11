import { describe, expect, it } from "vitest";

import type { CatalogEventItem } from "../../lib/api";
import { isTeamRecipient, templateVariableFieldsForRecipient } from "./templateVariableFields";

const onboardEvent: CatalogEventItem = {
  code: "users.onboarded",
  name: "User onboarded",
  status: "current",
  variable_groups: ["user", "engagement", "session"],
  variable_fields: ["user.name", "engagement.engagement_name", "session.date"],
  default_recipients: ["user"],
  trigger_notes: "",
  legacy_event_code: null,
};

describe("templateVariableFieldsForRecipient", () => {
  it("adds staff and participant fields for departments.ops", () => {
    const fields = templateVariableFieldsForRecipient({
      event: onboardEvent,
      recipientType: "departments.ops",
    });
    expect(fields[0]).toBe("staff.name");
    expect(fields).toContain("participant.name");
    expect(fields).toContain("user.name");
  });

  it("leaves participant-facing bindings unchanged", () => {
    const fields = templateVariableFieldsForRecipient({
      event: onboardEvent,
      recipientType: "user",
    });
    expect(fields).toEqual(onboardEvent.variable_fields);
    expect(fields).not.toContain("staff.name");
  });

  it("treats assistants as team recipients", () => {
    expect(isTeamRecipient("assistants.phlebo")).toBe(true);
    const fields = templateVariableFieldsForRecipient({
      event: onboardEvent,
      recipientType: "assistants",
    });
    expect(fields).toContain("staff.phone");
  });
});
