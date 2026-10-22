import type {
  NotificationCatalogEvent,
  NotificationServiceConfigItem,
  NotificationServiceItem,
  WhatsAppTemplateMeta,
} from "../../lib/api";

const RECIPIENT_LABELS: Record<string, string> = {
  participant: "Participant",
  admin: "Admin",
  inferior_admin: "Inferior Admin",
  partner: "Partner",
  partner_role: "Partner (role)",
  onboarding_assistant: "Onboarding assistant",
};

export function recipientTypeLabel(recipientType: string): string {
  return RECIPIENT_LABELS[recipientType] ?? recipientType;
}

export function eventTypeLabel(eventType: string): string {
  if (eventType === "api") return "API";
  if (eventType === "scheduled") return "Scheduled";
  if (eventType === "emergency") return "Emergency";
  return eventType;
}

export function eventTypeBadgeClass(eventType: string): string {
  if (eventType === "emergency") return "bg-red-50 text-red-700 border-red-200";
  if (eventType === "scheduled") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

export function suggestServiceKey(
  eventCode: string,
  recipientType: string,
  channel: "whatsapp" | "email"
): string {
  const base = `${eventCode}_${recipientType}_${channel}`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
  return base.replace(/_+/g, "_").slice(0, 64);
}

export function suggestDisplayName(
  eventName: string,
  recipientType: string,
  channel: "whatsapp" | "email"
): string {
  const ch = channel === "whatsapp" ? "WhatsApp" : "Email";
  return `${eventName} — ${recipientTypeLabel(recipientType)} (${ch})`;
}

const SAMPLE_VALUES: Record<string, string> = {
  first_name: "Jane",
  last_name: "Doe",
  phone: "+91 98765 43210",
  email: "jane@example.com",
  otp: "123456",
  "session_details.date": "2026-03-15",
  "session_details.slot": "10:00 AM",
  "session_details.cabin": "Cabin 2",
  "session_details.want": "Yes",
  "session_details.expert_type": "Nutritionist",
  "participant_details.name": "Jane Doe",
  "participant_details.query_text": "Sample support question",
  "participant_details.ticket_id": "TKT-1001",
  "participant_details.phlebo_name": "Alex Phlebo",
  "participant_details.masked_number": "98***210",
  "participant_details.tracking_url": "https://example.com/track",
  "participant_details.eta_in_minutes": "25",
  "participant_details.booker_name": "John Doe",
  "participant_details.recipient_name": "Jane Doe",
  "participant_details.relationship": "Spouse",
  "participant_details.gift_url": "https://example.com/gift",
};

export function buildPreviewSampleContext(
  variables: NotificationCatalogEvent["variables"]
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    first_name: SAMPLE_VALUES.first_name,
    last_name: SAMPLE_VALUES.last_name,
    phone: SAMPLE_VALUES.phone,
    email: SAMPLE_VALUES.email,
    otp: SAMPLE_VALUES.otp,
    session_details: {},
    participant_details: {},
  };
  for (const v of variables) {
    const sample = SAMPLE_VALUES[v.key];
    if (sample === undefined) continue;
    const parts = v.key.split(".");
    if (parts.length === 1) {
      ctx[parts[0]] = sample;
    } else if (parts.length === 2) {
      const [parent, child] = parts;
      const bucket = ctx[parent];
      if (typeof bucket === "object" && bucket !== null) {
        (bucket as Record<string, string>)[child] = sample;
      }
    }
  }
  return ctx;
}

function getPathValue(context: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let current: unknown = context;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function resolvePreviewText(text: string, context: Record<string, unknown>): string {
  const trimmed = text.trim();
  const fullMatch = /^\{\{(.+)\}\}$/.exec(trimmed);
  if (fullMatch) {
    const value = getPathValue(context, fullMatch[1].trim());
    return value === undefined || value === null ? "" : String(value);
  }
  return trimmed.replace(/\{\{([^}]+)\}\}/g, (_m, path: string) => {
    const value = getPathValue(context, String(path).trim());
    return value === undefined || value === null ? "" : String(value);
  });
}

export function getWhatsappTemplateBodyText(meta: WhatsAppTemplateMeta | null): string {
  if (!meta?.components?.length) return "";
  const body = meta.components.find((c) => (c.type ?? "").toUpperCase() === "BODY");
  return body?.text ?? "";
}

/** Count positional placeholders {{1}}..{{n}} in WhatsApp BODY (Meta template format). */
export function parseWhatsappBodyParamCount(meta: WhatsAppTemplateMeta | null): number {
  const body = getWhatsappTemplateBodyText(meta);
  if (!body) return 0;
  const matches = body.match(/\{\{(\d+)\}\}/g);
  if (!matches?.length) return 0;
  const indices = matches.map((m) => {
    const n = /^\{\{(\d+)\}\}$/.exec(m);
    return n ? Number(n[1]) : 0;
  });
  return Math.max(0, ...indices);
}

export function whatsappTemplateLanguage(meta: WhatsAppTemplateMeta | null): string {
  if (!meta?.language) return "—";
  if (typeof meta.language === "string") return meta.language;
  return meta.language.code ?? "—";
}

export function isWhatsappTemplateApproved(meta: WhatsAppTemplateMeta | null): boolean {
  if (!meta) return false;
  const status = String(meta.status ?? "APPROVED").toUpperCase();
  return status === "APPROVED";
}

export function serviceContentSummary(service: NotificationServiceItem | undefined): string {
  if (!service) return "—";
  if (service.channel === "whatsapp") {
    return service.template_name?.trim() || "—";
  }
  return service.email_subject?.trim() || "—";
}

export function bindingChannels(
  services: NotificationServiceConfigItem[],
  serviceByKey: Map<string, NotificationServiceItem>
): Array<"whatsapp" | "email"> {
  const channels = new Set<"whatsapp" | "email">();
  for (const s of services) {
    const row = serviceByKey.get(s.service_key);
    if (row?.channel) channels.add(row.channel);
  }
  return [...channels];
}
