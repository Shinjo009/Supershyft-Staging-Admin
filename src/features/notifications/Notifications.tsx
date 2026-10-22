import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2, X, ScrollText, Search, Trash2 } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { PermissionGate, usePermissions } from "../../contexts/PermissionContext";
import { Modal } from "../../shared/ui/Modal";
import { UserSearchPicker } from "../../shared/ui/UserSearchPicker";
import { EngagementSearchPicker } from "../../shared/ui/EngagementSearchPicker";
import { buildIntegrationLogsPath } from "../integration-logs/integrationSyncLogsUtils";
import {
  notificationsApi,
  notificationEventBindingsApi,
  type NotificationItem,
  type NotificationRecipient,
  type NotificationServiceItem,
  type NotificationEventBindingItem,
  type NotificationServiceConfigItem,
  getApiError,
} from "../../lib/api";
import {
  bindingChannels,
  recipientTypeLabel,
  serviceContentSummary,
} from "./notificationWizardUtils";

type TabKey = "logs" | "services" | "notifications";
const TAB_KEYS: TabKey[] = ["logs", "services", "notifications"];

const TAB_LABELS: Record<TabKey, string> = {
  logs: "Logs",
  services: "Services",
  notifications: "Notifications",
};

const STATUS_OPTIONS = [
  "pending",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "deleted",
];
const CHANNEL_OPTIONS = ["email", "whatsapp"];
const FILTER_DEBOUNCE_MS = 300;

type TimePreset = "" | "1h" | "24h" | "7d" | "30d" | "custom";

const DEFAULT_TIME_PRESET: TimePreset = "1h";

const TIME_PRESETS: { key: TimePreset; label: string }[] = [
  { key: "", label: "All time" },
  { key: "1h", label: "Last 1h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "custom", label: "Custom" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    queued: "bg-blue-50 text-blue-700 border-blue-200",
    sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delivered: "bg-emerald-50 text-emerald-800 border-emerald-300",
    read: "bg-zinc-100 text-zinc-700 border-zinc-300",
    failed: "bg-red-50 text-red-700 border-red-200",
    deleted: "bg-zinc-50 text-zinc-500 border-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? "bg-zinc-50 text-zinc-700 border-zinc-200"}`}
    >
      {status}
    </span>
  );
}

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

function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    email: "bg-blue-50 text-blue-700 border-blue-200",
    whatsapp: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[channel] ?? "bg-zinc-50 text-zinc-700 border-zinc-200"}`}
    >
      {channel}
    </span>
  );
}

function formatDateTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString();
  } catch {
    return val;
  }
}

function localDatetimeToIso(val: string): string | undefined {
  if (!val.trim()) return undefined;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function getDispatchedRange(
  preset: TimePreset,
  customFrom: string,
  customTo: string
): { dispatched_from?: string; dispatched_to?: string } {
  if (preset === "custom") {
    return {
      dispatched_from: localDatetimeToIso(customFrom),
      dispatched_to: localDatetimeToIso(customTo),
    };
  }
  if (!preset) return {};
  const now = new Date();
  const to = now.toISOString();
  const hours: Record<string, number> = { "1h": 1, "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
  const h = hours[preset];
  if (!h) return {};
  const from = new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  return { dispatched_from: from, dispatched_to: to };
}

function recipientDisplayName(r: NotificationRecipient): string {
  const first = (r.first_name ?? "").trim();
  const last = (r.last_name ?? "").trim();
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || `User #${r.user_id}`;
}

function formatRecipientsCell(row: NotificationItem): { text: string; title: string } {
  const recipients = row.recipients ?? [];
  if (recipients.length > 0) {
    const names = recipients.map(recipientDisplayName);
    return { text: names.join(", "), title: names.join(", ") };
  }
  const ids = row.user?.user_ids ?? [];
  if (!ids.length) return { text: "—", title: "" };
  const text = ids.map((id) => `User #${id}`).join(", ");
  return { text, title: text };
}

