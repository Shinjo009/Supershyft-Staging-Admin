import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Search } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate } from "../../contexts/PermissionContext";
import { notificationBindingsApi, type NotificationBindingItem, getApiError } from "../../lib/api";
import {
  formatBindingRecipientLabel,
  RECIPIENT_LABELS,
  groupNotificationBindingsByEvent,
  type NotificationEventGroupRow,
} from "./notificationsUiShared";

function channelLabel(ch: string): string {
  if (ch === "whatsapp") return "WhatsApp";
  if (ch === "email") return "Email";
  return ch || "—";
}

function uniqueRecipientLabels(bindings: NotificationBindingItem[]): string {
  const labels = [
    ...new Set(
      bindings.map((b) => (RECIPIENT_LABELS[b.recipient_type] ?? b.recipient_type).trim()).filter(Boolean)
    ),
  ];
  if (!labels.length) return "—";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function uniqueChannels(bindings: NotificationBindingItem[]): string {
  const channels = [...new Set(bindings.map((b) => channelLabel(b.delivery_channel)).filter((c) => c !== "—"))];
  return channels.length ? channels.join(" · ") : "—";
}

export function NotificationBindingsTab() {
  const navigate = useNavigate();
  const [data, setData] = useState<NotificationBindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationBindingsApi.list();
      setData(res.data.data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filteredBindings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      const haystack = [
        row.event_name,
        row.event_code,
        row.recipient_type,
        formatBindingRecipientLabel(row),
        ...row.notification_services.map((s) => s.service_key),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, searchQuery]);

  const groupedData = useMemo(
    () => groupNotificationBindingsByEvent(filteredBindings),
    [filteredBindings]
  );

  const totalEvents = useMemo(() => groupNotificationBindingsByEvent(data).length, [data]);

  const columns: Column<NotificationEventGroupRow>[] = [
    {
      key: "event_name",
      label: "Event",
      sortable: false,
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-900">{r.event_name}</div>
          <div className="text-xs text-zinc-500 font-mono">{r.event_code}</div>
        </div>
      ),
    },
    {
      key: "bindingCount",
      label: "Bindings",
      sortable: false,
      render: (r) => (
        <span className="text-sm font-medium text-zinc-900">
          {r.bindingCount}
        </span>
      ),
    },
    {
      key: "recipient_type",
      label: "Recipients",
      sortable: false,
      hideOnMobile: true,
      render: (r) => (
        <span className="text-sm text-zinc-600">{uniqueRecipientLabels(r.bindings)}</span>
      ),
    },
    {
      key: "delivery_channel",
      label: "Channels",
      sortable: false,
      hideOnMobile: true,
      render: (r) => (
        <span className="text-sm text-zinc-600">{uniqueChannels(r.bindings)}</span>
      ),
    },
    {
      key: "engagement_type_id",
      label: "Scope",
      sortable: false,
      hideOnTablet: true,
      render: (r) => (
        <span className="text-sm text-zinc-600">
          {r.engagement_type_id != null ? `Engagement type #${r.engagement_type_id}` : "Global"}
        </span>
      ),
    },
  ];

  const openEvent = (row: NotificationEventGroupRow) => {
    navigate(`/notifications/notifications/events/${encodeURIComponent(row.event_code)}`);
  };

  return (
    <>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:max-w-md flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, recipients, services…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <PageHeaderActions>
          <PermissionGate category="notifications" taskKey="defaults" action="edit">
            <HeaderActionButton
              label="Add notification"
              icon={Plus}
              onClick={() => navigate("/notifications/notifications/new")}
            />
          </PermissionGate>
        </PageHeaderActions>
      </div>

      {!loading && data.length > 0 ? (
        <p className="mb-3 text-xs text-zinc-500">
          Showing {groupedData.length} event{groupedData.length === 1 ? "" : "s"}
          {totalEvents !== groupedData.length ? ` (filtered)` : ""} · {filteredBindings.length} binding
          {filteredBindings.length === 1 ? "" : "s"} total
        </p>
      ) : null}

      <p className="mb-3 text-xs text-zinc-500">
        Open an event to view and edit each recipient and channel binding.
      </p>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : groupedData.length === 0 ? (
          <div className="py-12 px-6 text-center text-sm text-zinc-500">
            {data.length === 0
              ? "No notification bindings yet. Add one to map events to services and recipients."
              : "No bindings match your search."}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={groupedData}
            keyExtractor={(r) => r.key}
            onView={openEvent}
            firstColumnClickableView
            mutationCategory="notifications"
            mutationTaskKey="defaults"
          />
        )}
      </div>
    </>
  );
}
