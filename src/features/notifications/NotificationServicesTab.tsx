import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Loader2, Search } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import { Modal } from "../../shared/ui/Modal";
import {
  notificationsApi,
  type NotificationServiceItem,
  getApiError,
} from "../../lib/api";
import {
  CHANNEL_OPTIONS,
  ActiveBadge,
  ChannelBadge,
  formatDateTime,
  filterChipClass,
  parseTemplateVariablesJson,
  stringifyTemplateVariables,
} from "./notificationsUiShared";

interface ServiceFormData {
  service_key: string;
  display_name: string;
  channel: string;
  is_active: boolean;
  template_name: string;
  template_variables_json: string;
  email_subject: string;
  email_body: string;
  email_html: string;
}

const EMPTY_SERVICE_FORM: ServiceFormData = {
  service_key: "",
  display_name: "",
  channel: "email",
  is_active: true,
  template_name: "",
  template_variables_json: "",
  email_subject: "",
  email_body: "",
  email_html: "",
};

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

function hiddenServiceDefaults(serviceKey: string, existing?: NotificationServiceItem) {
  return {
    webhook_path: existing?.webhook_path ?? serviceKey,
    require_blood_report_url: existing?.require_blood_report_url ?? false,
    require_bio_ai_report_url: existing?.require_bio_ai_report_url ?? false,
    require_participant_detail: existing?.require_participant_detail ?? false,
    require_otp: existing?.require_otp ?? false,
    require_session_details: existing?.require_session_details ?? false,
    require_external_link: existing?.require_external_link ?? false,
  };
}

export function NotificationServicesTab() {
  const { canEditTask } = usePermissions();
  const mayEditNotifications = canEditTask("notifications", "services");
  const [data, setData] = useState<NotificationServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ServiceChannelFilter>("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatusFilter>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(EMPTY_SERVICE_FORM);
  const [submitting, setSubmitting] = useState(false);

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

  const editingRow = useMemo(
    () => (editingId != null ? data.find((row) => row.notification_service_id === editingId) ?? null : null),
    [data, editingId]
  );

  const openAdd = () => {
    setFormData(EMPTY_SERVICE_FORM);
    setEditingId(null);
    setModalMode("add");
    setModalOpen(true);
    setError(null);
  };

  const openEdit = (row: NotificationServiceItem) => {
    setFormData({
      service_key: row.service_key,
      display_name: row.display_name,
      channel: row.channel,
      is_active: row.is_active,
      template_name: row.template_name ?? "",
      template_variables_json: stringifyTemplateVariables(row.template_variables),
      email_subject: row.email_subject ?? "",
      email_body: row.email_body ?? "",
      email_html: row.email_html ?? "",
    });
    setEditingId(row.notification_service_id);
    setModalMode("edit");
    setModalOpen(true);
    setError(null);
  };

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

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let template_variables: Record<string, unknown> | unknown[] | null = null;
      if (formData.template_variables_json.trim()) {
        template_variables = parseTemplateVariablesJson(formData.template_variables_json);
      }
      const contentFields = {
        template_name: formData.template_name.trim() || null,
        template_variables,
        email_subject: formData.email_subject.trim() || null,
        email_body: formData.email_body.trim() || null,
        email_html: formData.email_html.trim() || null,
      };
      if (modalMode === "add") {
        const hidden = hiddenServiceDefaults(formData.service_key);
        await notificationsApi.createService({
          service_key: formData.service_key.trim(),
          display_name: formData.display_name.trim(),
          channel: formData.channel,
          is_active: formData.is_active,
          ...hidden,
          ...contentFields,
        });
      } else if (editingId !== null && editingRow) {
        const hidden = hiddenServiceDefaults(formData.service_key, editingRow);
        await notificationsApi.updateService(editingId, {
          display_name: formData.display_name.trim(),
          channel: formData.channel,
          is_active: formData.is_active,
          webhook_path: hidden.webhook_path,
          require_blood_report_url: hidden.require_blood_report_url,
          require_bio_ai_report_url: hidden.require_bio_ai_report_url,
          require_participant_detail: hidden.require_participant_detail,
          require_otp: hidden.require_otp,
          require_session_details: hidden.require_session_details,
          require_external_link: hidden.require_external_link,
          ...contentFields,
        });
      }
      setModalOpen(false);
      fetchList();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
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
      {error && !modalOpen && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

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
            <HeaderActionButton label="Add Service" icon={Plus} onClick={openAdd} />
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
            onView={mayEditNotifications ? openEdit : undefined}
            onEdit={openEdit}
            onDelete={handleDelete}
            firstColumnClickableView
            mutationCategory="notifications"
            mutationTaskKey="services"
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError(null);
        }}
        title={modalMode === "add" ? "Add Notification Service" : "Edit Notification Service"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Service Key</label>
            <input
              type="text"
              value={formData.service_key}
              onChange={(e) => setFormData({ ...formData, service_key: e.target.value })}
              disabled={modalMode === "edit"}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder="e.g. reports_email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Display Name</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="e.g. Send Reports Email"
              required
            />
          </div>

          <div className="rounded-lg border border-zinc-200 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800">Delivery</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Channel and availability for this service.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Channel</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-sm text-zinc-700">Active</span>
            </label>
          </div>

          <div className="rounded-lg border border-zinc-200 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800">Content</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Template and email fields used when this service sends a notification.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Template name</label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="WhatsApp or provider template id"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Template variables (JSON)</label>
              <textarea
                value={formData.template_variables_json}
                onChange={(e) => setFormData({ ...formData, template_variables_json: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[100px]"
                placeholder='{"name": "{{participant_name}}"}'
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email subject</label>
              <input
                type="text"
                value={formData.email_subject}
                onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email body (plain)</label>
              <textarea
                value={formData.email_body}
                onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[80px]"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email body (HTML)</label>
              <textarea
                value={formData.email_html}
                onChange={(e) => setFormData({ ...formData, email_html: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {modalMode === "edit" && editingRow ? (
            <p className="text-xs text-zinc-500">Created {formatDateTime(editingRow.created_at)}</p>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-zinc-100">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Saving..." : modalMode === "add" ? "Create Service" : "Update Service"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setError(null);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
