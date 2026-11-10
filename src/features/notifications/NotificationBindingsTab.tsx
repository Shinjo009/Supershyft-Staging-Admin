import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import {
  notificationBindingsApi,
  type NotificationBindingItem,
  type NotificationServiceConfigItem,
  getApiError,
} from "../../lib/api";

function ServiceChips({ services }: { services: NotificationServiceConfigItem[] }) {
  if (!services.length) {
    return <span className="text-zinc-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1 max-w-md">
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

export function NotificationBindingsTab() {
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("notifications", "defaults");
  const [data, setData] = useState<NotificationBindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async (row: NotificationBindingItem) => {
    if (
      !window.confirm(
        `Delete binding for "${row.event_name}" (${row.event_code})? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await notificationBindingsApi.delete(row.id);
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const columns: Column<NotificationBindingItem>[] = [
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
      key: "recipient_type",
      label: "Recipient",
      sortable: false,
      render: (r) => <span className="text-sm text-zinc-800">{r.recipient_type || "—"}</span>,
    },
    {
      key: "notification_services",
      label: "Services",
      sortable: false,
      hideOnMobile: true,
      render: (r) => <ServiceChips services={r.notification_services} />,
    },
    {
      key: "engagement_type_id",
      label: "Engagement type",
      sortable: false,
      hideOnTablet: true,
      render: (r) => (
        <span className="text-sm text-zinc-600">
          {r.engagement_type_id != null ? `#${r.engagement_type_id}` : "Global"}
        </span>
      ),
    },
  ];

  return (
    <>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      <p className="mb-4 text-sm text-zinc-600">
        Configure which services run when each notification event fires, and who receives them.
      </p>

      <PageHeaderActions>
        <PermissionGate category="notifications" taskKey="defaults" action="edit">
          <HeaderActionButton
            label="Add notification"
            icon={Plus}
            onClick={() => navigate("/notifications/notifications/new")}
          />
        </PermissionGate>
      </PageHeaderActions>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 px-6 text-center text-sm text-zinc-500">
            No notification bindings yet. Add one to map events to services and recipients.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.id}
            onEdit={
              mayEdit ? (row) => navigate(`/notifications/notifications/${row.id}/edit`) : undefined
            }
            onDelete={mayEdit ? handleDelete : undefined}
            firstColumnClickableView={false}
            mutationCategory="notifications"
            mutationTaskKey="defaults"
          />
        )}
      </div>
    </>
  );
}
