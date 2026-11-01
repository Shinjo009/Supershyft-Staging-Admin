import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import {
  engagementNotificationsApi,
  getApiError,
  notificationEventBindingsApi,
  notificationEventsCatalogApi,
  notificationsApi,
  type CatalogEventItem,
  type CatalogGroupItem,
  type NotificationEventBindingItem,
  type NotificationEventsCatalog,
  type NotificationServiceItem,
  type NotificationServiceConfigItem,
  type WhatsappTemplateAdminView,
} from "../../../lib/api";

const SERVICE_KEY_RE = /^[a-z][a-z0-9_]*$/;

function filterChipClass(active: boolean): string {
  return `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active
      ? "bg-zinc-900 text-white border-zinc-900"
      : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400"
  }`;
}

function flattenCatalogEvents(catalog: NotificationEventsCatalog | null): CatalogEventItem[] {
  if (!catalog) return [];
  return catalog.groups.flatMap((g: CatalogGroupItem) => g.events);
}

function findCatalogEvent(catalog: NotificationEventsCatalog | null, code: string): CatalogEventItem | null {
  return flattenCatalogEvents(catalog).find((e) => e.event_code === code) ?? null;
}

function variablePathsForEvent(
  catalog: NotificationEventsCatalog | null,
  event: CatalogEventItem | null
): string[] {
  if (!catalog || !event) return [];
  const paths = new Set<string>();
  for (const bag of event.variable_bags) {
    const fields = catalog.shared_variable_bags[bag] ?? [];
    for (const f of fields) paths.add(`${bag}.${f}`);
  }
  for (const v of event.extra_variables) paths.add(v);
  return Array.from(paths).sort();
}

function interpolatePreview(template: string, sample: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key: string) => sample[key.trim()] ?? `{{${key}}}`);
}

function buildSampleObject(paths: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of paths) out[p] = `[${p}]`;
  return out;
}

export type BindingWizardCompletePayload = {
  event_code: string;
  recipient_type: string;
  notification_services: NotificationServiceConfigItem[];
};

export type NotificationBindingWizardProps = {
  mode?: "global" | "engagement";
  engagementId?: number | null;
  initialEventCode?: string | null;
  bindingId?: number | null;
  onComplete?: (payload: BindingWizardCompletePayload) => void;
  onCancel?: () => void;
};

