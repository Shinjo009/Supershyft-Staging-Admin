import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import { usePageHeader } from "../../layouts/PageHeaderActions";
import { usePermissions } from "../../contexts/PermissionContext";
import {
  getApiError,
  notificationCatalogApi,
  engagementNotificationsApi,
  engagementsApi,
  notificationEventBindingsApi,
  notificationWhatsAppTemplatesApi,
  notificationsApi,
  type NotificationCatalogEvent,
  type EngagementNotificationItem,
  type NotificationEventBindingItem,
  type NotificationServiceItem,
  type WhatsAppTemplateMeta,
} from "../../lib/api";
import { WizardStepIndicator } from "./WizardStepIndicator";
import {
  buildPreviewSampleContext,
  eventTypeBadgeClass,
  eventTypeLabel,
  getWhatsappTemplateBodyText,
  isWhatsappTemplateApproved,
  parseWhatsappBodyParamCount,
  recipientTypeLabel,
  resolvePreviewText,
  suggestDisplayName,
  suggestServiceKey,
  whatsappTemplateLanguage,
} from "./notificationWizardUtils";

const WIZARD_STEPS = [
  { key: "event", label: "Event" },
  { key: "recipient", label: "Recipient" },
  { key: "content", label: "Content" },
];

const LIST_PATH = "/notifications/notifications";

type WizardMode = "create" | "edit";
type WizardScope = "platform" | "engagement";

type ServiceMode = "existing" | "new";
type EmailFormat = "plain" | "html";

type EngagementWizardLocationState = {
  returnTo?: string;
  engagementId?: number;
  replaceKey?: string;
};

