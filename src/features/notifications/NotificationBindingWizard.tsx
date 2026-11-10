import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Search } from "lucide-react";
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
import {
  RECIPIENT_LABELS,
  WIZARD_RECIPIENT_TYPES,
  catalogEventForBinding,
  defaultRecipientForWizard,
  filterChipClass,
  recipientPayloadHint,
  selectableRowClass,
} from "./notificationsUiShared";

type Step = 1 | 2 | 3;
type ServiceMode = "reuse" | "create";

function parseWizardStepParam(raw: string | null): Step | null {
  if (raw === "2") return 2;
  if (raw === "3") return 3;
  return null;
}

function applyServiceFromItem(
  svc: NotificationServiceItem,
  handlers: {
    setEditingServiceId: (id: number) => void;
    setChannel: (c: "whatsapp" | "email") => void;
    setDisplayName: (v: string) => void;
    setTemplateName: (v: string) => void;
    setEmailSubject: (v: string) => void;
    setEmailBody: (v: string) => void;
    setEmailHtml: (v: string) => void;
    setEmailMode: (m: "plain" | "html") => void;
    setSlotValues: (v: string[]) => void;
    setTemplateMeta: (m: WhatsappTemplateMeta | null) => void;
  }
) {
  handlers.setEditingServiceId(svc.notification_service_id);
  handlers.setChannel(svc.channel);
  handlers.setDisplayName(svc.display_name);
  handlers.setTemplateName(svc.template_name ?? "");
  handlers.setEmailSubject(svc.email_subject ?? "");
  handlers.setEmailBody(svc.email_body ?? "");
  handlers.setEmailHtml(svc.email_html ?? "");
  handlers.setEmailMode(svc.email_html ? "html" : "plain");
  handlers.setTemplateMeta(null);
  const tv = svc.template_variables;
  if (tv && typeof tv === "object" && !Array.isArray(tv) && Array.isArray((tv as { slots?: unknown }).slots)) {
    const slots = (tv as { slots: { index: number; source: string; value?: string }[] }).slots;
    const ordered = [...slots].sort((a, b) => a.index - b.index);
    handlers.setSlotValues(
      ordered.map((s) => (s.source === "literal" ? s.value ?? "" : `{{${s.source}}}`))
    );
  } else {
    handlers.setSlotValues([]);
  }
}

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
  const wizardStepParam = searchParams.get("step");

  const [step, setStep] = useState<Step>(() => {
    const fromUrl = parseWizardStepParam(wizardStepParam);
    if (fromUrl) return fromUrl;
    return presetEventCode ? 2 : 1;
  });
  const [events, setEvents] = useState<CatalogEventItem[]>([]);
  const [services, setServices] = useState<NotificationServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("create");

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
      const haystack = `${e.code} ${e.name} ${e.trigger_notes}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [eventSearch, events]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((s) => {
      if (!q) return true;
      return `${s.service_key} ${s.display_name} ${s.template_name ?? ""} ${s.channel}`.toLowerCase().includes(q);
    });
  }, [serviceSearch, services]);

  const variableFields = useMemo(() => selectedEvent?.variable_fields ?? [], [selectedEvent]);

  const serviceHandlers = useMemo(
    () => ({
      setEditingServiceId,
      setChannel,
      setDisplayName,
      setTemplateName,
      setEmailSubject,
      setEmailBody,
      setEmailHtml,
      setEmailMode,
      setSlotValues,
      setTemplateMeta,
    }),
  []);

  const selectServiceForReuse = useCallback(
    (svc: NotificationServiceItem) => {
      applyServiceFromItem(svc, serviceHandlers);
      setServiceMode("reuse");
    },
    [serviceHandlers]
  );

  const resetCreateServiceForm = useCallback(() => {
    setEditingServiceId(null);
    setTemplateName("");
    setTemplateMeta(null);
    setSlotValues([]);
    setEmailSubject("");
    setEmailBody("");
    setEmailHtml("");
    setEmailMode("plain");
    if (selectedEvent) setDisplayName(selectedEvent.name);
  }, [selectedEvent]);

  const pickEvent = useCallback(
    (ev: CatalogEventItem) => {
      setSelectedEvent(ev);
      setRecipientType(defaultRecipientForWizard(ev));
      setDisplayName(ev.name);
      setStep(2);
    },
    []
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
        const row = (await notificationBindingsApi.get(Number(bindingId))).data.data;
        const ev = catalogEventForBinding(catalog, row);
        setSelectedEvent(ev);
        setRecipientType(row.recipient_type === "booker" ? "user" : row.recipient_type);
        setCustomPhones((row.recipient_config?.phones ?? []).join("\n"));
        setCustomEmails((row.recipient_config?.emails ?? []).join("\n"));
        const sk = row.service_key ?? row.notification_services[0]?.service_key;
        const svc = sk ? svcRes.data.data.find((s) => s.service_key === sk) : undefined;
        if (svc) {
          applyServiceFromItem(svc, serviceHandlers);
          setServiceMode("create");
        }
        setStep(parseWizardStepParam(wizardStepParam) ?? 2);
      } else if (presetEventCode) {
        const ev = catalog.find((c) => c.code === presetEventCode) ?? null;
        setSelectedEvent(ev);
        if (ev) {
          setRecipientType(defaultRecipientForWizard(ev));
          setDisplayName(ev.name);
        }
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [bindingId, presetEventCode, serviceHandlers, wizardStepParam]);

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
      if (serviceMode === "reuse" && editingServiceId == null) {
        throw new Error("Select an existing notification service to reuse.");
      }
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

  const stepTitle = step === 1 ? "Event" : step === 2 ? "Recipient" : "Content";

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto">
      <Link
        to={returnTo}
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <header>
            <h1 className="text-xl font-semibold text-zinc-900">
              {isEdit ? "Edit notification binding" : "Create notification binding"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Step {step} of 3 — {stepTitle}
              {mode === "engagement" && " (engagement override: content only affects this engagement)"}
            </p>
          </header>
          {selectedEvent && step > 1 ? (
            <span className="inline-flex max-w-md items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700">
              <span className="font-medium truncate">{selectedEvent.name}</span>
              <span className="mx-1.5 text-zinc-400">·</span>
              <span className="font-mono truncate text-zinc-500">{selectedEvent.code}</span>
            </span>
          ) : null}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search events…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 max-h-[min(32rem,70vh)] overflow-y-auto pr-1">
              {filteredEvents.map((ev) => {
                const selected = selectedEvent?.code === ev.code;
                return (
                  <button
                    key={ev.code}
                    type="button"
                    onClick={() => pickEvent(ev)}
                    className={selectableRowClass(selected)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-left">
                        <div className="font-medium text-zinc-900">{ev.name}</div>
                        <div className="text-xs font-mono text-zinc-500 mt-0.5">{ev.code}</div>
                        {ev.trigger_notes ? (
                          <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{ev.trigger_notes}</p>
                        ) : null}
                      </div>
                      {selected ? <Check className="w-5 h-5 text-zinc-900 shrink-0" aria-hidden /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">No events match your search.</p>
            ) : null}
          </div>
        )}

        {step === 2 && selectedEvent && (
          <div className="space-y-5">
            {mode === "engagement" ? (
              <div className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600">
                Recipients are configured globally for this event. This engagement setup only changes which
                message content is sent.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {WIZARD_RECIPIENT_TYPES.map((rt) => {
                  const hint = recipientPayloadHint(rt, selectedEvent);
                  const selected = recipientType === rt;
                  return (
                    <button
                      key={rt}
                      type="button"
                      onClick={() => setRecipientType(rt)}
                      className={selectableRowClass(selected)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-left min-w-0">
                          <p className="text-sm font-medium text-zinc-900">
                            {RECIPIENT_LABELS[rt] ?? rt}
                          </p>
                          {hint ? (
                            <p className="text-xs text-zinc-500 mt-1 font-mono leading-snug">{hint}</p>
                          ) : null}
                        </div>
                        {selected ? <Check className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {recipientType === "custom" && mode === "global" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-zinc-800">
                  Phone numbers (one per line)
                  <textarea
                    value={customPhones}
                    onChange={(e) => setCustomPhones(e.target.value)}
                    className="mt-1 w-full border border-zinc-300 rounded-lg p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </label>
                <label className="block text-sm text-zinc-800">
                  Email addresses (one per line)
                  <textarea
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                    className="mt-1 w-full border border-zinc-300 rounded-lg p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </label>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-zinc-300 rounded-lg text-sm hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!recipientType && mode === "global"}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && !selectedEvent && (
          <p className="text-sm text-zinc-600">
            This binding’s event could not be matched to the catalog. Use Back and pick the event again,
            or contact engineering if the event code in the database is wrong.
          </p>
        )}

        {step === 3 && selectedEvent && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setServiceMode("reuse");
                }}
                className={filterChipClass(serviceMode === "reuse")}
              >
                Reuse existing
              </button>
              <button
                type="button"
                onClick={() => {
                  setServiceMode("create");
                  resetCreateServiceForm();
                }}
                className={filterChipClass(serviceMode === "create")}
              >
                Create new
              </button>
            </div>

            {serviceMode === "reuse" ? (
              <div className="space-y-3">
                <div className="relative max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="search"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search services…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
                  {filteredServices.map((svc) => {
                    const selected = editingServiceId === svc.notification_service_id;
                    return (
                      <button
                        key={svc.notification_service_id}
                        type="button"
                        onClick={() => selectServiceForReuse(svc)}
                        className={selectableRowClass(selected)}
                      >
                        <div className="flex items-start justify-between gap-2 text-left w-full">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{svc.display_name}</p>
                            <p className="text-xs font-mono text-zinc-500 mt-0.5">{svc.service_key}</p>
                            <p className="text-xs text-zinc-500 mt-1 capitalize">{svc.channel}</p>
                          </div>
                          {selected ? <Check className="w-4 h-4 shrink-0 text-zinc-900" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {editingServiceId != null ? (
                  <p className="text-xs text-zinc-600">
                    Selected service will be linked to this binding. You can adjust fields below before
                    saving.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">Pick a service to attach to this event and recipient.</p>
                )}
              </div>
            ) : null}

            {(serviceMode === "create" || editingServiceId != null) && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel("whatsapp")}
                    className={filterChipClass(channel === "whatsapp")}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel("email")}
                    className={filterChipClass(channel === "email")}
                  >
                    Email
                  </button>
                </div>

                <label className="block text-sm text-zinc-800">
                  Display name
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full max-w-2xl border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </label>

                {channel === "whatsapp" && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-end max-w-3xl">
                      <label className="flex-1 text-sm text-zinc-800">
                        Template name
                        <input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="mt-1 w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={lookupTemplate}
                        disabled={templateLookupLoading}
                        className="px-3 py-2 border border-zinc-300 rounded-lg text-sm shrink-0 hover:bg-zinc-50"
                      >
                        {templateLookupLoading ? "Looking up…" : "Look up"}
                      </button>
                    </div>
                    {templateMeta?.found && <PackageInfo meta={templateMeta} />}
                    {slotValues.length > 0 && (
                      <div className="space-y-2 max-w-3xl">
                        <p className="text-xs text-zinc-500">
                          Template variables (use {"{{field}}"} or literal text)
                        </p>
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
                              className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm"
                            />
                            <select
                              className="border border-zinc-300 rounded-lg text-xs"
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
                  <div className="space-y-3 max-w-3xl">
                    <label className="block text-sm text-zinc-800">
                      Subject
                      <input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="mt-1 w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEmailMode("plain")}
                        className={filterChipClass(emailMode === "plain")}
                      >
                        Plain text
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailMode("html")}
                        className={filterChipClass(emailMode === "html")}
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
                          className="text-xs px-2 py-0.5 rounded-full border bg-zinc-50 hover:bg-zinc-100"
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
                      className="w-full border border-zinc-300 rounded-lg p-3 text-sm min-h-[140px] font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="text-sm text-zinc-700 underline"
                    >
                      Preview
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(mode === "engagement" ? 1 : 2)}
                className="px-4 py-2 border border-zinc-300 rounded-lg text-sm hover:bg-zinc-50"
              >
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
      </div>

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
    <div className="rounded-lg border border-zinc-200 p-3 text-xs space-y-1 max-w-3xl">
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
