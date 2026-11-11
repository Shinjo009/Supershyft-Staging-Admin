import type { CatalogEventItem, PayloadContactFieldItem } from "../../lib/api";

const AUDIENCE_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  payer: {
    title: "Person who paid",
    subtitle: "Booker on family checkout; same person on single-participant payments.",
  },
  members: {
    title: "Each paid participant",
    subtitle: "One notification per person on the order (phones/emails deduped).",
  },
  participants: {
    title: "Participants",
    subtitle: "Everyone included in this event.",
  },
  recipient: {
    title: "OTP recipient",
    subtitle: "Contact used for this authentication message.",
  },
  contact: {
    title: "Contact on request",
    subtitle: "",
  },
  primary: {
    title: "Participant",
    subtitle: "User linked to this event.",
  },
};

function channelLabel(ch: string): string {
  if (ch === "whatsapp") return "WhatsApp";
  if (ch === "email") return "Email";
  return ch;
}

function groupFieldsByAudience(
  fields: PayloadContactFieldItem[]
): Map<string, PayloadContactFieldItem[]> {
  const map = new Map<string, PayloadContactFieldItem[]>();
  const sorted = [...fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  for (const f of sorted) {
    const key = f.audience || f.group || "other";
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  return map;
}

type Props = {
  event: CatalogEventItem;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function PayloadRecipientPicker({ event, selectedIds, onChange }: Props) {
  const fields = event.payload_contact_fields ?? [];
  const byAudience = groupFieldsByAudience(fields);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const layout = event.payload_layout ?? "default";
  const apis = event.payload_trigger_apis ?? [];

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-4">
      {event.payload_admin_hint ? (
        <p className="text-sm text-zinc-700 leading-relaxed">{event.payload_admin_hint}</p>
      ) : (
        <p className="text-sm text-zinc-700">
          Choose who should receive this notification. Duplicate phone numbers and emails are only
          notified once.
        </p>
      )}

      {apis.length > 0 ? (
        <details className="text-xs text-zinc-600">
          <summary className="cursor-pointer font-medium text-zinc-800">
            Fired from {apis.length} API{apis.length === 1 ? "" : "s"} (same payload shape)
          </summary>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-zinc-500 list-disc pl-4">
            {apis.map((api) => (
              <li key={api}>{api}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className={layout === "payment_roles" ? "space-y-5" : "space-y-4"}>
        {[...byAudience.entries()].map(([audience, audienceFields]) => {
          const heading = AUDIENCE_HEADINGS[audience] ?? {
            title: audience.replace(/_/g, " "),
            subtitle: "",
          };
          return (
            <section
              key={audience}
              className="rounded-lg border border-white bg-white p-3 shadow-sm"
            >
              <h4 className="text-sm font-semibold text-zinc-900">{heading.title}</h4>
              {heading.subtitle ? (
                <p className="text-xs text-zinc-500 mt-0.5 mb-3">{heading.subtitle}</p>
              ) : (
                <div className="mb-2" />
              )}
              <ul className="space-y-2">
                {audienceFields.map((field) => {
                  const checked = selectedIds.includes(field.id);
                  const channels = field.channels ?? [];
                  return (
                    <li key={field.id}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 rounded border-zinc-300"
                          checked={checked}
                          onChange={() => toggle(field.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-zinc-900">{field.label}</span>
                          {channels.length > 0 ? (
                            <span className="ml-2 inline-flex gap-1">
                              {channels.map((ch) => (
                                <span
                                  key={ch}
                                  className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600"
                                >
                                  {channelLabel(ch)}
                                </span>
                              ))}
                            </span>
                          ) : null}
                          {field.description ? (
                            <span className="block text-xs text-zinc-500 mt-1 leading-snug">
                              {field.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500">
        {selectedIds.length} option{selectedIds.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
