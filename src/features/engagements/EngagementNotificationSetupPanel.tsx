import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Plus, Settings2, Trash2 } from "lucide-react";

import {
  type EngagementNotificationSetup,
  type NotificationBindingItem,
  type NotificationServiceItem,
  engagementNotificationsApi,
  getApiError,
  notificationsApi,
} from "../../lib/api";
import {
  BindingSummaryRow,
  buildNotificationServicesByKey,
  normalizeRecipientTypeForWizard,
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
  "recipient_type" | "delivery_channel" | "recipient_config" | "notification_services"
>;

type Props = {
  engagementId?: number | null;
  profileParams: EngagementNotificationProfileParams | null;
  returnTo: string;
  onSetupLoaded?: (setup: EngagementNotificationSetup) => void;
  /** When provided, skips fetching GET /notifications/services */
  notificationServices?: NotificationServiceItem[];
};

function coerceEngagementId(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function EngagementNotificationSetupPanel({
  engagementId,
  profileParams,
  returnTo,
  onSetupLoaded,
  notificationServices: notificationServicesProp,
}: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<EngagementNotificationSetup | null>(null);
  const [addEventCode, setAddEventCode] = useState("");
  const [catalogServices, setCatalogServices] = useState<NotificationServiceItem[]>(
    () => notificationServicesProp ?? []
  );
  const resolvedEngagementId = coerceEngagementId(engagementId ?? null);

  const servicesByKey = useMemo(
    () => buildNotificationServicesByKey(catalogServices),
    [catalogServices]
  );

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

  const wizardLinkState = useMemo(() => ({ returnTo }), [returnTo]);

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

  const handleDeleteBinding = async (bindingId: number) => {
    if (!resolvedEngagementId) return;
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
    if (!resolvedEngagementId) return;
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
          state: wizardLinkState,
        }
      );
    }
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

      {events.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No notification events apply to this engagement profile. Use Add event to configure extras.
        </p>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium hidden sm:table-cell">Who · channel · message</th>
                <th className="px-4 py-2 font-medium w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {events.map((event) => (
                <tr key={event.event_code} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{event.name}</div>
                    <div className="text-xs font-mono text-zinc-500">{event.event_code}</div>
                    {event.is_extra ? (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Extra
                      </span>
                    ) : null}
                    <ul className="sm:hidden mt-3 space-y-2">
                      {(event.engagement_bindings.length
                        ? event.engagement_bindings
                        : event.global_bindings
                      ).map((b, i) => (
                        <li key={"id" in b && b.id ? b.id : `mobile-${i}`}>
                          <BindingSummaryRow
                            binding={b as BindingLike}
                            servicesByKey={servicesByKey}
                            platformDefault={
                              event.engagement_bindings.length === 0 && event.global_bindings.length > 0
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {event.engagement_bindings.length === 0 && event.global_bindings.length === 0 ? (
                      <span className="text-zinc-400">No defaults configured</span>
                    ) : (
                      <ul className="space-y-2">
                        {event.engagement_bindings.map((b) => (
                          <li key={b.id}>
                            <BindingSummaryRow
                              binding={b}
                              servicesByKey={servicesByKey}
                              actions={
                                resolvedEngagementId ? (
                                  <>
                                    <Link
                                      to={wizardPath(event.event_code, {
                                        engagementBindingId: b.id,
                                        step: 2,
                                        recipient_type: b.recipient_type,
                                        delivery_channel: b.delivery_channel,
                                      })}
                                      state={wizardLinkState}
                                      className="text-zinc-500 hover:text-zinc-900 p-1"
                                      title="Edit binding"
                                    >
                                      <Settings2 className="w-4 h-4" />
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteBinding(b.id)}
                                      className="text-zinc-400 hover:text-red-600 p-1"
                                      title="Remove binding"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : undefined
                              }
                            />
                          </li>
                        ))}
                        {event.engagement_bindings.length === 0
                          ? event.global_bindings.map((b, i) => (
                              <li key={`global-${i}`}>
                                <BindingSummaryRow
                                  binding={b}
                                  servicesByKey={servicesByKey}
                                  platformDefault
                                  className="opacity-90"
                                  actions={
                                    resolvedEngagementId ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => void handleCustomizeEvent(event.event_code)}
                                          className="text-zinc-500 hover:text-zinc-900 p-1"
                                          title="Customize for this engagement"
                                        >
                                          <Settings2 className="w-4 h-4" />
                                        </button>
                                        <Link
                                          to={wizardPath(event.event_code, { step: 2 })}
                                          state={wizardLinkState}
                                          className="text-zinc-500 hover:text-zinc-900 p-1"
                                          title="Add engagement binding"
                                        >
                                          <Plus className="w-4 h-4" />
                                        </Link>
                                      </>
                                    ) : undefined
                                  }
                                />
                              </li>
                            ))
                          : null}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {resolvedEngagementId ? (
                      <Link
                        to={wizardPath(event.event_code, { step: 2 })}
                        state={wizardLinkState}
                        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add binding
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-400">Save engagement to configure</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {setup.addable_events?.length > 0 && resolvedEngagementId ? (
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
    </div>
  );
}
