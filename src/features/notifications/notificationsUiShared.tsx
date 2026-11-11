import type {
  CatalogEventItem,
  NotificationBindingItem,
  NotificationItem,
  NotificationRecipient,
} from "../../lib/api";

/** Stored DB values that map to a wizard recipient card (uniform edit UI). */
const RECIPIENT_LEGACY_TO_WIZARD: Record<string, string> = {
  booker: "user",
  participant: "user",
  employees: "departments",
  employee: "departments",
  admin: "departments.ops",
  support: "departments.ops",
  specific_contacts: "custom",
  specific_numbers: "custom",
  specific: "custom",
  onboarding_assistant: "assistants",
  onboarding_assistants: "assistants",
  "oa.all": "assistants",
  "oa.phlebo": "assistants.phlebo",
  "oa.expert": "assistants.expert",
  "oa.staff": "assistants.staff",
};

/** Event codes in DB/routes that should use catalog metadata from another code. */
const BINDING_EVENT_CODE_ALIASES: Record<string, string> = {
  "onboarding.completed": "users.onboarded",
  onboarding: "users.onboarded",
  "support.ticket.created": "support.ticket_created",
  "assistants.consultation_booked": "consultations.booked",
  "consultations.ready_to_book": "reminders.consultation_ready_to_book",
  "consultations.reminder": "reminders.consultation_reminder",
};

function dottedUnderscoreVariants(code: string): string[] {
  const trimmed = code.trim();
  if (!trimmed) return [];
  const underscore = trimmed.replace(/\./g, "_");
  const dotted = trimmed.replace(/_/g, ".");
  return [...new Set([trimmed, underscore, dotted])];
}

export function canonicalCatalogEventCode(routeOrBindingCode: string): string {
  const rt = (routeOrBindingCode ?? "").trim();
  if (!rt) return "";
  const aliased = BINDING_EVENT_CODE_ALIASES[rt];
  if (aliased) return aliased;
  for (const variant of dottedUnderscoreVariants(rt)) {
    const mapped = BINDING_EVENT_CODE_ALIASES[variant];
    if (mapped) return mapped;
  }
  return rt.replace(/\./g, "_");
}

export const RECIPIENT_LABELS: Record<string, string> = {
  user: "Participant from payload",
  participant: "Participant from payload",
  members: "Family members",
  booker: "Family booker",
  assistants: "All onboarding assistants",
  "oa.all": "All onboarding assistants",
  "assistants.phlebo": "Phlebo assistants",
  "assistants.expert": "Expert assistants",
  "assistants.staff": "Staff assistants",
  departments: "All departments",
  "departments.ops": "Ops department",
  "departments.tech": "Tech department",
  "departments.design": "Design department",
  custom: "Specific phone numbers or emails",
};

/** Recipient types offered in the binding wizard (excludes legacy booker-only option). */
export const WIZARD_RECIPIENT_TYPES = [
  "user",
  "members",
  "assistants",
  "assistants.phlebo",
  "assistants.expert",
  "assistants.staff",
  "departments",
  "departments.ops",
  "departments.tech",
  "departments.design",
  "custom",
] as const;

export function participantPayloadHintForEvent(
  event: CatalogEventItem | null | undefined
): string {
  if (!event) return "user_id or participant_user_id";
  const hints = event.recipient_payload_hints ?? {};
  if (event.code === "family.gift_sent") {
    return "booker_user_id (emit also sets user_id)";
  }
  return hints.user ?? "user_id or participant_user_id";
}

export function recipientPayloadHint(
  recipientType: string,
  event: CatalogEventItem | null | undefined
): string | null {
  if (recipientType === "user") {
    return participantPayloadHintForEvent(event);
  }
  const hints = event?.recipient_payload_hints ?? {};
  return hints[recipientType] ?? null;
}

export function defaultRecipientForWizard(event: CatalogEventItem | null | undefined): string {
  const first = event?.default_recipients[0];
  if (!first || first === "booker") return "user";
  return first;
}

/** Map stored binding recipient_type to a wizard card id. */
export function normalizeRecipientTypeForWizard(raw: string | null | undefined): string {
  const rt = (raw ?? "").trim().toLowerCase();
  if (!rt) return "";
  return RECIPIENT_LEGACY_TO_WIZARD[rt] ?? rt;
}

export function bindingEditPath(
  bindingId: number,
  step: 2 | 3,
  row?: Pick<NotificationBindingItem, "recipient_type" | "event_code">
): string {
  const params = new URLSearchParams({ step: String(step) });
  const recipient = normalizeRecipientTypeForWizard(row?.recipient_type) || (row?.recipient_type ?? "").trim();
  if (recipient) {
    params.set("recipient", recipient);
  }
  const eventCode = (row?.event_code ?? "").trim();
  if (eventCode) {
    params.set("event_code", eventCode);
  }
  return `/notifications/notifications/${bindingId}/edit?${params.toString()}`;
}

