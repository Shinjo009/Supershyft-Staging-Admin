import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
import {
  RECIPIENT_LABELS,
  formatPayloadRecipientSummary,
  bindingEditPath,
  catalogEventForEventCode,
} from "./notificationsUiShared";

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

export function NotificationEventDetailPage() {
  const { eventCode: eventCodeParam } = useParams<{ eventCode: string }>();
  const eventCode = decodeEventCode(eventCodeParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("notifications", "defaults");

  const [catalogEvent, setCatalogEvent] = useState<CatalogEventItem | null>(null);
  const [bindings, setBindings] = useState<NotificationBindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventMissing, setEventMissing] = useState(false);

  const load = useCallback(async () => {
    if (!eventCode) return;
    setLoading(true);
    setError(null);
    setEventMissing(false);
    try {
      const [catalogRes, bindingsRes] = await Promise.all([
        notificationsCatalogApi.getEvents(),
        notificationBindingsApi.list({ event_code: eventCode }),
      ]);
      const catalog = catalogRes.data.data;
      const bindingRows = bindingsRes.data.data;
      const ev = catalogEventForEventCode(catalog, eventCode, bindingRows[0]);
      if (ev && ev.code !== eventCode && bindingRows.length === 0) {
        navigate(
          `/notifications/notifications/events/${encodeURIComponent(ev.code)}`,
          { replace: true }
        );
        return;
      }
      setCatalogEvent(ev);
      setBindings(bindingRows);
      setEventMissing(!ev && bindingRows.length === 0);
    } catch (err) {
      setError(getApiError(err));
      setCatalogEvent(null);
      setBindings([]);
      setEventMissing(false);
    } finally {
      setLoading(false);
    }
  }, [eventCode, navigate]);

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

  const headerTitle =
    bindings[0]?.event_name && bindings[0].event_code === eventCode
      ? bindings[0].event_name
      : catalogEvent?.name ?? eventCode;
  const headerSubtitle = catalogEvent?.code ?? eventCode;

  usePageHeader(
    eventMissing
      ? {
          title: "Event not found",
          subtitle: eventCode,
          backTo: "/notifications/notifications",
        }
      : eventCode
        ? {
            title: headerTitle || "Notification event",
            subtitle: headerSubtitle || eventCode,
            backTo: "/notifications/notifications",
          }
        : {
            title: "Notification event",
            backTo: "/notifications/notifications",
          }
  );

  const navigateToBindingEdit = (row: NotificationBindingItem, wizardStep: 2 | 3) => {
    navigate(bindingEditPath(row.id, wizardStep, row), {
      state: {
        returnTo: `${location.pathname}${location.search}`,
        editBinding: {
          recipient_type: row.recipient_type,
          event_code: row.event_code,
        },
      },
    });
  };

  const channelLabel = (ch: string) =>
    ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : ch;

  const handleDelete = async (row: NotificationBindingItem) => {
    if (
      !window.confirm(
        `Delete this ${channelLabel(row.delivery_channel)} binding for recipient “${row.recipient_type}”?`
      )
    )
      return;
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
            {r.recipient_type === "payload"
              ? formatPayloadRecipientSummary(r.recipient_config, catalogEvent)
              : RECIPIENT_LABELS[r.recipient_type] ?? r.recipient_type}
          </div>
          <div className="text-xs font-mono text-zinc-500 mt-0.5">{r.recipient_type}</div>
        </div>
      ),
    },
    {
      key: "delivery_channel",
      label: "Channel",
      sortable: false,
      render: (r) => (
        <span className="text-sm font-medium text-zinc-900">{channelLabel(r.delivery_channel)}</span>
      ),
    },
    {
      key: "notification_services",
      label: "Service",
      sortable: false,
      render: (r) => <ServiceChips services={r.notification_services} />,
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
      ) : eventMissing ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-8 sm:p-10 text-center max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-zinc-900">This event does not exist</h2>
          <p className="mt-2 text-sm text-zinc-600">
            <span className="font-mono text-zinc-800">{eventCode}</span> is not in the notification
            events catalog and has no bindings configured.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Check the code from{" "}
            <Link to="/notifications/notifications" className="text-zinc-900 underline">
              Notifications
            </Link>{" "}
            or pick an event when adding a binding.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {headerTitle || eventCode}
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
              Each row is one recipient and delivery channel (WhatsApp or email). When the event fires,
              every matching row dispatches. Use <span className="font-medium">Add binding</span> again
              with the same recipient to add the other channel as a separate row you can edit on its own.
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
                  onEdit={mayEdit ? (row) => navigateToBindingEdit(row, 2) : undefined}
                  onDelete={mayEdit ? handleDelete : undefined}
                  renderExtraMenuItems={
                    mayEdit
                      ? (row, close) => (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                            onClick={() => {
                              close();
                              navigateToBindingEdit(row, 3);
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
