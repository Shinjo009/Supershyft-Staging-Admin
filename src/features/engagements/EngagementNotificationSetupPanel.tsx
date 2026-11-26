import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";

import {
  type EngagementNotificationSetup,
  type NotificationServiceItem,
  engagementNotificationsApi,
  getApiError,
  notificationsApi,
} from "../../lib/api";
import {
  engagementHasCustomNotificationSlots,
  flattenEngagementEventNotifications,
  formatEngagementEventTriggerSummary,
  type EngagementNotificationTriggerRow,
} from "../../lib/engagementNotificationTriggers";
import { buildNotificationServicesByKey, normalizeRecipientTypeForWizard, selectableRowClass } from "../notifications/notificationsUiShared";
import { EngagementEventNotificationsModal } from "./EngagementEventNotificationsModal";

export type EngagementNotificationProfileParams = {
  engagement_kind: string;
  payment_type?: string;
  blood_collection_type?: string | null;
  consultation_mode?: string | null;
  auto_booking?: boolean | null;
};

type Props = {
  engagementId?: number | null;
  profileParams: EngagementNotificationProfileParams | null;
  returnTo: string;
  onSetupLoaded?: (setup: EngagementNotificationSetup) => void;
  notificationServices?: NotificationServiceItem[];
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
  const [modalEventCode, setModalEventCode] = useState<string | null>(null);
  const [catalogServices, setCatalogServices] = useState<NotificationServiceItem[]>(
    () => notificationServicesProp ?? []
  );
  /** After the user removes a slot, never auto-reseed empties back from globals. */
  const skipAutoSeedRef = useRef(false);
  const resolvedEngagementId = coerceEngagementId(engagementId ?? null);
  const editable = !readOnly && resolvedEngagementId != null;

  const servicesByKey = useMemo(
    () => buildNotificationServicesByKey(catalogServices),
    [catalogServices]
  );

  useEffect(() => {
    const restore = (location.state as LocationRestoreState | null)?.engagementNotificationSelectedEvent;
    if (restore?.trim()) {
      setModalEventCode(restore.trim());
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
        const res = await notificationsApi.listServices({ page: 1, limit: 100 });
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

      // Only auto-seed when the engagement has never been customized. Seeding
      // whenever *some* event is empty re-created slots right after delete.
      const hasCustomSlots = engagementHasCustomNotificationSlots(data.events);
      const hasPlatformDefaults = data.events.some((e) => e.global_bindings.length > 0);
      const shouldAutoSeed =
        resolvedEngagementId != null &&
        !skipAutoSeedRef.current &&
        !hasCustomSlots &&
        hasPlatformDefaults;
      if (shouldAutoSeed) {
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
    if (!modalEventCode || !setup) return;
    if (!setup.events.some((e) => e.event_code === modalEventCode)) {
      setModalEventCode(null);
    }
  }, [modalEventCode, setup]);

  const modalEvent =
    modalEventCode != null ? setup?.events.find((e) => e.event_code === modalEventCode) ?? null : null;

  const engagementCustomized = useMemo(
    () => (setup ? engagementHasCustomNotificationSlots(setup.events) : false),
    [setup]
  );

  const modalRows = useMemo(() => {
    if (!modalEvent) return [];
    return flattenEngagementEventNotifications(modalEvent, servicesByKey, {
      engagementCustomized,
    });
  }, [modalEvent, servicesByKey, engagementCustomized]);

  const platformDefaultsOnly = Boolean(
    modalEvent &&
      !engagementCustomized &&
      modalEvent.engagement_bindings.length === 0 &&
      modalEvent.global_bindings.length > 0
  );

  const wizardLinkState = useMemo(
    () => ({
      returnTo,
      engagementNotificationSelectedEvent: modalEventCode ?? undefined,
    }),
    [returnTo, modalEventCode]
  );

  const wizardPath = useCallback(
    (
      eventCode: string,
      extra?: {
        engagementBindingId?: number;
        serviceKey?: string;
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
      if (extra?.serviceKey) {
        q.set("service_key", extra.serviceKey);
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

  const handleDeleteRow = async (row: EngagementNotificationTriggerRow) => {
    if (!resolvedEngagementId || readOnly) return;
    if (!row.bindingId) {
      setError("Cannot remove this notification: missing binding id.");
      return;
    }
    const label = row.notificationLabel;
    if (!window.confirm(`Remove "${label}" for ${row.recipientLabel} on this engagement?`)) return;
    try {
      skipAutoSeedRef.current = true;
      if (row.servicesOnBinding <= 1) {
        await engagementNotificationsApi.deleteBinding(resolvedEngagementId, row.bindingId);
      } else {
        await engagementNotificationsApi.removeBindingService(
          resolvedEngagementId,
          row.bindingId,
          row.serviceKey
        );
      }
      await load();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const handleEditRow = (row: EngagementNotificationTriggerRow) => {
    if (!row.bindingId) return;
    navigate(
      wizardPath(modalEventCode ?? row.eventCode, {
        engagementBindingId: row.bindingId,
        serviceKey: row.serviceKey,
        step: 2,
        recipient_type: row.binding.recipient_type,
        delivery_channel: row.binding.delivery_channel,
      }),
      { state: wizardLinkState }
    );
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

  const handleCustomizePlatformDefaults = async () => {
    if (!modalEventCode || !resolvedEngagementId || readOnly) return;
    await ensureEngagementCopies();
    await load();
  };

  const eventSummaries = useMemo(() => {
    if (!setup) return new Map<string, string>();
    const customized = engagementHasCustomNotificationSlots(setup.events);
    const map = new Map<string, string>();
    for (const event of setup.events) {
      const rows = flattenEngagementEventNotifications(event, servicesByKey, {
        engagementCustomized: customized,
      });
      map.set(event.event_code, formatEngagementEventTriggerSummary(rows));
    }
    return map;
  }, [setup, servicesByKey]);

  if (loading || seeding) {
    return (
      <div className="py-10 flex flex-col items-center gap-2 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        {seeding ? (
          <p className="text-sm">Applying platform notification defaults…</p>
        ) : null}
      </div>
    );
  }

  if (!profileParams?.engagement_kind && !resolvedEngagementId) {
    return <p className="text-sm text-zinc-500">Select an engagement type in Type & basics first.</p>;
  }

  if (!setup) {
    return (
      <div className="space-y-2">
        {error ? (
          <div className="text-sm text-red-600" role="alert">
            {error}
          </div>
        ) : null}
        <p className="text-sm text-zinc-500">Unable to load notification setup.</p>
      </div>
    );
  }

  const events = setup.events;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      ) : null}
      <p className="text-sm text-zinc-600" title={setup.profile_key}>
        <span className="font-medium text-zinc-900">{setup.profile_label}</span>
        <span className="text-zinc-400 mx-2">·</span>
        {events.length} event{events.length === 1 ? "" : "s"}
      </p>

      <p className="text-xs text-zinc-500">
        {readOnly
          ? "Select an event to see which notifications are sent."
          : "Select an event to view or edit notifications for this engagement."}
      </p>

      {events.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No notification events apply to this engagement profile.
          {editable ? " You can add an extra event below." : ""}
        </p>
      ) : (
        <div
          className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100"
          data-testid="engagement-notifications-events-list"
        >
          {events.map((event) => (
            <button
              key={event.event_code}
              type="button"
              onClick={() => setModalEventCode(event.event_code)}
              className={`${selectableRowClass(false)} w-full rounded-none border-0 border-b border-zinc-100 last:border-b-0 px-4 py-3 flex items-center justify-between gap-3`}
              data-testid="engagement-notifications-event-row"
            >
              <div className="min-w-0 text-left">
                <div className="font-medium text-zinc-900">{event.name}</div>
                <div className="text-xs text-zinc-600 mt-1">
                  {eventSummaries.get(event.event_code) ?? "No notifications configured"}
                </div>
                {event.is_extra ? (
                  <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    Extra
                  </span>
                ) : null}
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" aria-hidden />
            </button>
          ))}
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

      <EngagementEventNotificationsModal
        open={modalEventCode != null && modalEvent != null}
        onClose={() => setModalEventCode(null)}
        event={modalEvent}
        rows={modalRows}
        editable={editable}
        platformDefaultsOnly={platformDefaultsOnly}
        addNotificationTo={
          editable && modalEvent
            ? wizardPath(modalEvent.event_code, { step: 2 })
            : undefined
        }
        addNotificationState={wizardLinkState}
        onCustomizePlatformDefaults={
          editable && platformDefaultsOnly ? () => void handleCustomizePlatformDefaults() : undefined
        }
        onEditRow={editable ? handleEditRow : undefined}
        onDeleteRow={editable ? (row) => void handleDeleteRow(row) : undefined}
      />
    </div>
  );
}