function formatEngagementCell(row: NotificationItem): string {
  if (row.engagement_id == null) return "—";
  const name = (row.engagement_name ?? row.engagement_code ?? "").trim();
  return name || `Engagement #${row.engagement_id}`;
}

function filterChipClass(active: boolean): string {
  return `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active
      ? "bg-zinc-900 text-white border-zinc-900"
      : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400"
  }`;
}

// ── Logs Tab ─────────────────────────────────────────────────────────

function LogsTab() {
  const location = useLocation();
  const { canEditTask } = usePermissions();
  const mayEditNotifications = canEditTask("notifications", "messages");
  const [data, setData] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const requestedStatus = (location.state as { statusFilter?: string } | null)?.statusFilter;
  const [statusFilters, setStatusFilters] = useState<string[]>(
    requestedStatus ? [requestedStatus] : []
  );
  const [timePreset, setTimePreset] = useState<TimePreset>(requestedStatus ? "" : DEFAULT_TIME_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [serviceKeyFilter, setServiceKeyFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState(0);
  const [engagementIdFilter, setEngagementIdFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [debouncedStatusFilters, setDebouncedStatusFilters] = useState<string[]>(
    requestedStatus ? [requestedStatus] : []
  );
  const [debouncedTimePreset, setDebouncedTimePreset] = useState<TimePreset>(
    requestedStatus ? "" : DEFAULT_TIME_PRESET
  );
  const [debouncedCustomFrom, setDebouncedCustomFrom] = useState("");
  const [debouncedCustomTo, setDebouncedCustomTo] = useState("");
  const [debouncedServiceKey, setDebouncedServiceKey] = useState("");
  const [debouncedChannel, setDebouncedChannel] = useState("");
  const [debouncedUserId, setDebouncedUserId] = useState(0);
  const [debouncedEngagementId, setDebouncedEngagementId] = useState(0);

  const [services, setServices] = useState<NotificationServiceItem[]>([]);

  useEffect(() => {
    notificationsApi.listServices().then((r) => setServices(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedStatusFilters(statusFilters);
      setDebouncedTimePreset(timePreset);
      setDebouncedCustomFrom(customFrom);
      setDebouncedCustomTo(customTo);
      setDebouncedServiceKey(serviceKeyFilter);
      setDebouncedChannel(channelFilter);
      setDebouncedUserId(userIdFilter);
      setDebouncedEngagementId(engagementIdFilter);
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    statusFilters,
    timePreset,
    customFrom,
    customTo,
    serviceKeyFilter,
    channelFilter,
    userIdFilter,
    engagementIdFilter,
  ]);

  const listQueryParams = useMemo(() => {
    const range = getDispatchedRange(debouncedTimePreset, debouncedCustomFrom, debouncedCustomTo);
    return {
      page,
      limit,
      status: debouncedStatusFilters.length
        ? debouncedStatusFilters.join(",")
        : undefined,
      service_key: debouncedServiceKey || undefined,
      channel: debouncedChannel || undefined,
      user_id: debouncedUserId > 0 ? debouncedUserId : undefined,
      engagement_id: debouncedEngagementId > 0 ? debouncedEngagementId : undefined,
      ...range,
    };
  }, [
    page,
    limit,
    debouncedStatusFilters,
    debouncedServiceKey,
    debouncedChannel,
    debouncedUserId,
    debouncedEngagementId,
    debouncedTimePreset,
    debouncedCustomFrom,
    debouncedCustomTo,
  ]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.list(listQueryParams);
      setData(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [listQueryParams]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const resetPage = () => setPage(1);

  const toggleStatus = (status: string) => {
    setStatusFilters((prev) => {
      if (prev.includes(status)) return prev.filter((s) => s !== status);
      return [...prev, status];
    });
    resetPage();
  };

  const clearAllFilters = () => {
    setStatusFilters([]);
    setTimePreset(DEFAULT_TIME_PRESET);
    setCustomFrom("");
    setCustomTo("");
    setServiceKeyFilter("");
    setChannelFilter("");
    setUserIdFilter(0);
    setEngagementIdFilter(0);
    resetPage();
  };

  const hasActiveFilters =
    statusFilters.length > 0 ||
    (timePreset !== "" && timePreset !== DEFAULT_TIME_PRESET) ||
    serviceKeyFilter !== "" ||
    channelFilter !== "" ||
    userIdFilter > 0 ||
    engagementIdFilter > 0;

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (statusFilters.length) labels.push(`Status: ${statusFilters.join(", ")}`);
    if (timePreset === "custom") {
      if (customFrom || customTo) labels.push("Custom date range");
    } else if (timePreset && timePreset !== DEFAULT_TIME_PRESET) {
      const presetLabel = TIME_PRESETS.find((p) => p.key === timePreset)?.label;
      if (presetLabel) labels.push(presetLabel);
    }
    if (serviceKeyFilter) {
      const svc = services.find((s) => s.service_key === serviceKeyFilter);
      labels.push(`Service: ${svc?.display_name ?? serviceKeyFilter}`);
    }
    if (channelFilter) labels.push(`Channel: ${channelFilter}`);
    if (userIdFilter > 0) labels.push(`User #${userIdFilter}`);
    if (engagementIdFilter > 0) labels.push(`Engagement #${engagementIdFilter}`);
    return labels;
  }, [
    statusFilters,
    timePreset,
    customFrom,
    customTo,
    serviceKeyFilter,
    channelFilter,
    userIdFilter,
    engagementIdFilter,
    services,
  ]);

  const handleDelete = async (row: NotificationItem) => {
    if (!window.confirm(`Delete notification #${row.notification_id}? This cannot be undone.`)) return;
    try {
      await notificationsApi.delete(row.notification_id);
      setSelectedIds((prev) => {
        if (!prev.has(row.notification_id)) return prev;
        const next = new Set(prev);
        next.delete(row.notification_id);
        return next;
      });
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const pageIds = useMemo(() => data.map((r) => r.notification_id), [data]);
  const selectedCount = selectedIds.size;
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleRowSelection = (notificationId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(notificationId)) next.delete(notificationId);
      else next.add(notificationId);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    const noun = selectedCount === 1 ? "notification" : "notifications";
    if (!window.confirm(`Delete ${selectedCount} ${noun}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    setError(null);
    try {
      const ids = Array.from(selectedIds);
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        await notificationsApi.bulkDelete(ids.slice(i, i + chunkSize));
      }
      setSelectedIds(new Set());
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBulkDeleting(false);
    }
  };

  const columns: Column<NotificationItem>[] = [
    {
      key: "_select",
      label: (
        <input
          type="checkbox"
          checked={allOnPageSelected}
          ref={(el) => {
            if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
          }}
          onChange={toggleSelectAllOnPage}
          onClick={(e) => e.stopPropagation()}
          disabled={data.length === 0 || bulkDeleting}
          className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          aria-label="Select all notifications on this page"
          title="Select all on this page"
        />
      ),
      sortable: false,
      className: "w-10",
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.has(r.notification_id)}
          onChange={() => toggleRowSelection(r.notification_id)}
          disabled={bulkDeleting}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          aria-label={`Select notification ${r.notification_id}`}
        />
      ),
    },
    { key: "notification_id", label: "ID", sortable: false, className: "w-16" },
    {
      key: "service_display_name",
      label: "Service",
      sortable: false,
      render: (r) => {
        const display = r.service_display_name || r.service_key;
        return (
          <span className="font-medium" title={r.service_key}>
            {display}
          </span>
        );
      },
    },
    {
      key: "channel",
      label: "Channel",
      sortable: false,
      hideOnMobile: true,
      render: (r) => <ChannelBadge channel={r.channel} />,
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "queue_id",
      label: "Queue ID",
      sortable: false,
      hideOnMobile: true,
      render: (r) => {
        const q = r.queue_id?.trim();
        if (!q) return <span className="text-zinc-400">—</span>;
        const short = q.length > 14 ? `${q.slice(0, 12)}…` : q;
        return (
          <span className="font-mono text-xs text-zinc-600" title={q}>
            {short}
          </span>
        );
      },
    },
    {
      key: "event_code",
      label: "Event",
      sortable: false,
      hideOnTablet: true,
      render: (r) => {
        if (!r.event_code) return <span className="text-zinc-400">—</span>;
        const title = r.recipient_type ? `${r.event_code} (${r.recipient_type})` : r.event_code;
        return (
          <span className="text-xs text-zinc-600 truncate max-w-[8rem] block" title={title}>
            {r.event_code}
          </span>
        );
      },
    },
    {
      key: "recipients",
      label: "Recipients",
      sortable: false,
      hideOnMobile: true,
      render: (r) => {
        const { text, title } = formatRecipientsCell(r);
        return (
          <span className="block max-w-[10rem] truncate" title={title || undefined}>
            {text}
          </span>
        );
      },
    },
    {
      key: "engagement_name",
      label: "Engagement",
      sortable: false,
      hideOnTablet: true,
      render: (r) => {
        const label = formatEngagementCell(r);
        const title =
          r.engagement_id != null
            ? [r.engagement_name, r.engagement_code, `#${r.engagement_id}`]
                .filter(Boolean)
                .join(" · ")
            : undefined;
        return (
          <span className="block max-w-[12rem] truncate" title={title}>
            {label}
          </span>
        );
      },
    },
    {
      key: "message",
      label: "Message",
      sortable: false,
      hideOnTablet: true,
      render: (r) => (
        <span className="block max-w-xs truncate" title={r.message ?? ""}>
          {r.message || "—"}
        </span>
      ),
    },
    {
      key: "dispatched_at",
      label: "Dispatched",
      sortable: false,
      hideOnTablet: true,
      render: (r) => <span className="text-xs text-zinc-500">{formatDateTime(r.dispatched_at)}</span>,
    },
    {
      key: "completed_at",
      label: "Completed",
      sortable: false,
      hideOnTablet: true,
      render: (r) => <span className="text-xs text-zinc-500">{formatDateTime(r.completed_at)}</span>,
    },
  ];

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 w-full sm:w-auto">Status</span>
          <button
            type="button"
            onClick={() => {
              setStatusFilters([]);
              resetPage();
            }}
            className={filterChipClass(statusFilters.length === 0)}
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={filterChipClass(statusFilters.includes(s))}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 w-full sm:w-auto">Dispatched</span>
          {TIME_PRESETS.map((p) => (
            <button
              key={p.key || "all"}
              type="button"
              onClick={() => {
                setTimePreset(p.key);
                resetPage();
              }}
              className={filterChipClass(timePreset === p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {timePreset === "custom" && (
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <label className="block">
              <span className="text-xs text-zinc-500">From</span>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  resetPage();
                }}
                className="mt-1 block px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">To</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  resetPage();
                }}
                className="mt-1 block px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
          <label className="block">
            <span className="text-xs text-zinc-500">Service</span>
            <select
              value={serviceKeyFilter}
              onChange={(e) => {
                setServiceKeyFilter(e.target.value);
                resetPage();
              }}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">All services</option>
              {services.map((s) => (
                <option key={s.service_key} value={s.service_key}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Channel</span>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                resetPage();
              }}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">All channels</option>
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <UserSearchPicker
            value={userIdFilter}
            onChange={(id) => {
              setUserIdFilter(id);
              resetPage();
            }}
            label="User"
            className="min-w-0"
          />
          <div className="flex items-end gap-2 min-w-0">
            <EngagementSearchPicker
              value={engagementIdFilter}
              onChange={(id) => {
                setEngagementIdFilter(id);
                resetPage();
              }}
              label="Engagement"
              className="min-w-0 flex-1"
            />
            {mayEditNotifications && selectedCount > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting || loading}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {bulkDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete ({selectedCount})
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>

        {activeFilterLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilterLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(r) => r.notification_id}
            onDelete={handleDelete}
            firstColumnClickableView={false}
            mutationCategory="notifications"
            mutationTaskKey="messages"
            pagination={{ page, limit, total, onPageChange: setPage }}
          />
        )}
      </div>
    </>
  );
}

// ── Services Tab ───────────────────────────────────────────────────────

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
  template_variables_json: "[]",
  email_subject: "",
  email_body: "",
  email_html: "",
};

type ServiceChannelFilter = "" | "email" | "whatsapp";
type ServiceStatusFilter = "" | "active" | "inactive";

function templateVariablesToJson(raw: unknown[] | null | undefined): string {
  if (!raw || !Array.isArray(raw)) return "[]";
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return "[]";
  }
}

function parseTemplateVariablesJson(text: string): unknown[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Template variables must be a JSON array");
  }
  return parsed;
}

function ServiceContentCell({ row }: { row: NotificationServiceItem }) {
  if (row.channel === "whatsapp") {
    const name = row.template_name?.trim();
    return (
      <span className="text-sm text-zinc-700 truncate max-w-[12rem] block" title={name ?? undefined}>
        {name || "—"}
      </span>
    );
  }
  const subject = row.email_subject?.trim();
  return (
    <span className="text-sm text-zinc-700 truncate max-w-[12rem] block" title={subject ?? undefined}>
      {subject || "—"}
    </span>
  );
}

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

function ServicesTab() {
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
        const haystack = `${row.display_name} ${row.service_key} ${row.template_name ?? ""} ${row.email_subject ?? ""}`.toLowerCase();
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
      template_variables_json: templateVariablesToJson(
        row.template_variables as unknown[] | null | undefined
      ),
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
      const template_variables = parseTemplateVariablesJson(formData.template_variables_json);
      const payload = {
        display_name: formData.display_name,
        channel: formData.channel,
        is_active: formData.is_active,
        template_name: formData.template_name.trim() || null,
        template_variables,
        email_subject: formData.email_subject.trim() || null,
        email_body: formData.email_body.trim() || null,
        email_html: formData.email_html.trim() || null,
      };
      if (modalMode === "add") {
        await notificationsApi.createService({
          service_key: formData.service_key,
          ...payload,
        });
      } else if (editingId !== null) {
        await notificationsApi.updateService(editingId, payload);
      }
      setModalOpen(false);
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiError(err));
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
      key: "is_active",
      label: "Status",
      sortable: false,
      render: (r) => <ActiveBadge active={r.is_active} />,
    },
    {
      key: "content",
      label: "Template / Subject",
      sortable: false,
      render: (r) => <ServiceContentCell row={r} />,
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
        onClose={() => { setModalOpen(false); setError(null); }}
        title={modalMode === "add" ? "Add Notification Service" : "Edit Notification Service"}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}

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
              <p className="text-xs text-zinc-500 mt-0.5">
                Direct send via WhatAPI (WhatsApp) or SMTP (email).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Channel</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
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

          {formData.channel === "whatsapp" ? (
            <div className="rounded-lg border border-zinc-200 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-800">WhatsApp template</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Template name</label>
                <input
                  type="text"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="e.g. otp_message"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Template variables (JSON array)</label>
                <textarea
                  value={formData.template_variables_json}
                  onChange={(e) => setFormData({ ...formData, template_variables_json: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[100px]"
                  placeholder='["{{otp}}", "{{first_name}}"]'
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Ordered list of literals or {"{{placeholder}}"} bindings for the template body.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-800">Email content</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.email_subject}
                  onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Plain body</label>
                <textarea
                  value={formData.email_body}
                  onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">HTML body</label>
                <textarea
                  value={formData.email_html}
                  onChange={(e) => setFormData({ ...formData, email_html: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {modalMode === "edit" && editingRow ? (
            <p className="text-xs text-zinc-500">
              Created {formatDateTime(editingRow.created_at)}
            </p>
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
              onClick={() => { setModalOpen(false); setError(null); }}
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

// ── Platform notifications (event bindings) ─────────────────────────

function formatBindingServices(services: NotificationServiceConfigItem[]): string {
  return services.map((s) => s.service_key).join(", ");
}

function ChannelBadges({ channels }: { channels: Array<"whatsapp" | "email"> }) {
  if (!channels.length) return <span className="text-zinc-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((ch) => (
        <span
          key={ch}
          className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${
            ch === "whatsapp"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          {ch === "whatsapp" ? "WhatsApp" : "Email"}
        </span>
      ))}
    </div>
  );
}

function EventBindingsTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<NotificationEventBindingItem[]>([]);
  const [serviceByKey, setServiceByKey] = useState<Map<string, NotificationServiceItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bindingsRes, servicesRes] = await Promise.all([
        notificationEventBindingsApi.list(),
        notificationsApi.listServices(),
      ]);
      setData(bindingsRes.data.data);
      const map = new Map<string, NotificationServiceItem>();
      for (const s of servicesRes.data.data ?? []) {
        map.set(s.service_key, s);
      }
      setServiceByKey(map);
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
    const saved = (location.state as { notificationSaved?: boolean } | null)?.notificationSaved;
    if (saved) {
      setSuccessBanner(true);
      navigate("/notifications/notifications", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const openEdit = (row: NotificationEventBindingItem) => {
    navigate(`/notifications/notifications/${row.id}/edit`);
  };

  const handleDelete = async (row: NotificationEventBindingItem) => {
    if (!window.confirm(`Delete binding for "${row.event_code}" (${row.recipient_type})?`)) return;
    try {
      await notificationEventBindingsApi.delete(row.id);
      await fetchList();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const columns: Column<NotificationEventBindingItem>[] = [
    {
      key: "event",
      label: "Event",
      sortable: false,
      render: (r) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 truncate">{r.event_name}</p>
          <p className="text-xs font-mono text-zinc-500 truncate">{r.event_code}</p>
        </div>
      ),
    },
    {
      key: "recipient_type",
      label: "Recipient",
      sortable: false,
      hideOnMobile: true,
      render: (r) => (
        <span className="text-sm text-zinc-700">{recipientTypeLabel(r.recipient_type)}</span>
      ),
    },
    {
      key: "channels",
      label: "Channel(s)",
      sortable: false,
      render: (r) => (
        <ChannelBadges channels={bindingChannels(r.notification_services ?? [], serviceByKey)} />
      ),
    },
    {
      key: "content",
      label: "Content",
      sortable: false,
      hideOnTablet: true,
      render: (r) => {
        const sk = r.notification_services?.[0]?.service_key;
        const svc = sk ? serviceByKey.get(sk) : undefined;
        const summary = serviceContentSummary(svc);
        return (
          <span className="text-sm text-zinc-700 truncate max-w-[10rem] block" title={summary}>
            {summary}
          </span>
        );
      },
    },
    {
      key: "notification_services",
      label: "Services",
      sortable: false,
      render: (r) => (
        <span
          className="text-xs text-zinc-600 truncate max-w-md block"
          title={formatBindingServices(r.notification_services)}
        >
          {formatBindingServices(r.notification_services) || "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      {successBanner && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm border border-emerald-200">
          Notification saved successfully.
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <PageHeaderActions>
        <PermissionGate category="notifications" taskKey="bindings" action="edit">
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
            onEdit={openEdit}
            onDelete={handleDelete}
            firstColumnClickableView={false}
            mutationCategory="notifications"
            mutationTaskKey="bindings"
          />
        )}
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export function Notifications() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const activeTab: TabKey = TAB_KEYS.includes((tabParam ?? "") as TabKey)
    ? (tabParam as TabKey)
    : "logs";

  useEffect(() => {
    if (tabParam !== activeTab) {
      navigate(`/notifications/${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate, tabParam]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeaderActions>
        {activeTab === "logs" && (
          <HeaderActionButton
            label="Sync Logs"
            icon={ScrollText}
            variant="secondary"
            onClick={() => navigate(buildIntegrationLogsPath({ provider: "whatapi" }))}
          />
        )}
      </PageHeaderActions>

      <div className="flex gap-1 mb-5 border-b border-zinc-200">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            onClick={() => navigate(`/notifications/${tab}`)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeTab === tab
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === "logs" && <LogsTab />}
      {activeTab === "services" && <ServicesTab />}
      {activeTab === "notifications" && <EventBindingsTab />}

    </div>
  );
}
