import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Search } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import {
  notificationsApi,
  type NotificationServiceItem,
  getApiError,
} from "../../lib/api";
import {
  CHANNEL_OPTIONS,
  ActiveBadge,
  ChannelBadge,
  filterChipClass,
} from "./notificationsUiShared";

type ServiceChannelFilter = "" | "email" | "whatsapp";
type ServiceStatusFilter = "" | "active" | "inactive";

function ServiceNameCell({ row }: { row: NotificationServiceItem }) {
  return (
    <div className="min-w-0">
      <div className="font-medium text-zinc-900 truncate">{row.display_name}</div>
      <div className="text-xs text-zinc-500 truncate" title={row.service_key}>
        {row.service_key}
      </div>
    </div>
  );
}

export function NotificationServicesTab() {
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEditNotifications = canEditTask("notifications", "services");
  const [data, setData] = useState<NotificationServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ServiceChannelFilter>("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatusFilter>("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.listServices();
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

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return data.filter((row) => {
      if (query) {
        const haystack = `${row.display_name} ${row.service_key} ${row.template_name ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (channelFilter && row.channel !== channelFilter) return false;
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      return true;
    });
  }, [channelFilter, data, searchQuery, statusFilter]);

  const handleDelete = async (row: NotificationServiceItem) => {
    if (
      !window.confirm(
        `Delete service "${row.display_name}" (${row.service_key})? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await notificationsApi.deleteService(row.notification_service_id);
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const columns: Column<NotificationServiceItem>[] = [
    {
      key: "display_name",
      label: "Service",
      sortable: false,
      render: (r) => <ServiceNameCell row={r} />,
    },
    {
      key: "channel",
      label: "Channel",
      sortable: false,
      render: (r) => <ChannelBadge channel={r.channel} />,
    },
    {
      key: "template_name",
      label: "Template",
      sortable: false,
      hideOnMobile: true,
      render: (r) => (
        <span className="text-sm text-zinc-700">{r.template_name?.trim() || "—"}</span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: false,
      render: (r) => <ActiveBadge active={r.is_active} />,
    },
  ];

  return (
    <>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center flex-1 min-w-0">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() =>
                  setChannelFilter((prev) => (prev === channel ? "" : (channel as ServiceChannelFilter)))
                }
                className={filterChipClass(channelFilter === channel)}
              >
                {channel.charAt(0).toUpperCase() + channel.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === "active" ? "" : "active"))}
              className={filterChipClass(statusFilter === "active")}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === "inactive" ? "" : "inactive"))}
              className={filterChipClass(statusFilter === "inactive")}
            >
              Inactive
            </button>
          </div>
        </div>
        <PageHeaderActions>
          <PermissionGate category="notifications" taskKey="services" action="edit">
            <HeaderActionButton
              label="Add Service"
              icon={Plus}
              onClick={() => navigate("/notifications/services/new")}
            />
          </PermissionGate>
        </PageHeaderActions>
      </div>

      {!loading && data.length > 0 ? (
        <p className="mb-3 text-xs text-zinc-500">
          Showing {filteredData.length} of {data.length} service{data.length === 1 ? "" : "s"}
        </p>
      ) : null}

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 px-6 text-center text-sm text-zinc-500">
            {data.length === 0
              ? "No notification services configured yet."
              : "No services match your search or filters."}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredData}
            keyExtractor={(r) => r.notification_service_id}
            onView={(row) => navigate(`/notifications/services/${row.notification_service_id}`)}
            onEdit={
              mayEditNotifications
                ? (row) => navigate(`/notifications/services/${row.notification_service_id}/edit`)
                : undefined
            }
            onDelete={handleDelete}
            firstColumnClickableView
            mutationCategory="notifications"
            mutationTaskKey="services"
          />
        )}
      </div>
    </>
  );
}
