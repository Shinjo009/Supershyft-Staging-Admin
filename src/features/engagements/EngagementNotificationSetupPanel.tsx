import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Plus, Settings2, Trash2, ArrowLeft } from "lucide-react";

import {
  type EngagementNotificationSetup,
  type EngagementNotificationSetupEventRow,
  type NotificationBindingItem,
  type NotificationServiceItem,
  engagementNotificationsApi,
  getApiError,
  notificationsApi,
} from "../../lib/api";
import {
  ChannelBadge,
  NotificationServiceNameList,
  buildNotificationServicesByKey,
  formatBindingEmitConditionLabel,
  formatBindingRecipientLabel,
  normalizeRecipientTypeForWizard,
  selectableRowClass,
} from "../notifications/notificationsUiShared";

export type EngagementNotificationProfileParams = {
  engagement_kind: string;
  payment_type?: string;
  blood_collection_type?: string | null;
  consultation_mode?: string | null;
  auto_booking?: boolean | null;
};

type BindingLike = Pick<
  NotificationBindingItem,
  "recipient_type" | "delivery_channel" | "recipient_config" | "notification_services" | "emit_condition"
>;

type EngagementBindingRow = EngagementNotificationSetupEventRow["engagement_bindings"][number];

type Props = {
  engagementId?: number | null;
  profileParams: EngagementNotificationProfileParams | null;
  returnTo: string;
  onSetupLoaded?: (setup: EngagementNotificationSetup) => void;
  /** When provided, skips fetching GET /notifications/services */
  notificationServices?: NotificationServiceItem[];
  /** View engagement tab — no add/edit/delete */
  readOnly?: boolean;
};

type LocationRestoreState = {
  engagementNotificationSelectedEvent?: string;
};

