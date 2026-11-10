import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus, Pencil } from "lucide-react";
import {
  HeaderActionButton,
  PageHeaderActions,
  usePageHeader,
} from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import {
  notificationBindingsApi,
  notificationsCatalogApi,
  type CatalogEventItem,
  type NotificationBindingItem,
  type NotificationServiceConfigItem,
  getApiError,
} from "../../lib/api";
import { RECIPIENT_LABELS } from "./notificationsUiShared";

function decodeEventCode(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function ServiceSummary({ services }: { services: NotificationServiceConfigItem[] }) {
  if (!services.length) {
    return <span className="text-zinc-400 text-sm">No services linked</span>;
  }
  return (
    <ul className="space-y-2">
      {services.map((s) => (
        <li
          key={`${s.service_key}-${s.external_link ?? ""}`}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span className="font-medium text-zinc-900">{s.service_key}</span>
          {s.external_link ? (
            <span className="text-xs text-zinc-500 truncate max-w-xs">{s.external_link}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function NotificationEventDetailPage() {
  const { eventCode: eventCodeParam } = useParams<{ eventCode: string }>();
  const eventCode = decodeEventCode(eventCodeParam);
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("notifications", "defaults");

  const [catalogEvent, setCatalogEvent] = useState<CatalogEventItem | null>(null);
  const [bindings, setBindings] = useState<NotificationBindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventCode) return;
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, bindingsRes] = await Promise.all([
        notificationsCatalogApi.getEvents(),
        notificationBindingsApi.list({ event_code: eventCode }),
      ]);
      const ev = catalogRes.data.data.find((c) => c.code === eventCode) ?? null;
      setCatalogEvent(ev);
      setBindings(bindingsRes.data.data);
    } catch (err) {
      setError(getApiError(err));
      setCatalogEvent(null);
      setBindings([]);
    } finally {
      setLoading(false);
    }
  }, [eventCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const distinctServices = useMemo(() => {
    const keys = new Set<string>();
    for (const b of bindings) {
      for (const s of b.notification_services) {
        keys.add(s.service_key);
      }
    }
    return keys.size;
  }, [bindings]);

  usePageHeader(
    catalogEvent
      ? {
          title: catalogEvent.name,
          subtitle: catalogEvent.code,
          backTo: "/notifications/notifications",
        }
      : {
          title: "Notification event",
          subtitle: eventCode || undefined,
          backTo: "/notifications/notifications",
        }
  );

  const handleDelete = async (row: NotificationBindingItem) => {
    if (!window.confirm(`Delete this binding for recipient “${row.recipient_type}”?`)) return;
    try {
      await notificationBindingsApi.delete(row.id);
      await load();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const columns: Column<NotificationBindingItem>[] = [
    {
      key: "recipient_type",
      label: "Recipient",
      sortable: false,
      render: (r) => (
        <div>
          <div className="text-sm font-medium text-zinc-900">
            {RECIPIENT_LABELS[r.recipient_type] ?? r.recipient_type}
          </div>
          <div className="text-xs font-mono text-zinc-500 mt-0.5">{r.recipient_type}</div>
        </div>
      ),
    },
    {
      key: "notification_services",
      label: "Services",
      sortable: false,
      render: (r) => <ServiceSummary services={r.notification_services} />,
    },
    {
      key: "engagement_type_id",
      label: "Scope",
      sortable: false,
      render: (r) => (
        <span className="text-sm text-zinc-600">
          {r.engagement_type_id != null ? `Engagement type #${r.engagement_type_id}` : "Global"}
        </span>
      ),
    },
  ];

  if (!eventCode) {
    return (
      <div className="p-6 text-sm text-zinc-600">
        Invalid event.{" "}
        <Link to="/notifications/notifications" className="text-zinc-900 underline">
          Back to notifications
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-4 sm:p-6 gap-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {catalogEvent?.name ?? eventCode}
                </h2>
                <p className="text-xs font-mono text-zinc-500 mt-1">{eventCode}</p>
                {catalogEvent?.trigger_notes ? (
                  <p className="text-sm text-zinc-600 mt-3">{catalogEvent.trigger_notes}</p>
                ) : null}
              </div>
              <PageHeaderActions>
                <PermissionGate category="notifications" taskKey="defaults" action="edit">
                  <HeaderActionButton
                    label="Add binding"
                    icon={Plus}
                    onClick={() =>
                      navigate(
                        `/notifications/notifications/new?event_code=${encodeURIComponent(eventCode)}`
                      )
                    }
                  />
                </PermissionGate>
              </PageHeaderActions>
            </div>

            <dl className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-zinc-500">Bindings</dt>
                <dd className="font-semibold text-zinc-900">{bindings.length}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Distinct services</dt>
                <dd className="font-semibold text-zinc-900">{distinctServices}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Status</dt>
                <dd className="font-semibold text-zinc-900 capitalize">
                  {catalogEvent?.status ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-900">Who gets which message</h3>
            <p className="text-sm text-zinc-600">
              Each row is one recipient group for this event. When the event fires, matching bindings
              send through the linked notification services.
            </p>

            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {bindings.length === 0 ? (
                <div className="py-12 px-6 text-center text-sm text-zinc-500">
                  No bindings configured for this event yet.
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={bindings}
                  keyExtractor={(r) => r.id}
                  onEdit={mayEdit ? (row) => navigate(`/notifications/notifications/${row.id}/edit`) : undefined}
                  onDelete={mayEdit ? handleDelete : undefined}
                  renderExtraMenuItems={
                    mayEdit
                      ? (row, close) => (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                            onClick={() => {
                              close();
                              navigate(`/notifications/notifications/${row.id}/edit`);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                            Edit content
                          </button>
                        )
                      : undefined
                  }
                  mutationCategory="notifications"
                  mutationTaskKey="defaults"
                />
              )}
            </div>
          </section>

          {catalogEvent && catalogEvent.default_recipients.length > 0 ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600">
              <p className="font-medium text-zinc-900 mb-1">Typical recipients for this event</p>
              <ul className="list-disc pl-5 space-y-1">
                {catalogEvent.default_recipients.map((rt) => (
                  <li key={rt}>
                    {RECIPIENT_LABELS[rt] ?? rt}
                    {catalogEvent.recipient_payload_hints?.[rt] ? (
                      <span className="text-zinc-500"> — uses {catalogEvent.recipient_payload_hints[rt]}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
