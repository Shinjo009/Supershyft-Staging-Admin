import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import {
  getApiError,
  notificationEventBindingsApi,
  type NotificationEventBindingItem,
} from "../../lib/api";

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-50 text-zinc-500 border-zinc-200">
      Inactive
    </span>
  );
}

export function BindingsListTab() {
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("notifications", "events");
  const [data, setData] = useState<NotificationEventBindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationEventBindingsApi.list();
      setData(res.data.data ?? []);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async (row: NotificationEventBindingItem) => {
    if (!window.confirm(`Delete binding for ${row.event_code} / ${row.recipient_type}?`)) return;
    try {
      await notificationEventBindingsApi.delete(row.id);
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const columns: Column<NotificationEventBindingItem>[] = [
    { key: "event_code", label: "Event code", sortable: false },
    { key: "event_name", label: "Event name", sortable: false, hideOnTablet: true },
    { key: "recipient_type", label: "Recipient", sortable: false },
    {
      key: "notification_services",
      label: "Services",
      sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-md">
          {r.notification_services.map((sk) => (
            <span
              key={sk}
              className="inline-flex px-2 py-0.5 rounded-full text-xs border bg-zinc-50 text-zinc-700 border-zinc-200"
            >
              {sk}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Active",
      sortable: false,
      render: (r) => <ActiveBadge active={r.is_active} />,
    },
  ];

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      <PageHeaderActions>
        <PermissionGate category="notifications" taskKey="events" action="edit">
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
        ) : (
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.id}
            onEdit={mayEdit ? (r) => navigate(`/notifications/notifications/${r.id}/edit`) : undefined}
            onDelete={mayEdit ? handleDelete : undefined}
            mutationCategory="notifications"
            mutationTaskKey="events"
          />
        )}
      </div>
    </>
  );
}
