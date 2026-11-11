import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate } from "../../contexts/PermissionContext";
import {
  engagementNotificationsApi,
  notificationsCatalogApi,
  type CatalogEventItem,
  type EngagementNotificationBindingItem,
  type NotificationBindingItem,
  type NotificationServiceConfigItem,
  getApiError,
} from "../../lib/api";
import {
  formatBindingEmitConditionLabel,
  formatBindingRecipientLabel,
  catalogEventForEventCode,
} from "../notifications/notificationsUiShared";

function decodeEventCode(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function ServiceChips({ services }: { services: NotificationServiceConfigItem[] }) {
  if (!services.length) {
    return <span className="text-zinc-400 text-sm">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((s) => (
        <span
          key={`${s.service_key}-${s.external_link ?? ""}`}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-50 text-violet-700 border-violet-200"
        >
          {s.service_key}
        </span>
      ))}
    </div>
  );
}

export function EngagementEventDetailPage() {
  const { engagementId: engagementIdParam, eventCode: eventCodeParam } = useParams<{
    engagementId: string;
    eventCode: string;
  }>();
  const engagementId = Number(engagementIdParam || 0);
  const eventCode = decodeEventCode(eventCodeParam);
  const navigate = useNavigate();

  const [catalogEvent, setCatalogEvent] = useState<CatalogEventItem | null>(null);
  const [engagementBindings, setEngagementBindings] = useState<EngagementNotificationBindingItem[]>(
    []
  );
  const [globalBindings, setGlobalBindings] = useState<NotificationBindingItem[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backTo = `/engagements/${engagementId}/edit?step=notifications`;

  const load = useCallback(async () => {
    if (!engagementId || !eventCode) return;
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, detailRes] = await Promise.all([
        notificationsCatalogApi.getEvents(),
        engagementNotificationsApi.getEventBindings(engagementId, eventCode),
      ]);
      const catalog = catalogRes.data.data;
      const detail = detailRes.data.data;
      setEngagementBindings(detail.engagement_bindings ?? []);
      setGlobalBindings(detail.global_bindings ?? []);
      setEventName(detail.name ?? eventCode);
      setCatalogEvent(catalogEventForEventCode(catalog, eventCode, undefined));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [engagementId, eventCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<EngagementNotificationBindingItem>[] = useMemo(
    () => [
      {
        key: "recipient_type",
        label: "Recipient",
        sortable: false,
        render: (r) => (
          <span className="text-sm text-zinc-900">{formatBindingRecipientLabel(r)}</span>
        ),
      },
      {
        key: "delivery_channel",
        label: "Channel",
        sortable: false,
        render: (r) => (
          <span className="text-sm text-zinc-700 capitalize">{r.delivery_channel || "—"}</span>
        ),
      },
      {
        key: "emit_condition",
        label: "When",
        sortable: false,
        render: (r) => (
          <span className="text-sm text-zinc-600">
            {formatBindingEmitConditionLabel(r)}
          </span>
        ),
      },
      {
        key: "notification_services",
        label: "Service",
        sortable: false,
        render: (r) => <ServiceChips services={r.notification_services} />,
      },
    ],
    []
  );

  async function handleDelete(bindingId: number) {
    if (!engagementId) return;
    setError(null);
    try {
      await engagementNotificationsApi.deleteBinding(engagementId, bindingId);
      await load();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  if (!engagementId || !eventCode) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Invalid engagement or event.{" "}
        <Link to="/engagements" className="text-zinc-900 underline">
          Back to engagements
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-4 sm:p-6 gap-4 max-w-5xl mx-auto w-full">
      <Link to={backTo} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Back to engagement notifications
      </Link>
      {error ? (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-3">
            <h1 className="text-lg font-semibold text-zinc-900">{eventName}</h1>
            <p className="text-xs font-mono text-zinc-500">{eventCode}</p>
            {catalogEvent?.trigger_notes ? (
              <p className="text-sm text-zinc-600">{catalogEvent.trigger_notes}</p>
            ) : null}
            <p className="text-xs text-zinc-500">
              Bindings here apply only to this engagement. Global defaults below are reference only
              (not used at send time after you configure this engagement).
            </p>
            <PermissionGate category="notifications" taskKey="defaults" action="edit">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/notifications/notifications/new?mode=engagement&engagementId=${engagementId}&event_code=${encodeURIComponent(eventCode)}`
                  )
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4" />
                Add binding
              </button>
            </PermissionGate>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-900">This engagement</h2>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {engagementBindings.length === 0 ? (
                <p className="py-10 px-6 text-sm text-zinc-500 text-center">
                  No bindings for this event on this engagement yet.
                </p>
              ) : (
                <DataTable
                  columns={columns}
                  data={engagementBindings}
                  keyExtractor={(r) => r.id}
                  onEdit={(row) =>
                    navigate(
                      `/notifications/notifications/new?mode=engagement&engagementId=${engagementId}&event_code=${encodeURIComponent(eventCode)}&engagementBindingId=${row.id}`
                    )
                  }
                  onDelete={(row) => void handleDelete(row.id)}
                />
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-500">Global defaults (reference)</h2>
            <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 space-y-2">
              {globalBindings.length === 0 ? (
                <p>Not configured globally.</p>
              ) : (
                globalBindings.map((g) => (
                  <div key={g.id} className="flex flex-wrap gap-2 items-center">
                    <span className="font-medium">{formatBindingRecipientLabel(g)}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="capitalize">{g.delivery_channel}</span>
                    <span className="text-zinc-400">·</span>
                    <ServiceChips services={g.notification_services} />
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
