import { describe, expect, it } from "vitest";
import {
  parseWhatsappBodyParamCount,
  recipientTypeLabel,
  resolvePreviewText,
  suggestServiceKey,
} from "./notificationWizardUtils";
import type { WhatsAppTemplateMeta } from "../../lib/api";

describe("notificationWizardUtils", () => {
  it("maps recipient types to labels", () => {
    expect(recipientTypeLabel("participant")).toBe("Participant");
    expect(recipientTypeLabel("onboarding_assistant")).toBe("Onboarding assistant");
  });

  it("suggests stable service keys", () => {
    expect(suggestServiceKey("consultation_rescheduled", "participant", "whatsapp")).toBe(
      "consultation_rescheduled_participant_whatsapp"
    );
  });

  it("counts positional WhatsApp body placeholders", () => {
    const meta: WhatsAppTemplateMeta = {
      components: [
        {
          type: "BODY",
          text: "Hello {{1}}, your slot is {{2}} on {{3}}.",
        },
      ],
    };
    expect(parseWhatsappBodyParamCount(meta)).toBe(3);
  });

  it("resolves preview placeholders", () => {
    const ctx = { first_name: "Jane" };
    expect(resolvePreviewText("{{first_name}}", ctx)).toBe("Jane");
    expect(resolvePreviewText("Hi {{first_name}}!", ctx)).toBe("Hi Jane!");
  });
});