export function recipientTypeFromEditLocation(
  searchParams: URLSearchParams,
  locationState?: { editBinding?: { recipient_type?: string } } | null
): string {
  const fromUrl = (searchParams.get("recipient") ?? "").trim();
  const fromState = (locationState?.editBinding?.recipient_type ?? "").trim();
  return normalizeRecipientTypeForWizard(fromUrl || fromState);
}

export type NotificationEventGroupRow = {
  key: string;
  event_code: string;
  event_name: string;
  engagement_type_id: number | null;
  bindings: NotificationBindingItem[];
  bindingCount: number;
};

function groupKeyForBinding(row: Pick<NotificationBindingItem, "event_code" | "engagement_type_id">): string {
  if (row.engagement_type_id != null) {
    return `${row.event_code}::et:${row.engagement_type_id}`;
  }
  return row.event_code;
}

/** One list row per event (detail page shows each binding row). */
export function groupNotificationBindingsByEvent(
  bindings: NotificationBindingItem[]
): NotificationEventGroupRow[] {
  const map = new Map<string, NotificationEventGroupRow>();
  for (const row of bindings) {
    const key = groupKeyForBinding(row);
    const existing = map.get(key);
    if (existing) {
      existing.bindings.push(row);
      continue;
    }
    map.set(key, {
      key,
      event_code: row.event_code,
      event_name: row.event_name,
      engagement_type_id: row.engagement_type_id ?? null,
      bindings: [row],
      bindingCount: 0,
    });
  }
  return [...map.values()]
    .map((g) => ({ ...g, bindingCount: g.bindings.length }))
    .sort(
      (a, b) =>
        a.event_name.localeCompare(b.event_name) || a.event_code.localeCompare(b.event_code)
    );
}

/** Wizard step-2 options, always including the binding's current recipient when editing. */
export function wizardRecipientOptions(currentRecipientType: string): readonly string[] {
  const current = normalizeRecipientTypeForWizard(currentRecipientType);
  if (!current || (WIZARD_RECIPIENT_TYPES as readonly string[]).includes(current)) {
    return WIZARD_RECIPIENT_TYPES;
  }
  return [current, ...WIZARD_RECIPIENT_TYPES];
}

/** Match an event code to a catalog row (aliases, legacy codes, dot/underscore variants). */
export function lookupNotificationCatalogEvent(
  catalog: CatalogEventItem[],
  eventCode: string
): CatalogEventItem | null {
  const code = (eventCode ?? "").trim();
  if (!code) return null;

  const aliased = BINDING_EVENT_CODE_ALIASES[code];
  if (aliased) {
    const target = catalog.find((c) => c.code === aliased);
    if (target) return target;
  }

  const exact = catalog.find((c) => c.code === code);
  if (exact) return exact;

  const viaLegacy = catalog.find((c) => c.legacy_event_code === code);
  if (viaLegacy) return viaLegacy;

  for (const variant of dottedUnderscoreVariants(code)) {
    const mapped = BINDING_EVENT_CODE_ALIASES[variant];
    if (mapped) {
      const target = catalog.find((c) => c.code === mapped);
      if (target) return target;
    }
    const catalogMatch = catalog.find(
      (c) => c.code === variant || c.code.replace(/\./g, "_") === variant.replace(/\./g, "_")
    );
    if (catalogMatch) return catalogMatch;
    const legacyMatch = catalog.find((c) => c.legacy_event_code === variant);
    if (legacyMatch) return legacyMatch;
  }

  return null;
}

/** Match catalog row for a binding, including legacy event codes stored in DB. */
export function catalogEventForBinding(
  catalog: CatalogEventItem[],
  row: Pick<NotificationBindingItem, "event_code" | "event_name">
): CatalogEventItem {
  const match = lookupNotificationCatalogEvent(catalog, row.event_code);
  if (match) return match;
  return {
    code: row.event_code,
    name: row.event_name,
    status: "current",
    variable_groups: [],
    variable_fields: [],
    default_recipients: [],
    trigger_notes: "",
    legacy_event_code: null,
    recipient_payload_hints: {},
  };
}