export function NotificationSetupWizard({
  mode,
  scope = "platform",
}: {
  mode: WizardMode;
  scope?: WizardScope;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = (location.state as EngagementWizardLocationState | null) ?? {};
  const { bindingId: bindingIdParam, engagementCode, engagementNotificationId } = useParams<{
    bindingId?: string;
    engagementCode?: string;
    engagementNotificationId?: string;
  }>();
  const bindingId = mode === "edit" && scope === "platform" ? Number(bindingIdParam) : null;
  const engagementNotifId =
    mode === "edit" && scope === "engagement" ? Number(engagementNotificationId) : null;
  const { canEditTask } = usePermissions();
  const canSave =
    scope === "engagement"
      ? canEditTask("notifications", "engagement_configuration")
      : canEditTask("notifications", "bindings");
  const listPath =
    scope === "engagement"
      ? locState.returnTo ?? (engagementCode ? `/engagements/${engagementCode}/edit?step=notifications` : "/engagements/new?step=notifications")
      : LIST_PATH;

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(mode === "edit");
  const [stepError, setStepError] = useState<string | null>(null);
  const [footerError, setFooterError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [catalog, setCatalog] = useState<NotificationCatalogEvent[]>([]);
  const [allServices, setAllServices] = useState<NotificationServiceItem[]>([]);
  const [binding, setBinding] = useState<NotificationEventBindingItem | null>(null);
  const [engagementRow, setEngagementRow] = useState<EngagementNotificationItem | null>(null);
  const [resolvedEngagementId, setResolvedEngagementId] = useState<number | null>(
    locState.engagementId ?? null
  );

  const [eventSearch, setEventSearch] = useState("");
  const [selectedEventCode, setSelectedEventCode] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [recipientType, setRecipientType] = useState("");

  const [serviceMode, setServiceMode] = useState<ServiceMode>("new");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [serviceKey, setServiceKey] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [templateName, setTemplateName] = useState("");
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [templateMeta, setTemplateMeta] = useState<WhatsAppTemplateMeta | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateFetchError, setTemplateFetchError] = useState<string | null>(null);
  const [activeVarSlot, setActiveVarSlot] = useState(0);

  const [emailFormat, setEmailFormat] = useState<EmailFormat>("plain");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const emailBodyRef = useRef<HTMLTextAreaElement>(null);
  const varInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const headerTitle = mode === "create" ? "New notification" : "Edit notification";
  usePageHeader(
    useMemo(
      () => ({
        title: headerTitle,
        subtitle: scope === "engagement" ? "Engagement notification" : "Platform notification binding",
        backTo: listPath,
      }),
      [headerTitle, listPath, scope]
    )
  );

  const selectedEvent = useMemo(
    () => catalog.find((e) => e.event_code === selectedEventCode) ?? null,
    [catalog, selectedEventCode]
  );

  const filteredCatalog = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return catalog
      .filter((e) => e.is_active)
      .filter(
        (e) =>
          !q ||
          e.event_code.toLowerCase().includes(q) ||
          e.event_name.toLowerCase().includes(q)
      );
  }, [catalog, eventSearch]);

  const channelServices = useMemo(
    () => allServices.filter((s) => s.channel === channel && s.is_active),
    [allServices, channel]
  );

  const paramCount = useMemo(() => parseWhatsappBodyParamCount(templateMeta), [templateMeta]);

  const previewContext = useMemo(
    () => buildPreviewSampleContext(selectedEvent?.variables ?? []),
    [selectedEvent]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setFooterError(null);
    try {
      const [catalogRes, servicesRes] = await Promise.all([
        notificationCatalogApi.list(),
        notificationsApi.listServices(),
      ]);
      setCatalog(catalogRes.data.data ?? []);
      setAllServices(servicesRes.data.data ?? []);

      if (scope === "platform" && mode === "edit" && bindingId) {
        const listRes = await notificationEventBindingsApi.list();
        const row = (listRes.data.data ?? []).find((b) => b.id === bindingId);
        if (!row) {
          setFooterError("Notification binding not found");
          return;
        }
        setBinding(row);
        setSelectedEventCode(row.event_code);
        setEventName(row.event_name);
        setRecipientType(row.recipient_type);

        const sk = row.notification_services?.[0]?.service_key;
        const svc = (servicesRes.data.data ?? []).find((s) => s.service_key === sk);
        if (svc) {
          setServiceMode("existing");
          setSelectedServiceId(svc.notification_service_id);
          setChannel(svc.channel);
          setServiceKey(svc.service_key);
          setDisplayName(svc.display_name);
          setTemplateName(svc.template_name ?? "");
          const vars = Array.isArray(svc.template_variables)
            ? svc.template_variables.map((v) => String(v))
            : [];
          setTemplateVariables(vars);
          setEmailSubject(svc.email_subject ?? "");
          setEmailBody(svc.email_body ?? "");
          setEmailHtml(svc.email_html ?? "");
          setEmailFormat(svc.email_html?.trim() ? "html" : "plain");
        }
        setStepIndex(2);
      }

      if (scope === "engagement") {
        let engagementId = locState.engagementId ?? null;
        if (!engagementId && engagementCode) {
          const engRes = await engagementsApi.getByCode(engagementCode);
          engagementId = engRes.data.data.engagement_id;
        }
        if (engagementId) setResolvedEngagementId(engagementId);

        if (mode === "edit" && engagementNotifId && engagementId) {
          const listRes = await engagementNotificationsApi.getForEngagement(engagementId);
          const row = (listRes.data.data ?? []).find((b) => b.id === engagementNotifId);
          if (!row) {
            setFooterError("Engagement notification not found");
            return;
          }
          setEngagementRow(row);
          setSelectedEventCode(row.event_code);
          setRecipientType(row.recipient_type);
          setEventName(row.event_display_name ?? row.event_code);

          const sk = row.notification_services?.[0]?.service_key;
          const svc = (servicesRes.data.data ?? []).find((s) => s.service_key === sk);
          if (svc) {
            setServiceMode("existing");
            setSelectedServiceId(svc.notification_service_id);
            setChannel(svc.channel);
            setServiceKey(svc.service_key);
            setDisplayName(svc.display_name);
            setTemplateName(svc.template_name ?? "");
            setTemplateVariables(
              Array.isArray(svc.template_variables)
                ? svc.template_variables.map((v) => String(v))
                : []
            );
            setEmailSubject(svc.email_subject ?? "");
            setEmailBody(svc.email_body ?? "");
            setEmailHtml(svc.email_html ?? "");
            setEmailFormat(svc.email_html?.trim() ? "html" : "plain");
          }
          setStepIndex(2);
        }
      }
    } catch (err) {
      setFooterError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [bindingId, engagementCode, engagementNotifId, locState.engagementId, mode, scope]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const name = templateName.trim();
    if (channel !== "whatsapp" || !name) {
      setTemplateMeta(null);
      setTemplateFetchError(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      setTemplateLoading(true);
      setTemplateFetchError(null);
      try {
        const res = await notificationWhatsAppTemplatesApi.get(name);
        setTemplateMeta(res.data.data);
      } catch (err) {
        setTemplateMeta(null);
        setTemplateFetchError(getApiError(err));
      } finally {
        setTemplateLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [templateName, channel]);

  useEffect(() => {
    if (channel !== "whatsapp" || paramCount <= 0) return;
    setTemplateVariables((prev) => {
      if (prev.length === paramCount) return prev;
      const next = [...prev];
      while (next.length < paramCount) next.push("");
      return next.slice(0, paramCount);
    });
  }, [channel, paramCount]);

  useEffect(() => {
    if (mode !== "create" || !selectedEvent || !recipientType) return;
    if (serviceMode === "new" && !serviceKey.trim()) {
      setServiceKey(suggestServiceKey(selectedEvent.event_code, recipientType, channel));
      setDisplayName(suggestDisplayName(selectedEvent.event_name, recipientType, channel));
    }
  }, [mode, selectedEvent, recipientType, channel, serviceMode, serviceKey]);

  function selectEvent(ev: NotificationCatalogEvent) {
    setSelectedEventCode(ev.event_code);
    setEventName(ev.event_name);
    setRecipientType("");
    setStepError(null);
  }

  function validateStep(index: number): boolean {
    if (index === 0) {
      if (!selectedEvent) {
        setStepError("Select an event");
        return false;
      }
      setStepError(null);
      return true;
    }
    if (index === 1) {
      if (!recipientType) {
        setStepError("Select a recipient type");
        return false;
      }
      if (selectedEvent && !selectedEvent.allowed_recipient_types.includes(recipientType)) {
        setStepError("Recipient type is not allowed for this event");
        return false;
      }
      setStepError(null);
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(stepIndex)) return;
    setStepIndex((i) => Math.min(WIZARD_STEPS.length - 1, i + 1));
  }

  function goBack() {
    setStepError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function insertVariable(key: string) {
    const token = `{{${key}}}`;
    if (channel === "whatsapp") {
      setTemplateVariables((prev) => {
        const next = [...prev];
        const idx = Math.min(activeVarSlot, next.length - 1);
        if (idx < 0) return prev;
        next[idx] = `${next[idx] ?? ""}${token}`;
        return next;
      });
      return;
    }
    const el = emailBodyRef.current;
    const field = emailFormat === "html" ? emailHtml : emailBody;
    if (!el) {
      if (emailFormat === "html") setEmailHtml((t) => t + token);
      else setEmailBody((t) => t + token);
      return;
    }
    const start = el.selectionStart ?? field.length;
    const end = el.selectionEnd ?? start;
    const updated = field.slice(0, start) + token + field.slice(end);
    if (emailFormat === "html") setEmailHtml(updated);
    else setEmailBody(updated);
  }

  function validateContent(): string | null {
    if (serviceMode === "existing" && !selectedServiceId) {
      return "Select an existing service";
    }
    if (serviceMode === "new") {
      if (!serviceKey.trim()) return "Service key is required";
      if (!displayName.trim()) return "Display name is required";
    }
    if (channel === "whatsapp") {
      if (!templateName.trim()) return "Template name is required";
      if (templateFetchError) return templateFetchError;
      if (!templateMeta) return "Load an approved WhatsApp template before saving";
      if (!isWhatsappTemplateApproved(templateMeta)) {
        return `Template is not APPROVED (status: ${templateMeta.status ?? "unknown"})`;
      }
      if (paramCount > 0 && templateVariables.length !== paramCount) {
        return `Fill all ${paramCount} template variable fields`;
      }
      if (paramCount > 0 && templateVariables.some((v) => !v.trim())) {
        return "All template variable fields are required";
      }
    } else {
      if (!emailSubject.trim()) return "Email subject is required";
      if (emailFormat === "html" && !emailHtml.trim()) return "Email HTML body is required";
      if (emailFormat === "plain" && !emailBody.trim()) return "Email body is required";
    }
    return null;
  }

  async function handleSave() {
    if (!canSave) return;
    if (!validateStep(0) || !validateStep(1)) {
      setFooterError("Complete event and recipient steps before saving");
      return;
    }
    const contentError = validateContent();
    if (contentError) {
      setFooterError(contentError);
      return;
    }
    if (!selectedEvent) return;

    setSubmitting(true);
    setFooterError(null);
    try {
      const servicePayload = {
        service_key: serviceKey.trim(),
        display_name: displayName.trim(),
        channel,
        is_active: true,
        template_name: channel === "whatsapp" ? templateName.trim() : null,
        template_variables: channel === "whatsapp" ? templateVariables : null,
        email_subject: channel === "email" ? emailSubject.trim() : null,
        email_body: channel === "email" && emailFormat === "plain" ? emailBody : null,
        email_html: channel === "email" && emailFormat === "html" ? emailHtml : null,
      };

      let finalServiceKey = serviceKey.trim();
      if (serviceMode === "existing" && selectedServiceId) {
        await notificationsApi.updateService(selectedServiceId, servicePayload);
        finalServiceKey = serviceKey.trim();
      } else {
        await notificationsApi.createService(servicePayload);
        finalServiceKey = servicePayload.service_key;
      }

      const bindingPayload = {
        event_code: selectedEvent.event_code,
        event_name: eventName.trim() || selectedEvent.event_name,
        recipient_type: recipientType,
        notification_services: [{ service_key: finalServiceKey }],
      };

      const engItem = {
        event_code: selectedEvent.event_code,
        recipient_type: recipientType,
        notification_services: [{ service_key: finalServiceKey }],
      };

      if (scope === "engagement") {
        const itemKey = (i: { event_code: string; recipient_type: string }) =>
          `${i.event_code}:${i.recipient_type}`;
        const replaceKey = locState.replaceKey ?? (engagementRow
          ? `${engagementRow.event_code}:${engagementRow.recipient_type}`
          : undefined);
        if (resolvedEngagementId) {
          const currentRes = await engagementNotificationsApi.getForEngagement(resolvedEngagementId);
          const current = currentRes.data.data ?? [];
          const next = current
            .filter((i) => itemKey(i) !== (replaceKey ?? itemKey(engItem)))
            .map((i) => ({
              event_code: i.event_code,
              recipient_type: i.recipient_type,
              notification_services: i.notification_services,
            }));
          next.push(engItem);
          await engagementNotificationsApi.upsertForEngagement(resolvedEngagementId, next);
          navigate(listPath, { state: { notificationSaved: true } });
        } else {
          navigate(listPath, {
            state: {
              engagementNotificationDraft: engItem,
              replaceKey: replaceKey ?? itemKey(engItem),
            },
          });
        }
        return;
      }

      if (mode === "edit" && binding) {
        await notificationEventBindingsApi.update(binding.id, {
          event_name: bindingPayload.event_name,
          notification_services: bindingPayload.notification_services,
        });
      } else {
        await notificationEventBindingsApi.create(bindingPayload);
      }

      navigate(listPath, { state: { notificationSaved: true } });
    } catch (err) {
      setFooterError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const bodyPreview = useMemo(() => {
    const body = getWhatsappTemplateBodyText(templateMeta);
    if (!body) return "";
    let out = body;
    templateVariables.forEach((val, i) => {
      const resolved = resolvePreviewText(val, previewContext);
      out = out.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"), resolved);
    });
    return out;
  }, [templateMeta, templateVariables, previewContext]);

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
        to={listPath}
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to notifications
      </Link>

      <WizardStepIndicator
        steps={WIZARD_STEPS}
        stepIndex={stepIndex}
        onGoToStep={(idx) => {
          if (mode === "edit" && idx < 2) return;
          if (idx < stepIndex) setStepIndex(idx);
        }}
      />

      {stepError && (
        <p className="mt-4 text-sm text-red-600" role="alert">{stepError}</p>
      )}

      <div className="mt-6 space-y-6">
        {stepIndex === 0 && (
          <div className="space-y-4">
            {mode === "edit" && selectedEvent ? (
              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50">
                <p className="text-xs text-zinc-500">Event (locked)</p>
                <p className="font-medium text-zinc-900">{selectedEvent.event_code}</p>
                <p className="text-sm text-zinc-600">{selectedEvent.event_name}</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="search"
                    placeholder="Search events…"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <ul className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-80 overflow-y-auto">
                  {filteredCatalog.map((ev) => {
                    const selected = ev.event_code === selectedEventCode;
                    return (
                      <li key={ev.event_code}>
                        <button
                          type="button"
                          onClick={() => selectEvent(ev)}
                          className={`w-full text-left px-4 py-3 hover:bg-zinc-50 ${selected ? "bg-zinc-100" : ""}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-zinc-900">{ev.event_name}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${eventTypeBadgeClass(ev.event_type)}`}
                            >
                              {eventTypeLabel(ev.event_type)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">{ev.event_code}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {selectedEvent && (
              <div>
                <p className="text-sm font-medium text-zinc-700 mb-2">Variables for this event</p>
                <ul className="text-xs text-zinc-600 space-y-1 border border-zinc-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {selectedEvent.variables.map((v) => (
                    <li key={v.key}>
                      <code className="text-zinc-800">{`{{${v.key}}}`}</code> — {v.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {stepIndex === 1 && selectedEvent && (
          <div className="space-y-3">
            {mode === "edit" ? (
              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50">
                <p className="text-xs text-zinc-500">Recipient (locked)</p>
                <p className="font-medium text-zinc-900">{recipientTypeLabel(recipientType)}</p>
              </div>
            ) : (
              selectedEvent.allowed_recipient_types.map((rt) => (
                <label
                  key={rt}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                    recipientType === rt ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="recipient"
                    checked={recipientType === rt}
                    onChange={() => setRecipientType(rt)}
                  />
                  <span className="text-sm font-medium text-zinc-900">{recipientTypeLabel(rt)}</span>
                </label>
              ))
            )}
          </div>
        )}

        {stepIndex === 2 && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-4">
              <fieldset>
                <legend className="text-sm font-medium text-zinc-700 mb-2">Service</legend>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={serviceMode === "existing"}
                      onChange={() => setServiceMode("existing")}
                    />
                    Existing
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={serviceMode === "new"}
                      onChange={() => setServiceMode("new")}
                    />
                    New
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-zinc-700 mb-2">Channel</legend>
                <div className="flex gap-4 text-sm">
                  {(["whatsapp", "email"] as const).map((ch) => (
                    <label key={ch} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={channel === ch}
                        onChange={() => {
                          setChannel(ch);
                          setSelectedServiceId(null);
                        }}
                      />
                      {ch === "whatsapp" ? "WhatsApp" : "Email"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {serviceMode === "existing" ? (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Service</label>
                <select
                  value={selectedServiceId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedServiceId(id);
                    const svc = channelServices.find((s) => s.notification_service_id === id);
                    if (svc) {
                      setServiceKey(svc.service_key);
                      setDisplayName(svc.display_name);
                      setTemplateName(svc.template_name ?? "");
                      setTemplateVariables(
                        Array.isArray(svc.template_variables)
                          ? svc.template_variables.map((v) => String(v))
                          : []
                      );
                      setEmailSubject(svc.email_subject ?? "");
                      setEmailBody(svc.email_body ?? "");
                      setEmailHtml(svc.email_html ?? "");
                      setEmailFormat(svc.email_html?.trim() ? "html" : "plain");
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                >
                  <option value="">Select service…</option>
                  {channelServices.map((s) => (
                    <option key={s.notification_service_id} value={s.notification_service_id}>
                      {s.service_key} — {s.display_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Service key</label>
                  <input
                    value={serviceKey}
                    onChange={(e) => setServiceKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Display name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
            )}

            {selectedEvent && (
              <div className="flex flex-wrap gap-2">
                {selectedEvent.variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="text-xs px-2 py-1 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            )}

            {channel === "whatsapp" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Template name</label>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                {templateLoading && (
                  <p className="text-xs text-zinc-500 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading template…
                  </p>
                )}
                {templateMeta && (
                  <div className="text-xs text-zinc-600 space-y-1 border border-zinc-200 rounded-lg p-3">
                    <p>Status: <strong>{templateMeta.status ?? "—"}</strong></p>
                    <p>Language: {whatsappTemplateLanguage(templateMeta)}</p>
                    <p>Category: {templateMeta.category ?? "—"}</p>
                    <p>Parameter format: {templateMeta.parameter_format ?? "—"}</p>
                    {!isWhatsappTemplateApproved(templateMeta) && (
                      <p className="text-red-600">Template must be APPROVED to save.</p>
                    )}
                  </div>
                )}
                {paramCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-700">Template variables ({paramCount})</p>
                    {templateVariables.map((val, i) => (
                      <input
                        key={i}
                        ref={(el) => { varInputRefs.current[i] = el; }}
                        value={val}
                        onFocus={() => setActiveVarSlot(i)}
                        onChange={(e) => {
                          const next = [...templateVariables];
                          next[i] = e.target.value;
                          setTemplateVariables(next);
                        }}
                        placeholder={`Value for {{${i + 1}}}`}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                      />
                    ))}
                  </div>
                )}
                {bodyPreview && (
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-1">Preview</p>
                    <pre className="text-sm whitespace-pre-wrap border border-zinc-200 rounded-lg p-3 bg-zinc-50">
                      {bodyPreview}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Subject</label>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={emailFormat === "plain"}
                      onChange={() => setEmailFormat("plain")}
                    />
                    Plain text
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={emailFormat === "html"}
                      onChange={() => setEmailFormat("html")}
                    />
                    HTML
                  </label>
                </div>
                <textarea
                  ref={emailBodyRef}
                  value={emailFormat === "html" ? emailHtml : emailBody}
                  onChange={(e) =>
                    emailFormat === "html"
                      ? setEmailHtml(e.target.value)
                      : setEmailBody(e.target.value)
                  }
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPreview((v) => !v)}
                  className="text-sm text-zinc-700 underline"
                >
                  {showEmailPreview ? "Hide preview" : "Preview"}
                </button>
                {showEmailPreview && (
                  emailFormat === "html" ? (
                    <div
                      className="border border-zinc-200 rounded-lg p-3 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: resolvePreviewText(emailHtml, previewContext),
                      }}
                    />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap border border-zinc-200 rounded-lg p-3 bg-zinc-50">
                      {resolvePreviewText(emailBody, previewContext)}
                    </pre>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-zinc-200 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <div className="text-sm text-red-600" role="alert">{footerError}</div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700"
            >
              Back
            </button>
          )}
          {stepIndex < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={
                !canSave
                || submitting
                || (channel === "whatsapp"
                  && !!templateMeta
                  && !isWhatsappTemplateApproved(templateMeta))
              }
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save notification"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