function coerceEngagementId(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function countBindingsForEvent(event: EngagementNotificationSetupEventRow): number {
  if (event.engagement_bindings.length > 0) return event.engagement_bindings.length;
  return event.global_bindings.length;
}

function countMessagesForEvent(event: EngagementNotificationSetupEventRow): number {
  const bindings =
    event.engagement_bindings.length > 0 ? event.engagement_bindings : event.global_bindings;
  return bindings.reduce((sum, b) => sum + (b.notification_services?.length ?? 0), 0);
}

function EngagementNotificationBindingCard({
  binding,
  servicesByKey,
  platformDefault,
  editable,
  onEdit,
  onDelete,
  footerAction,
}: {
  binding: BindingLike & { id?: number };
  servicesByKey: Map<string, NotificationServiceItem>;
  platformDefault?: boolean;
  editable: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  footerAction?: ReactNode;
}) {
  const recipientLabel = formatBindingRecipientLabel(binding);
  const deliveryChannel = (binding.delivery_channel ?? "").trim().toLowerCase() || "whatsapp";
  const messageCount = (binding.notification_services ?? []).filter((s) =>
    (s.service_key ?? "").trim()
  ).length;
  const whenLabel = formatBindingEmitConditionLabel(
    binding as Pick<NotificationBindingItem, "emit_condition">
  );

  return (
    <article
      className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
      data-testid="engagement-notification-binding-card"
    >
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-3 py-2.5 sm:px-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900" title={recipientLabel}>
              {recipientLabel}
            </span>
            <ChannelBadge channel={deliveryChannel} />
            {platformDefault ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide text-zinc-500 bg-white border border-zinc-200">
                Platform default
              </span>
            ) : null}
          </div>
          {whenLabel !== "Always" ? (
            <p className="text-xs text-zinc-600">
              When: <span className="font-medium">{whenLabel}</span>
            </p>
          ) : null}
          {messageCount > 1 ? (
            <p className="text-xs text-zinc-500">
              {messageCount} messages on this binding. Edit or remove applies to the whole recipient and
              channel.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Recipient and channel binding</p>
          )}
        </div>
        {editable && (onEdit || onDelete) ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="text-zinc-500 hover:text-zinc-900 p-1.5 rounded-md hover:bg-white border border-transparent hover:border-zinc-200"
                title="Edit binding"
                aria-label="Edit binding"
                data-testid="engagement-notification-edit-binding"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="text-zinc-400 hover:text-red-600 p-1.5 rounded-md hover:bg-white border border-transparent hover:border-zinc-200"
                title="Remove binding"
                aria-label="Remove binding"
                data-testid="engagement-notification-remove-binding"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="px-3 py-3 sm:px-4 bg-white">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 mb-2">Messages</p>
        <NotificationServiceNameList
          services={binding.notification_services ?? []}
          servicesByKey={servicesByKey}
          bindingChannel={deliveryChannel}
        />
        {footerAction ? <div className="mt-3 pt-2 border-t border-zinc-100">{footerAction}</div> : null}
      </div>
    </article>
  );
}

export function EngagementNotificationSetupPanel({
  engagementId,
  profileParams,
  returnTo,
  onSetupLoaded,
  notificationServices: notificationServicesProp,
  readOnly = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<EngagementNotificationSetup | null>(null);
  const [addEventCode, setAddEventCode] = useState("");
  const [selectedEventCode, setSelectedEventCode] = useState<string | null>(null);
  const [catalogServices, setCatalogServices] = useState<NotificationServiceItem[]>(
    () => notificationServicesProp ?? []
  );
  const resolvedEngagementId = coerceEngagementId(engagementId ?? null);
  const editable = !readOnly && resolvedEngagementId != null;

  const servicesByKey = useMemo(
    () => buildNotificationServicesByKey(catalogServices),
    [catalogServices]
  );

  useEffect(() => {
    const restore = (location.state as LocationRestoreState | null)?.engagementNotificationSelectedEvent;
    if (restore?.trim()) {
      setSelectedEventCode(restore.trim());
    }
  }, [location.state]);

  useEffect(() => {
    if (notificationServicesProp !== undefined) {
      setCatalogServices(notificationServicesProp);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await notificationsApi.listServices();
        if (!cancelled) {
          setCatalogServices(res.data.data ?? []);
        }
      } catch {
        if (!cancelled) setCatalogServices([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notificationServicesProp]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params =
        resolvedEngagementId != null
          ? { engagement_id: resolvedEngagementId }
          : profileParams?.engagement_kind
            ? {
                engagement_kind: profileParams.engagement_kind,
                payment_type: profileParams.payment_type,
                blood_collection_type: profileParams.blood_collection_type ?? undefined,
                consultation_mode: profileParams.consultation_mode ?? undefined,
                auto_booking: profileParams.auto_booking ?? undefined,
              }
            : null;
      if (!params) {
        setSetup(null);
        return;
      }
      const res = await engagementNotificationsApi.getSetup(params);
      const data = res.data.data;
      setSetup(data);
      onSetupLoaded?.(data);

      const needsEngagementBindings = data.events.some(
        (e) => e.global_bindings.length > 0 && e.engagement_bindings.length === 0
      );
      if (resolvedEngagementId && needsEngagementBindings) {
        setSeeding(true);
        try {
          const seedRes = await engagementNotificationsApi.seedFromDefaults(resolvedEngagementId);
          setSetup(seedRes.data.data);
          onSetupLoaded?.(seedRes.data.data);
        } catch (seedErr) {
          setError(
            getApiError(seedErr) ||
              "Could not auto-seed from defaults. You can still add bindings manually."
          );
        } finally {
          setSeeding(false);
        }
      }
    } catch (err) {
      setError(getApiError(err));
      setSetup(null);
    } finally {
      setLoading(false);
    }
  }, [resolvedEngagementId, profileParams, onSetupLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedEventCode || !setup) return;
    const exists = setup.events.some((e) => e.event_code === selectedEventCode);
    if (!exists) setSelectedEventCode(null);
  }, [selectedEventCode, setup]);

  const wizardLinkState = useMemo(
    () => ({
      returnTo,
      engagementNotificationSelectedEvent: selectedEventCode ?? undefined,
    }),
    [returnTo, selectedEventCode]
  );

  const wizardPath = useCallback(
    (
      eventCode: string,
      extra?: {
        engagementBindingId?: number;
        step?: number;
        recipient_type?: string;
        delivery_channel?: string;
      }
    ) => {
      const q = new URLSearchParams({
        mode: "engagement",
        engagementId: String(resolvedEngagementId ?? ""),
        event_code: eventCode,
      });
      if (extra?.engagementBindingId) {
        q.set("engagementBindingId", String(extra.engagementBindingId));
      }
      if (extra?.step) {
        q.set("step", String(extra.step));
      }
      const recipient = extra?.recipient_type?.trim();
      if (recipient) {
        const normalized = normalizeRecipientTypeForWizard(recipient);
        if (normalized) {
          q.set("recipient", normalized);
        }
      }
      const channel = extra?.delivery_channel?.trim().toLowerCase();
      if (channel === "whatsapp" || channel === "email") {
        q.set("channel", channel);
      }
      return `/notifications/notifications/new?${q.toString()}`;
    },
    [resolvedEngagementId]
  );

  const handleDeleteBinding = async (bindingId: number, recipientLabel: string) => {
    if (!resolvedEngagementId || readOnly) return;
    if (
      !window.confirm(
        `Remove this binding for ${recipientLabel}? All messages on this recipient and channel will be removed.`
      )
    ) {
      return;
    }
    try {
      await engagementNotificationsApi.deleteBinding(resolvedEngagementId, bindingId);
      await load();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const ensureEngagementCopies = async (): Promise<EngagementNotificationSetup | null> => {
    if (!resolvedEngagementId) return null;
    try {
      const seedRes = await engagementNotificationsApi.seedFromDefaults(resolvedEngagementId);
      const next = seedRes.data.data;
      setSetup(next);
      onSetupLoaded?.(next);
      return next;
    } catch (err) {
      setError(getApiError(err));
      return null;
    }
  };

  const handleCustomizeEvent = async (eventCode: string) => {
    if (!resolvedEngagementId || readOnly) return;
    const data = await ensureEngagementCopies();
    if (!data) return;
    const ev = data.events.find((e) => e.event_code === eventCode);
    const first = ev?.engagement_bindings[0];
    if (first?.id) {
      navigate(
        wizardPath(eventCode, {
          engagementBindingId: first.id,
          step: 2,
          recipient_type: first.recipient_type,
          delivery_channel: first.delivery_channel,
        }),
        {
          state: { ...wizardLinkState, engagementNotificationSelectedEvent: eventCode },
        }
      );
    }
  };

  const navigateToEditBinding = (eventCode: string, binding: EngagementBindingRow) => {
    navigate(
      wizardPath(eventCode, {
        engagementBindingId: binding.id,
        step: 2,
        recipient_type: binding.recipient_type,
        delivery_channel: binding.delivery_channel,
      }),
      {
        state: { ...wizardLinkState, engagementNotificationSelectedEvent: eventCode },
      }
    );
  };

  if (loading || seeding) {
    return (
      <div className="py-10 flex flex-col items-center gap-2 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        {seeding ? (
          <p className="text-sm">Creating engagement-specific copies of default bindings…</p>
        ) : null}
      </div>
    );
  }

  if (!profileParams?.engagement_kind && !resolvedEngagementId) {
    return <p className="text-sm text-zinc-500">Select an engagement type in Type & basics first.</p>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-600" role="alert">
        {error}
      </div>
    );
  }

  if (!setup) {
    return <p className="text-sm text-zinc-500">Unable to load notification setup.</p>;
  }

  const events = setup.events;
  const selectedEvent =
    selectedEventCode != null ? events.find((e) => e.event_code === selectedEventCode) ?? null : null;

  const renderEventDetail = (event: EngagementNotificationSetupEventRow) => {
    const usingEngagement = event.engagement_bindings.length > 0;
    const showGlobalsOnly = !usingEngagement && event.global_bindings.length > 0;

    let bindingCards: ReactNode = null;
    if (!usingEngagement && event.global_bindings.length === 0) {
      bindingCards = (
        <p className="text-sm text-zinc-500 py-6 text-center border border-dashed border-zinc-200 rounded-xl">
          No bindings configured for this event yet.
        </p>
      );
    } else if (usingEngagement) {
      bindingCards = (
        <ul className="space-y-3">
          {event.engagement_bindings.map((b) => {
            const label = formatBindingRecipientLabel(b);
            return (
              <li key={b.id}>
                <EngagementNotificationBindingCard
                  binding={b}
                  servicesByKey={servicesByKey}
                  editable={editable}
                  onEdit={
                    editable
                      ? () => navigateToEditBinding(event.event_code, b)
                      : undefined
                  }
                  onDelete={
                    editable
                      ? () => void handleDeleteBinding(b.id, label)
                      : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      );
    } else {
      bindingCards = (
        <ul className="space-y-3">
          {event.global_bindings.map((b, i) => (
            <li key={`global-${i}`}>
              <EngagementNotificationBindingCard
                binding={b as BindingLike}
                servicesByKey={servicesByKey}
                platformDefault
                editable={editable}
                onEdit={
                  editable ? () => void handleCustomizeEvent(event.event_code) : undefined
                }
                onDelete={undefined}
                footerAction={
                  editable ? (
                    <Link
                      to={wizardPath(event.event_code, { step: 2 })}
                      state={{
                        ...wizardLinkState,
                        engagementNotificationSelectedEvent: event.event_code,
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add engagement binding
                    </Link>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="space-y-4" data-testid="engagement-notification-event-detail">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSelectedEventCode(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 mb-2"
              data-testid="engagement-notification-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to events
            </button>
            <h3 className="text-lg font-semibold text-zinc-900">{event.name}</h3>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">{event.event_code}</p>
            {event.is_extra ? (
              <span className="inline-block mt-2 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                Extra
              </span>
            ) : null}
            {showGlobalsOnly && editable ? (
              <p className="text-sm text-zinc-600 mt-2">
                Showing platform defaults. Customize or add a binding to override for this engagement.
              </p>
            ) : null}
          </div>
          {editable ? (
            <Link
              to={wizardPath(event.event_code, { step: 2 })}
              state={{ ...wizardLinkState, engagementNotificationSelectedEvent: event.event_code }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 shrink-0"
              data-testid="engagement-notification-add-binding"
            >
              <Plus className="w-4 h-4" />
              Add binding
            </Link>
          ) : null}
        </div>

        <section>
          <h4 className="text-sm font-medium text-zinc-900 mb-1">Recipients and messages</h4>
          <p className="text-xs text-zinc-500 mb-3">
            Each card is one recipient and channel. Messages listed below are sent together for that
            binding.
          </p>
          {bindingCards}
        </section>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Profile</p>
        <p className="text-sm font-medium text-zinc-900 mt-0.5">{setup.profile_label}</p>
        <p className="text-xs font-mono text-zinc-500 mt-1 break-all">{setup.profile_key}</p>
        <p className="text-xs text-zinc-600 mt-2">
          {events.length} event{events.length === 1 ? "" : "s"} · {setup.applicable_event_count}{" "}
          auto-applicable
        </p>
      </div>

      {selectedEvent ? (
        renderEventDetail(selectedEvent)
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            {readOnly
              ? "Select an event to see who receives which messages."
              : "Select an event to view or edit bindings for this engagement."}
          </p>

          {events.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No notification events apply to this engagement profile.
              {editable ? " Use Add event to configure extras." : ""}
            </p>
          ) : (
            <div
              className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100"
              data-testid="engagement-notifications-events-list"
            >
              {events.map((event) => {
                const bindingCount = countBindingsForEvent(event);
                const messageCount = countMessagesForEvent(event);
                return (
                  <button
                    key={event.event_code}
                    type="button"
                    onClick={() => setSelectedEventCode(event.event_code)}
                    className={`${selectableRowClass(false)} w-full rounded-none border-0 border-b border-zinc-100 last:border-b-0 px-4 py-3 flex items-center justify-between gap-3`}
                    data-testid="engagement-notifications-event-row"
                  >
                    <div className="min-w-0 text-left">
                      <div className="font-medium text-zinc-900">{event.name}</div>
                      <div className="text-xs font-mono text-zinc-500">{event.event_code}</div>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-zinc-600">
                        <span>
                          {bindingCount} binding{bindingCount === 1 ? "" : "s"}
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {messageCount} message{messageCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {event.is_extra ? (
                        <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Extra
                        </span>
                      ) : null}
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}

          {editable && setup.addable_events?.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end border border-dashed border-zinc-300 rounded-lg p-4">
              <label className="flex-1 text-sm text-zinc-800">
                Add event outside profile
                <select
                  value={addEventCode}
                  onChange={(e) => setAddEventCode(e.target.value)}
                  className="mt-1 w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select event…</option>
                  {setup.addable_events.map((ev) => (
                    <option key={ev.code} value={ev.code}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
              </label>
              {addEventCode ? (
                <Link
                  to={wizardPath(addEventCode, { step: 2 })}
                  state={wizardLinkState}
                  className="inline-flex justify-center px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
                >
                  Configure
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}