/** Resolve catalog metadata for an event detail route (/events/:code). */
export function catalogEventForEventCode(
  catalog: CatalogEventItem[],
  eventCode: string,
  bindingHint?: Pick<NotificationBindingItem, "event_code" | "event_name">
): CatalogEventItem | null {
  const fromRoute = lookupNotificationCatalogEvent(catalog, eventCode);
  if (fromRoute) return fromRoute;
  if (bindingHint) {
    return catalogEventForBinding(catalog, bindingHint);
  }
  return null;
}

export function selectableRowClass(selected: boolean): string {
  return [
    "w-full text-left rounded-lg border px-4 py-3 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2",
    "active:bg-zinc-100",
    selected
      ? "border-zinc-900 bg-zinc-50 shadow-sm"
      : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50",
  ].join(" ");
}

export const STATUS_OPTIONS = ["pending", "sent", "failed"];
export const CHANNEL_OPTIONS = ["email", "whatsapp"];
export const FILTER_DEBOUNCE_MS = 300;

export type TimePreset = "" | "1h" | "24h" | "7d" | "30d" | "custom";

export const DEFAULT_TIME_PRESET: TimePreset = "1h";

export const TIME_PRESETS: { key: TimePreset; label: string }[] = [
  { key: "", label: "All time" },
  { key: "1h", label: "Last 1h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "custom", label: "Custom" },
];

export function formatNotificationStatusLabel(
  status: string,
  queueId?: string | number | null
): string {
  const hasQueue = queueId != null && String(queueId).trim() !== "";
  if (status === "pending" && hasQueue) return "Queued at provider";
  if (status === "failed" && hasQueue) return "Delivery failed";
  if (status === "failed" && !hasQueue) return "Failed";
  if (status === "sent") return "Sent";
  if (status === "pending") return "Pending";
  return status;
}

export function StatusBadge({
  status,
  queueId,
  message,
}: {
  status: string;
  queueId?: string | number | null;
  message?: string | null;
}) {
  const colors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };
  const label = formatNotificationStatusLabel(status, queueId);
  const title =
    (message && String(message).trim()) ||
    (queueId ? `Queue: ${queueId}` : undefined);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? "bg-zinc-50 text-zinc-700 border-zinc-200"}`}
      title={title}
    >
      {label}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-50 text-zinc-500 border-zinc-200">
      Inactive
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    email: "bg-blue-50 text-blue-700 border-blue-200",
    whatsapp: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[channel] ?? "bg-zinc-50 text-zinc-700 border-zinc-200"}`}
    >
      {channel}
    </span>
  );
}

export function formatDateTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString();
  } catch {
    return val;
  }
}

function localDatetimeToIso(val: string): string | undefined {
  if (!val.trim()) return undefined;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function getDispatchedRange(
  preset: TimePreset,
  customFrom: string,
  customTo: string
): { dispatched_from?: string; dispatched_to?: string } {
  if (preset === "custom") {
    return {
      dispatched_from: localDatetimeToIso(customFrom),
      dispatched_to: localDatetimeToIso(customTo),
    };
  }
  if (!preset) return {};
  const now = new Date();
  const to = now.toISOString();
  const hours: Record<string, number> = { "1h": 1, "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
  const h = hours[preset];
  if (!h) return {};
  const from = new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  return { dispatched_from: from, dispatched_to: to };
}

function recipientDisplayName(r: NotificationRecipient): string {
  const first = (r.first_name ?? "").trim();
  const last = (r.last_name ?? "").trim();
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || `User #${r.user_id}`;
}

export function formatRecipientsCell(row: NotificationItem): { text: string; title: string } {
  const recipients = row.recipients ?? [];
  if (recipients.length > 0) {
    const names = recipients.map(recipientDisplayName);
    return { text: names.join(", "), title: names.join(", ") };
  }
  const ids = row.user?.user_ids ?? [];
  if (!ids.length) return { text: "—", title: "" };
  const text = ids.map((id) => `User #${id}`).join(", ");
  return { text, title: text };
}

export function formatEngagementCell(row: NotificationItem): string {
  if (row.engagement_id == null) return "—";
  const name = (row.engagement_name ?? row.engagement_code ?? "").trim();
  return name || `Engagement #${row.engagement_id}`;
}

export function filterChipClass(active: boolean): string {
  return `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active
      ? "bg-zinc-900 text-white border-zinc-900"
      : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400"
  }`;
}

export function parseTemplateVariablesJson(raw: string): Record<string, unknown> | unknown[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed: unknown = JSON.parse(trimmed);
  if (parsed !== null && typeof parsed === "object") {
    return parsed as Record<string, unknown> | unknown[];
  }
  throw new Error("Template variables must be a JSON object or array.");
}

export function stringifyTemplateVariables(
  value: Record<string, unknown> | unknown[] | null | undefined
): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}
