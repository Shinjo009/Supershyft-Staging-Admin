import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Modal } from "../../shared/ui/Modal";
import {
  engagementNotificationsApi,
  notificationBindingsApi,
  notificationsApi,
  notificationsCatalogApi,
  type CatalogEventItem,
  type NotificationServiceItem,
  type WhatsappTemplateMeta,
  type WizardBindingPayload,
  getApiError,
} from "../../lib/api";

type Step = 1 | 2 | 3;

const RECIPIENT_LABELS: Record<string, string> = {
  user: "Participant from payload",
  members: "Family members",
  booker: "Family booker",
  assistants: "All onboarding assistants",
  "assistants.phlebo": "Phlebo assistants",
  "assistants.expert": "Expert assistants",
  "assistants.staff": "Staff assistants",
  employees: "Default support employees",
  admin: "Ops / alert users",
  custom: "Specific phone numbers or emails",
};

export function NotificationBindingWizard() {
  const navigate = useNavigate();
  const { bindingId } = useParams<{ bindingId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const mode = searchParams.get("mode") === "engagement" ? "engagement" : "global";
  const engagementId = Number(searchParams.get("engagementId") || 0) || 0;
  const engagementTypeId = Number(searchParams.get("engagementTypeId") || 0) || 0;
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/notifications/notifications";
  const presetEventCode = searchParams.get("event_code") || "";

  const [step, setStep] = useState<Step>(presetEventCode ? 2 : 1);
  const [events, setEvents] = useState<CatalogEventItem[]>([]);
  const [, setServices] = useState<NotificationServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<CatalogEventItem | null>(null);
  const [recipientType, setRecipientType] = useState("");
  const [customPhones, setCustomPhones] = useState("");
  const [customEmails, setCustomEmails] = useState("");

  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [displayName, setDisplayName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateMeta, setTemplateMeta] = useState<WhatsappTemplateMeta | null>(null);
  const [templateLookupLoading, setTemplateLookupLoading] = useState(false);
  const [slotValues, setSlotValues] = useState<string[]>([]);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailMode, setEmailMode] = useState<"plain" | "html">("plain");
  const [emailBody, setEmailBody] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  const isEdit = Boolean(bindingId);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return events.filter((e) => {
      if (!q) return true;
      return `${e.code} ${e.name}`.toLowerCase().includes(q);
    });
  }, [eventSearch, events]);

  const variableFields = useMemo(
    () => selectedEvent?.variable_fields ?? [],
    [selectedEvent]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, svcRes] = await Promise.all([
        notificationsCatalogApi.getEvents(),
        notificationsApi.listServices(),
      ]);
      const catalog = evRes.data.data;
      setEvents(catalog);
      setServices(svcRes.data.data);

      if (bindingId) {
        const bindings = await notificationBindingsApi.list();
        const row = bindings.data.data.find((b) => b.id === Number(bindingId));
        if (!row) throw new Error("Binding not found");
        const ev = catalog.find((c) => c.code === row.event_code) ?? null;
        setSelectedEvent(ev);
        setRecipientType(row.recipient_type);
        setCustomPhones((row.recipient_config?.phones ?? []).join("\n"));
        setCustomEmails((row.recipient_config?.emails ?? []).join("\n"));
        const sk = row.service_key ?? row.notification_services[0]?.service_key;
        const svc = sk ? svcRes.data.data.find((s) => s.service_key === sk) : undefined;
        if (svc) {
          setEditingServiceId(svc.notification_service_id);
          setChannel(svc.channel);
          setDisplayName(svc.display_name);
          setTemplateName(svc.template_name ?? "");
          setEmailSubject(svc.email_subject ?? "");
          setEmailBody(svc.email_body ?? "");
          setEmailHtml(svc.email_html ?? "");
          setEmailMode(svc.email_html ? "html" : "plain");
          const tv = svc.template_variables;
          if (tv && typeof tv === "object" && !Array.isArray(tv) && Array.isArray((tv as { slots?: unknown }).slots)) {
            const slots = (tv as { slots: { index: number; source: string; value?: string }[] }).slots;
            const ordered = [...slots].sort((a, b) => a.index - b.index);
            setSlotValues(ordered.map((s) => (s.source === "literal" ? s.value ?? "" : `{{${s.source}}}`)));
          }
        }
        setStep(3);
      } else if (presetEventCode) {
        const ev = catalog.find((c) => c.code === presetEventCode) ?? null;
        setSelectedEvent(ev);
        if (ev?.default_recipients[0]) setRecipientType(ev.default_recipients[0]);
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [bindingId, presetEventCode]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const lookupTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    setTemplateLookupLoading(true);
    setError(null);
    try {
      const res = await notificationsCatalogApi.getWhatsappTemplate(name);
      const meta = res.data.data;
      setTemplateMeta(meta);
      const count = meta.body_positional_count ?? 0;
      if (count > 0) {
        setSlotValues(Array.from({ length: count }, () => ""));
      }
    } catch (err) {
      setError(getApiError(err));
      setTemplateMeta(null);
    } finally {
      setTemplateLookupLoading(false);
    }
  };

  const buildSlots = () =>
    slotValues.map((val, i) => {
      const trimmed = val.trim();
      const varMatch = /^\{\{(.+)\}\}$/.exec(trimmed);
      if (varMatch) {
        return { index: i + 1, source: varMatch[1].trim() };
      }
      return { index: i + 1, source: "literal", value: trimmed };
    });

  const buildPayload = (): WizardBindingPayload => {
    if (!selectedEvent) throw new Error("Select an event");
    const service = {
      notification_service_id: editingServiceId,
      display_name: displayName.trim() || undefined,
      channel,
      template_name: channel === "whatsapp" ? templateName.trim() || null : null,
      template_slots: channel === "whatsapp" ? buildSlots() : undefined,
      email_subject: channel === "email" ? emailSubject.trim() || null : null,
      email_body: channel === "email" && emailMode === "plain" ? emailBody.trim() || null : null,
      email_html: channel === "email" && emailMode === "html" ? emailHtml.trim() || null : null,
      is_active: true,
    };
    const body: WizardBindingPayload = {
      event_code: selectedEvent.code,
      recipient_type: recipientType,
      engagement_type_id: engagementTypeId > 0 ? engagementTypeId : null,
      service,
    };
    if (recipientType === "custom") {
      body.recipient_config = {
        phones: customPhones.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
        emails: customEmails.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
      };
    }
    return body;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (channel === "whatsapp" && templateMeta && templateMeta.status !== "APPROVED") {
        throw new Error("WhatsApp template must be APPROVED before saving.");
      }
      const payload = buildPayload();
      if (mode === "engagement") {
        if (engagementId > 0) {
          await engagementNotificationsApi.saveWizard(engagementId, {
            event_code: payload.event_code,
            service: payload.service,
          });
        } else {
          navigate(returnTo, {
            state: {
              engagementNotificationDraft: {
                event_code: payload.event_code,
                notification_services: [
                  {
                    service_key:
                      payload.service.service_key ??
                      `${payload.event_code.replace(/\./g, "-")}-${payload.service.channel}`,
                  },
                ],
                wizardService: payload.service,
              },
            },
          });
          return;
        }
        navigate(returnTo);
        return;
      }
      if (isEdit && bindingId) {
        await notificationBindingsApi.updateWizard(Number(bindingId), payload);
      } else {
        await notificationBindingsApi.createWizard(payload);
      }
      navigate("/notifications/notifications");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link
        to={returnTo}
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-xl font-semibold text-zinc-900 mb-1">
        {isEdit ? "Edit notification binding" : "Create notification binding"}
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Step {step} of 3 — {step === 1 ? "Event" : step === 2 ? "Recipient" : "Content"}
        {mode === "engagement" && " (engagement override: content only affects this engagement)"}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm"
            />
          </div>
          <ul className="max-h-96 overflow-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100">
            {filteredEvents.map((ev) => (
              <li key={ev.code}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(ev);
                    setRecipientType(ev.default_recipients[0] ?? "user");
                    setDisplayName(ev.name);
                    setStep(2);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-50"
                >
                  <div className="font-medium text-zinc-900">{ev.name}</div>
                  <div className="text-xs font-mono text-zinc-500">{ev.code}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 2 && selectedEvent && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Event: <span className="font-medium">{selectedEvent.name}</span>
          </p>
          {mode === "engagement" ? (
            <div className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600">
              Recipients are configured globally for this event. This engagement setup only changes which
              message content is sent.
            </div>
          ) : (
            <div className="space-y-2">
              {[...selectedEvent.default_recipients, "custom"]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((rt) => (
                  <label key={rt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipient"
                      checked={recipientType === rt}
                      onChange={() => setRecipientType(rt)}
                    />
                    <span className="text-sm">{RECIPIENT_LABELS[rt] ?? rt}</span>
                  </label>
                ))}
            </div>
          )}
          {recipientType === "custom" && mode === "global" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Phone numbers (one per line)
                <textarea
                  value={customPhones}
                  onChange={(e) => setCustomPhones(e.target.value)}
                  className="mt-1 w-full border rounded-lg p-2 text-sm min-h-[80px]"
                />
              </label>
              <label className="block text-sm">
                Email addresses (one per line)
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  className="mt-1 w-full border rounded-lg p-2 text-sm min-h-[80px]"
                />
              </label>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-sm">
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && selectedEvent && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`px-3 py-1.5 rounded-full text-xs border ${channel === "whatsapp" ? "bg-zinc-900 text-white" : ""}`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`px-3 py-1.5 rounded-full text-xs border ${channel === "email" ? "bg-zinc-900 text-white" : ""}`}
            >
              Email
            </button>
          </div>

          <label className="block text-sm">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>

          {channel === "whatsapp" && (
            <>
              <div className="flex gap-2 items-end">
                <label className="flex-1 text-sm">
                  Template name
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={lookupTemplate}
                  disabled={templateLookupLoading}
                  className="px-3 py-2 border rounded-lg text-sm shrink-0"
                >
                  {templateLookupLoading ? "Looking up…" : "Look up"}
                </button>
              </div>
              {templateMeta?.found && (
                <PackageInfo meta={templateMeta} />
              )}
              {slotValues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Template variables (use {"{{field}}"} or literal text)</p>
                  {slotValues.map((val, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-xs text-zinc-500 w-8 pt-2">{i + 1}</span>
                      <input
                        value={val}
                        onChange={(e) => {
                          const next = [...slotValues];
                          next[i] = e.target.value;
                          setSlotValues(next);
                        }}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <select
                        className="border rounded-lg text-xs"
                        onChange={(e) => {
                          const f = e.target.value;
                          if (!f) return;
                          const next = [...slotValues];
                          next[i] = `{{${f}}}`;
                          setSlotValues(next);
                        }}
                        defaultValue=""
                      >
                        <option value="">Insert…</option>
                        {variableFields.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {channel === "email" && (
            <>
              <label className="block text-sm">
                Subject
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmailMode("plain")}
                  className={`text-xs px-2 py-1 border rounded ${emailMode === "plain" ? "bg-zinc-100" : ""}`}
                >
                  Plain text
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode("html")}
                  className={`text-xs px-2 py-1 border rounded ${emailMode === "html" ? "bg-zinc-100" : ""}`}
                >
                  HTML
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {variableFields.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      const token = `{{${f}}}`;
                      if (emailMode === "html") setEmailHtml((prev) => prev + token);
                      else setEmailBody((prev) => prev + token);
                    }}
                    className="text-xs px-2 py-0.5 rounded border bg-zinc-50"
                  >
                    {f}
                  </button>
                ))}
              </div>
              <textarea
                value={emailMode === "html" ? emailHtml : emailBody}
                onChange={(e) =>
                  emailMode === "html" ? setEmailHtml(e.target.value) : setEmailBody(e.target.value)
                }
                className="w-full border rounded-lg p-3 text-sm min-h-[140px] font-mono"
              />
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="text-sm text-zinc-700 underline"
              >
                Preview
              </button>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(mode === "engagement" ? 1 : 2)} className="px-4 py-2 border rounded-lg text-sm">
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save notification"}
            </button>
          </div>
        </div>
      )}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Email preview">
        <div className="prose prose-sm max-w-none">
          <p className="font-medium">{emailSubject || "(no subject)"}</p>
          {emailMode === "html" ? (
            <div dangerouslySetInnerHTML={{ __html: emailHtml || "<p>(empty)</p>" }} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm">{emailBody || "(empty)"}</pre>
          )}
        </div>
      </Modal>
    </div>
  );
}

function PackageInfo({ meta }: { meta: WhatsappTemplateMeta }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 text-xs space-y-1">
      <p>
        <span className="text-zinc-500">Status:</span>{" "}
        <span className={meta.status === "APPROVED" ? "text-emerald-700" : "text-amber-700"}>
          {meta.status}
        </span>
      </p>
      <p>
        Language: {meta.language} · Category: {meta.category} · Variables: {meta.body_positional_count ?? 0}
      </p>
      {meta.status !== "APPROVED" && (
        <p className="text-amber-700">Only APPROVED templates can be used for sending.</p>
      )}
    </div>
  );
}
