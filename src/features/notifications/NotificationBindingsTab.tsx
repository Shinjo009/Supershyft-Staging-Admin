import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import { Modal } from "../../shared/ui/Modal";
import {
  notificationBindingsApi,
  notificationsApi,
  type NotificationBindingItem,
  type NotificationServiceConfigItem,
  type NotificationServiceItem,
  getApiError,
} from "../../lib/api";

interface BindingEditForm {
  recipient_type: string;
  services_json: string;
}

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

function formatServicesJson(services: NotificationServiceConfigItem[]): string {
  try {
    return JSON.stringify(services, null, 2);
  } catch {
    return "[]";
  }
}

function parseServicesJson(raw: string): NotificationServiceConfigItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parsed: unknown = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error("Services must be a JSON array.");
  }
  return parsed.map((item) => {
    if (item === null || typeof item !== "object" || !("service_key" in item)) {
      throw new Error('Each service entry must include a "service_key".');
    }
    const rec = item as Record<string, unknown>;
    const service_key = String(rec.service_key).trim();
    if (!service_key) throw new Error("service_key cannot be empty.");
    const external_link =
      rec.external_link != null && String(rec.external_link).trim()
        ? String(rec.external_link).trim()
        : undefined;
    return external_link ? { service_key, external_link } : { service_key };
  });
}

export function NotificationBindingsTab() {
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEdit = canEditTask("notifications", "defaults");
  const [data, setData] = useState<NotificationBindingItem[]>([]);
  const [serviceKeys, setServiceKeys] = useState<NotificationServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<NotificationBindingItem | null>(null);
  const [form, setForm] = useState<BindingEditForm>({ recipient_type: "", services_json: "[]" });
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    notificationsApi.listServices().then((r) => setServiceKeys(r.data.data)).catch(() => {});
  }, []);

  const openEdit = (row: NotificationBindingItem) => {
    setEditingRow(row);
    setForm({
      recipient_type: row.recipient_type,
      services_json: formatServicesJson(row.notification_services),
    });
    setModalOpen(true);
    setError(null);
  };

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

  const handleSubmit = async () => {
    if (!editingRow) return;
    setSubmitting(true);
    setError(null);
    try {
      const notification_services = parseServicesJson(form.services_json);
      await notificationBindingsApi.update(editingRow.id, {
        recipient_type: form.recipient_type.trim(),
        notification_services,
      });
      setModalOpen(false);
      setEditingRow(null);
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
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
      {error && !modalOpen && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

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
            onEdit={mayEdit ? openEdit : undefined}
            onDelete={mayEdit ? handleDelete : undefined}
            firstColumnClickableView={false}
            mutationCategory="notifications"
            mutationTaskKey="defaults"
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingRow(null);
          setError(null);
        }}
        title={editingRow ? `Edit binding — ${editingRow.event_name}` : "Edit binding"}
      >
        {editingRow && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

            <div>
              <span className="block text-xs text-zinc-500 mb-0.5">Event</span>
              <span className="text-sm font-medium text-zinc-900">{editingRow.event_name}</span>
              <span className="block text-xs font-mono text-zinc-500">{editingRow.event_code}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Recipient type</label>
              <input
                type="text"
                value={form.recipient_type}
                onChange={(e) => setForm({ ...form, recipient_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                required
              />
              <p className="mt-1 text-xs text-zinc-500">
                How recipients are resolved (e.g. participant, onboarding_expert, custom list).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Services (JSON array)</label>
              <textarea
                value={form.services_json}
                onChange={(e) => setForm({ ...form, services_json: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono min-h-[120px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
                rows={5}
              />
              {serviceKeys.length > 0 && (
                <p className="mt-1 text-xs text-zinc-500">
                  Known keys: {serviceKeys.map((s) => s.service_key).join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-zinc-100">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingRow(null);
                  setError(null);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
