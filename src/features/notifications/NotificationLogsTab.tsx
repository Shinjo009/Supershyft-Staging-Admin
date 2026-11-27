import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Columns3, Loader2, Trash2, X } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import { EngagementSearchPicker } from "../../shared/ui/EngagementSearchPicker";
import { UserSearchPicker } from "../../shared/ui/UserSearchPicker";
import { usePermissions } from "../../contexts/PermissionContext";
import {
  notificationsApi,
  type NotificationItem,
  type NotificationServiceItem,
  getApiError,
} from "../../lib/api";
import {
  STATUS_OPTIONS,
  CHANNEL_OPTIONS,
  FILTER_DEBOUNCE_MS,
  DEFAULT_TIME_PRESET,
  TIME_PRESETS,
  type TimePreset,
  StatusBadge,
  ChannelBadge,
  formatDateTime,
  getDispatchedRange,
  formatRecipientsCell,
  formatEngagementCell,
  filterChipClass,
} from "./notificationsUiShared";

const COMPACT_COLUMN_KEYS = new Set([
  "_select",
  "notification_id",
  "service_display_name",
  "channel",
  "status",
  "recipients",
  "engagement_name",
  "message",
]);

export function NotificationLogsTab() {
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
  const [timePreset, setTimePreset] = useState<TimePreset>(DEFAULT_TIME_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [serviceKeyFilter, setServiceKeyFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState(0);
  const [engagementIdFilter, setEngagementIdFilter] = useState(0);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [debouncedStatusFilters, setDebouncedStatusFilters] = useState<string[]>(
    requestedStatus ? [requestedStatus] : []
  );
  const [debouncedTimePreset, setDebouncedTimePreset] = useState<TimePreset>(DEFAULT_TIME_PRESET);
  const [debouncedCustomFrom, setDebouncedCustomFrom] = useState("");
  const [debouncedCustomTo, setDebouncedCustomTo] = useState("");
  const [debouncedServiceKey, setDebouncedServiceKey] = useState("");
  const [debouncedChannel, setDebouncedChannel] = useState("");
  const [debouncedUserId, setDebouncedUserId] = useState(0);
  const [debouncedEngagementId, setDebouncedEngagementId] = useState(0);

  const [services, setServices] = useState<NotificationServiceItem[]>([]);

  useEffect(() => {
    notificationsApi.listServices({ page: 1, limit: 100 }).then((r) => setServices(r.data.data)).catch(() => {});
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
      status: debouncedStatusFilters.length ? debouncedStatusFilters.join(",") : undefined,
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
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
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

  const allColumns: Column<NotificationItem>[] = useMemo(
    () => [
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
        key: "queue_id",
        label: "Queue",
        sortable: false,
        className: "w-16",
        render: (r) => (
          <span className="text-xs text-zinc-600">{r.queue_id != null ? r.queue_id : "—"}</span>
        ),
      },
      {
        key: "event_code",
        label: "Event",
        sortable: false,
        render: (r) => {
          if (!r.event_code) {
            return <span className="text-zinc-400">—</span>;
          }
          const display = r.event_display_name || r.event_code;
          return (
            <span className="font-medium" title={r.event_code}>
              {display}
            </span>
          );
        },
      },
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
        render: (r) => <ChannelBadge channel={r.channel} />,
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (r) => (
          <StatusBadge status={r.status} queueId={r.queue_id} message={r.message} />
        ),
      },
      {
        key: "recipients",
        label: "Recipient",
        sortable: false,
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
        render: (r) => {
          const label = formatEngagementCell(r);
          const title =
            r.engagement_id != null
              ? [r.engagement_name, r.engagement_code, `#${r.engagement_id}`].filter(Boolean).join(" · ")
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
        render: (r) => <span className="text-xs text-zinc-500">{formatDateTime(r.dispatched_at)}</span>,
      },
      {
        key: "completed_at",
        label: "Completed",
        sortable: false,
        render: (r) => <span className="text-xs text-zinc-500">{formatDateTime(r.completed_at)}</span>,
      },
    ],
    [
      allOnPageSelected,
      someOnPageSelected,
      data.length,
      bulkDeleting,
      selectedIds,
    ]
  );

  const columns = useMemo(() => {
    if (showAllColumns) return allColumns;
    return allColumns.filter((col) => COMPACT_COLUMN_KEYS.has(col.key));
  }, [allColumns, showAllColumns]);

  const controlClassName =
    "h-9 w-full min-w-0 px-3 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900";

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="mb-4 space-y-3 overflow-visible">
        <div className="flex items-center gap-2 min-w-0 overflow-visible">
          <UserSearchPicker
            value={userIdFilter}
            onChange={(id) => {
              setUserIdFilter(id);
              resetPage();
            }}
            label=""
            placeholder="Search by name, phone, or email…"
            className="flex-1 min-w-[10rem] max-w-xs [&_input]:h-9"
          />

          <div className="flex items-center gap-1.5 shrink-0">
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

          <div className="relative flex-1 min-w-[7.5rem] max-w-[10rem]">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <select
              value={timePreset}
              onChange={(e) => {
                setTimePreset(e.target.value as TimePreset);
                resetPage();
              }}
              className={`${controlClassName} pl-8`}
              aria-label="Date range"
            >
              {TIME_PRESETS.map((p) => (
                <option key={p.key || "all"} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[7rem] max-w-[10rem]">
            <select
              value={serviceKeyFilter}
              onChange={(e) => {
                setServiceKeyFilter(e.target.value);
                resetPage();
              }}
              className={controlClassName}
              aria-label="Service"
            >
              <option value="">Service</option>
              {services.map((s) => (
                <option key={s.service_key} value={s.service_key}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[6.5rem] max-w-[8.5rem]">
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                resetPage();
              }}
              className={controlClassName}
              aria-label="Channel"
            >
              <option value="">Channel</option>
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <EngagementSearchPicker
            value={engagementIdFilter}
            onChange={(id) => {
              setEngagementIdFilter(id);
              resetPage();
            }}
            label=""
            placeholder="Engagement"
            className="flex-1 min-w-[8rem] max-w-[11rem] [&_input]:h-9"
          />

          {mayEditNotifications && selectedCount > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || loading}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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

        {activeFilterLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200"
              >
                {label}
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center justify-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50 shrink-0 whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
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
            allowExtraMenuWhenReadOnly
            renderExtraMenuItems={(_row, closeMenu) => (
              <button
                type="button"
                onClick={() => {
                  setShowAllColumns((prev) => !prev);
                  closeMenu();
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <Columns3 className="w-4 h-4" />
                {showAllColumns ? "Show fewer columns" : "View all columns"}
              </button>
            )}
            pagination={{ page, limit, total, onPageChange: setPage }}
          />
        )}
      </div>
    </>
  );
}