export function NotificationBindingWizard({
  mode = "global",
  engagementId = null,
  initialEventCode = null,
  bindingId = null,
  onComplete,
  onCancel,
}: NotificationBindingWizardProps) {
  const [step, setStep] = useState(initialEventCode ? 2 : 1);
  const [catalog, setCatalog] = useState<NotificationEventsCatalog | null>(null);
  const [services, setServices] = useState<NotificationServiceItem[]>([]);
  const [existingBinding, setExistingBinding] = useState<NotificationEventBindingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [eventCode, setEventCode] = useState(initialEventCode ?? "");
  const [recipientType, setRecipientType] = useState("");
  const [customPhones, setCustomPhones] = useState("");
  const [customEmails, setCustomEmails] = useState("");
  const [discountFilter, setDiscountFilter] = useState("");

  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [contentMode, setContentMode] = useState<"existing" | "inline">("existing");
  const [selectedServiceKey, setSelectedServiceKey] = useState("");
  const [inlineServiceKey, setInlineServiceKey] = useState("");
  const [inlineDisplayName, setInlineDisplayName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateVarsJson, setTemplateVarsJson] = useState("[]");
  const [templateMeta, setTemplateMeta] = useState<WhatsappTemplateAdminView | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [emailMode, setEmailMode] = useState<"text" | "html">("text");
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const selectedEvent = useMemo(
    () => findCatalogEvent(catalog, eventCode),
    [catalog, eventCode]
  );

  const variablePaths = useMemo(
    () => variablePathsForEvent(catalog, selectedEvent),
    [catalog, selectedEvent]
  );

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const events = flattenCatalogEvents(catalog);
    if (!q) return events;
    return events.filter(
      (e) =>
        e.event_code.toLowerCase().includes(q) ||
        e.event_name.toLowerCase().includes(q) ||
        e.group.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  const channelServices = useMemo(
    () => services.filter((s) => s.is_active && s.channel === channel),
    [services, channel]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [catRes, svcRes, bindRes] = await Promise.all([
          notificationEventsCatalogApi.getCatalog(),
          notificationsApi.listServices(),
          bindingId != null ? notificationEventBindingsApi.list() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCatalog(catRes.data.data);
        setServices(svcRes.data.data ?? []);
        if (bindingId != null && bindRes) {
          const row = (bindRes.data.data ?? []).find((b: NotificationEventBindingItem) => b.id === bindingId) ?? null;
          setExistingBinding(row);
          if (row) {
            setEventCode(row.event_code);
            setRecipientType(row.recipient_type);
            setSelectedServiceKey(row.notification_services[0] ?? "");
            setContentMode("existing");
            const phones = row.custom_contacts?.phones ?? [];
            const emails = row.custom_contacts?.emails ?? [];
            setCustomPhones(phones.join("\n"));
            setCustomEmails(emails.join("\n"));
            const dc = row.filters?.discount_code;
            if (typeof dc === "string") setDiscountFilter(dc);
          }
        } else if (initialEventCode) {
          setEventCode(initialEventCode);
        }
      } catch (err) {
        if (!cancelled) setError(getApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bindingId, initialEventCode]);

  useEffect(() => {
    if (!selectedEvent || recipientType) return;
    if (selectedEvent.recipient_types.length === 1) {
      setRecipientType(selectedEvent.recipient_types[0] ?? "");
    }
  }, [recipientType, selectedEvent]);

  const fetchTemplate = useCallback(async () => {
    const name = templateName.trim();
    if (!name) {
      setTemplateMeta(null);
      return;
    }
    setTemplateLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.fetchWhatsappTemplate(name);
      setTemplateMeta(res.data.data);
    } catch (err) {
      setTemplateMeta(null);
      setError(getApiError(err));
    } finally {
      setTemplateLoading(false);
    }
  }, [templateName]);

  const insertVariable = (path: string, target: "email" | "vars") => {
    const token = `{{${path}}}`;
    if (target === "email") {
      if (emailMode === "html") setEmailHtml((v) => `${v}${token}`);
      else setEmailBody((v) => `${v}${token}`);
    } else {
      setTemplateVarsJson((v) => `${v}${token}`);
    }
  };

  const resolveServiceKey = (): string => {
    if (contentMode === "existing") return selectedServiceKey.trim();
    return inlineServiceKey.trim();
  };

  const handleSave = async () => {
    if (!selectedEvent) {
      setError("Select an event.");
      setStep(1);
      return;
    }
    if (!recipientType.trim()) {
      setError("Select a recipient type.");
      setStep(2);
      return;
    }
    const serviceKey = resolveServiceKey();
    if (!serviceKey) {
      setError("Select or create a notification service.");
      return;
    }
    if (contentMode === "inline" && !SERVICE_KEY_RE.test(serviceKey)) {
      setError("Service key must be lowercase letters, numbers, and underscores (start with a letter).");
      return;
    }
    if (channel === "whatsapp" && contentMode === "inline") {
      if (!templateName.trim()) {
        setError("WhatsApp template name is required.");
        return;
      }
      if (templateMeta && templateMeta.status !== "APPROVED") {
        setError(`Template status is ${templateMeta.status}; only APPROVED templates can be saved.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (contentMode === "inline") {
        let templateVariables: unknown = undefined;
        if (channel === "whatsapp") {
          templateVariables = JSON.parse(templateVarsJson || "[]") as unknown;
        }
        const existing = services.find((s) => s.service_key === serviceKey);
        if (existing) {
          await notificationsApi.updateService(existing.notification_service_id, {
            display_name: inlineDisplayName.trim() || existing.display_name,
            channel,
            ...(channel === "whatsapp"
              ? { template_name: templateName.trim(), template_variables: templateVariables }
              : {
                  email_subject: emailSubject.trim() || null,
                  email_body: emailMode === "text" ? emailBody.trim() || null : null,
                  email_html:
                    emailMode === "html" ? emailHtml.trim() || emailBody.trim() || null : null,
                }),
          });
        } else {
          await notificationsApi.createService({
            service_key: serviceKey,
            display_name: inlineDisplayName.trim() || serviceKey,
            channel,
            ...(channel === "whatsapp"
              ? { template_name: templateName.trim(), template_variables: templateVariables }
              : {
                  email_subject: emailSubject.trim() || null,
                  email_body: emailMode === "text" ? emailBody.trim() || null : null,
                  email_html:
                    emailMode === "html" ? emailHtml.trim() || emailBody.trim() || null : null,
                }),
          });
        }
      }

      const customContacts =
        recipientType === "custom"
          ? {
              phones: customPhones
                .split(/[\n,]+/)
                .map((p) => p.trim())
                .filter(Boolean),
              emails: customEmails
                .split(/[\n,]+/)
                .map((e) => e.trim())
                .filter(Boolean),
            }
          : null;
      const filters = discountFilter.trim() ? { discount_code: discountFilter.trim() } : null;

      const notificationServices = [serviceKey];
      const completePayload: BindingWizardCompletePayload = {
        event_code: selectedEvent.event_code,
        recipient_type: recipientType,
        notification_services: notificationServices.map((sk) => ({ service_key: sk, external_link: null })),
      };

      if (mode === "engagement") {
        if (engagementId != null) {
          await engagementNotificationsApi.upsertForEngagement(engagementId, [
            {
              event_code: selectedEvent.event_code,
              recipient_type: recipientType,
              notification_services: completePayload.notification_services,
            },
          ]);
        }
        onComplete?.(completePayload);
        return;
      }

      if (bindingId != null && existingBinding) {
        await notificationEventBindingsApi.update(bindingId, {
          notification_services: notificationServices,
          custom_contacts: customContacts,
          filters,
        });
      } else {
        await notificationEventBindingsApi.create({
          event_code: selectedEvent.event_code,
          recipient_type: recipientType,
          notification_services: notificationServices,
          custom_contacts: customContacts,
          filters,
        });
      }
      onComplete?.(completePayload);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const sampleObj = buildSampleObject(variablePaths);
  const emailPreviewSource = emailMode === "html" ? emailHtml || emailBody : emailBody;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-zinc-500">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`px-2 py-1 rounded ${step === n ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
          >
            Step {n}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Choose event</h2>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm"
            />
          </div>
          <div className="max-h-[28rem] overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100">
            {filteredEvents.map((ev) => {
              const selected = eventCode === ev.event_code;
              return (
                <button
                  key={ev.event_code}
                  type="button"
                  onClick={() => setEventCode(ev.event_code)}
                  className={`w-full text-left px-4 py-3 hover:bg-zinc-50 ${selected ? "bg-emerald-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-900">{ev.event_name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        ev.is_live_today
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {ev.is_live_today ? "Live" : "Proposed"}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5">{ev.event_code}</p>
                  <p className="text-xs text-zinc-600 mt-1">{ev.trigger_description}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {step === 2 && selectedEvent ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Recipient</h2>
          <p className="text-sm text-zinc-600">
            Event: <span className="font-mono">{selectedEvent.event_code}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedEvent.recipient_types.map((rt: string) => (
              <button
                key={rt}
                type="button"
                onClick={() => setRecipientType(rt)}
                className={filterChipClass(recipientType === rt)}
              >
                {rt}
              </button>
            ))}
          </div>
          {recipientType === "custom" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Phones</label>
                <textarea
                  value={customPhones}
                  onChange={(e) => setCustomPhones(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  placeholder="One per line"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Emails</label>
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  placeholder="One per line"
                />
              </div>
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Filter: discount code (optional)
            </label>
            <input
              type="text"
              value={discountFilter}
              onChange={(e) => setDiscountFilter(e.target.value)}
              className="w-full max-w-sm px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Content</h2>
          <div className="flex flex-wrap gap-2">
            {(["whatsapp", "email"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={filterChipClass(channel === ch)}
              >
                {ch}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setContentMode("existing")}
              className={filterChipClass(contentMode === "existing")}
            >
              Use existing service
            </button>
            <button
              type="button"
              onClick={() => setContentMode("inline")}
              className={filterChipClass(contentMode === "inline")}
            >
              Create or edit inline
            </button>
          </div>
          {contentMode === "existing" ? (
            <select
              value={selectedServiceKey}
              onChange={(e) => setSelectedServiceKey(e.target.value)}
              className="w-full max-w-lg px-3 py-2 rounded-lg border border-zinc-300 text-sm"
            >
              <option value="">Select service…</option>
              {channelServices.map((s) => (
                <option key={s.service_key} value={s.service_key}>
                  {s.display_name} ({s.service_key})
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-3 border border-zinc-200 rounded-xl p-4">
              <input
                type="text"
                value={inlineServiceKey}
                onChange={(e) => setInlineServiceKey(e.target.value)}
                placeholder="service_key"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
              />
              <input
                type="text"
                value={inlineDisplayName}
                onChange={(e) => setInlineDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
              />
              {channel === "whatsapp" ? (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void fetchTemplate()}
                      disabled={templateLoading}
                      className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                    >
                      {templateLoading ? "…" : "Fetch"}
                    </button>
                  </div>
                  {templateMeta ? (
                    <p className="text-xs text-zinc-600">
                      Status: {templateMeta.status} · params:{" "}
                      {templateMeta.components.map((c: WhatsappTemplateAdminView["components"][number]) => c.parameter_count).join(", ")}
                    </p>
                  ) : null}
                  <textarea
                    value={templateVarsJson}
                    onChange={(e) => setTemplateVarsJson(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEmailMode("text")} className={filterChipClass(emailMode === "text")}>
                      Text
                    </button>
                    <button type="button" onClick={() => setEmailMode("html")} className={filterChipClass(emailMode === "html")}>
                      HTML
                    </button>
                  </div>
                  <textarea
                    value={emailMode === "html" ? emailHtml : emailBody}
                    onChange={(e) =>
                      emailMode === "html"
                        ? setEmailHtml(e.target.value)
                        : setEmailBody(e.target.value)
                    }
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview((v) => !v)}
                    className="text-sm text-zinc-700 underline"
                  >
                    {showEmailPreview ? "Hide preview" : "Preview"}
                  </button>
                  {showEmailPreview ? (
                    <pre className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-3 whitespace-pre-wrap">
                      Subject: {interpolatePreview(emailSubject, sampleObj)}
                      {"\n\n"}
                      {interpolatePreview(emailPreviewSource, sampleObj)}
                    </pre>
                  ) : null}
                </>
              )}
            </div>
          )}
          {variablePaths.length > 0 ? (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Insert variable</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {variablePaths.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      insertVariable(p, channel === "whatsapp" && contentMode === "inline" ? "vars" : "email")
                    }
                    className="px-2 py-0.5 rounded-full text-xs border bg-zinc-50 border-zinc-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-zinc-300 text-sm"
        >
          Cancel
        </button>
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 rounded-lg border border-zinc-300 text-sm"
          >
            Back
          </button>
        ) : null}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !eventCode) {
                setError("Select an event to continue.");
                return;
              }
              if (step === 2 && !recipientType) {
                setError("Select a recipient type.");
                return;
              }
              setError(null);
              setStep((s) => s + 1);
            }}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "engagement" ? "Save for engagement" : "Save binding"}
          </button>
        )}
      </div>
    </div>
  );
}

export function NotificationBindingWizardPage() {
  const navigate = useNavigate();
  const { bindingId } = useParams<{ bindingId?: string }>();
  const [searchParams] = useSearchParams();
  const engagementIdRaw = searchParams.get("engagementId");
  const engagementId = engagementIdRaw ? Number(engagementIdRaw) : null;
  const mode = searchParams.get("mode") === "engagement" || engagementId != null ? "engagement" : "global";
  const initialEventCode = searchParams.get("event_code");
  const returnTo = searchParams.get("return") || "/notifications/notifications";

  const parsedBindingId = bindingId ? Number(bindingId) : null;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(returnTo)}
        className="inline-flex items-center gap-1 text-sm text-zinc-600 mb-4 hover:text-zinc-900"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">
        {parsedBindingId ? "Edit notification binding" : "New notification binding"}
      </h1>
      <NotificationBindingWizard
        mode={mode}
        engagementId={engagementId}
        initialEventCode={initialEventCode}
        bindingId={parsedBindingId}
        onCancel={() => navigate(returnTo)}
        onComplete={() => navigate(returnTo)}
      />
    </div>
  );
}
