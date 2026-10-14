import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Copy, Filter, Loader2, RefreshCw, Search, X } from "lucide-react";
import { PageHeaderActions, HeaderActionButton } from "../../layouts/PageHeaderActions";
import { integrationSyncLogsApi, getApiError, type IntegrationSyncLog } from "../../lib/api";
import {
  STATUS_OPTIONS,
  PROVIDER_OPTIONS,
  TIME_PRESETS,
  StatusBadge,
  ProviderBadge,
  formatRelativeTime,
  formatDateTime,
  summarizeEndpoint,
  getTimeRange,
  defaultPayloadTab,
  formatWho,
  type TimePreset,
  type PayloadTab,
} from "./integrationSyncLogsUtils";

const LIMIT = 25;
const DEFAULT_TIME: TimePreset = "24h";

function parseTimeParam(raw: string | null): TimePreset {
  if (raw === "1h" || raw === "24h" || raw === "7d" || raw === "30d" || raw === "all") {
    return raw === "all" ? "" : raw;
  }
  return DEFAULT_TIME;
}

function timePresetLabel(preset: TimePreset): string {
  if (preset === "24h") return "the last 24 hours";
  if (preset === "1h") return "the last hour";
  if (preset === "7d") return "the last 7 days";
  if (preset === "30d") return "the last 30 days";
  return "all time";
}

function PayloadPanel({
  tab,
  log,
  onCopied,
}: {
  tab: PayloadTab;
  log: IntegrationSyncLog;
  onCopied: () => void;
}) {
  const copyText = useMemo(() => {
    if (tab === "error") return log.error_message ?? "";
    const payload = tab === "request" ? log.request_payload : log.response_payload;
    if (payload == null) return "";
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }, [tab, log]);

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      onCopied();
    } catch {
      // ignore
    }
  };

  if (tab === "error") {
    if (!log.error_message) {
      return <p className="text-sm text-zinc-500 py-2">No error message.</p>;
    }
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50"
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
        <pre className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 max-h-[min(60vh,28rem)] overflow-auto whitespace-pre-wrap">
          {log.error_message}
        </pre>
      </div>
    );
  }

  const payload = tab === "request" ? log.request_payload : log.response_payload;
  if (payload == null || (typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 0)) {
    return <p className="text-sm text-zinc-500 py-2">No {tab} payload.</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 z-10"
      >
        <Copy className="w-3 h-3" /> Copy
      </button>
      <pre className="text-xs font-mono text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg p-3 max-h-[min(60vh,28rem)] overflow-auto">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

export function IntegrationLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const timePreset = parseTimeParam(searchParams.get("time"));
  const provider = searchParams.get("provider") ?? "";
  const statusRaw = searchParams.get("status") ?? "";
  const statusFilters = useMemo(
    () => (statusRaw ? statusRaw.split(",").map((s) => s.trim()).filter(Boolean) : []),
    [statusRaw]
  );
  const qApplied = searchParams.get("q") ?? "";
  const userFilter = searchParams.get("user") ?? "";
  const engagementFilter = searchParams.get("engagement") ?? "";
  const payloadApplied = searchParams.get("payload") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const selectedLogId = searchParams.get("log") ? Number(searchParams.get("log")) : null;

  const [endpointDraft, setEndpointDraft] = useState(qApplied);
  const [payloadDraft, setPayloadDraft] = useState(payloadApplied);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [userDraft, setUserDraft] = useState(userFilter);
  const [engagementDraft, setEngagementDraft] = useState(engagementFilter);

  const [logs, setLogs] = useState<IntegrationSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [payloadTab, setPayloadTab] = useState<PayloadTab>("request");
  const [copyToast, setCopyToast] = useState(false);
  const fetchSeqRef = useRef(0);

  const patchParams = useCallback(
    (patch: Record<string, string | null | undefined>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === "") next.delete(key);
            else next.set(key, value);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    setEndpointDraft(qApplied);
  }, [qApplied]);

  useEffect(() => {
    setPayloadDraft(payloadApplied);
  }, [payloadApplied]);

  useEffect(() => {
    setUserDraft(userFilter);
    setEngagementDraft(engagementFilter);
  }, [userFilter, engagementFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = endpointDraft.trim();
      if (next !== qApplied) patchParams({ q: next || null });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [endpointDraft, qApplied, patchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = payloadDraft.trim();
      if (next !== payloadApplied) patchParams({ payload: next || null });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [payloadDraft, payloadApplied, patchParams]);

  const listParams = useMemo(() => {
    const range = getTimeRange(timePreset);
    const userId = userFilter.trim() ? Number(userFilter) : undefined;
    const engagementId = engagementFilter.trim() ? Number(engagementFilter) : undefined;
    return {
      page,
      limit: LIMIT,
      provider: provider || undefined,
      status: statusFilters.length ? statusFilters.join(",") : undefined,
      user_id: Number.isFinite(userId) && userId! > 0 ? userId : undefined,
      engagement_id: Number.isFinite(engagementId) && engagementId! > 0 ? engagementId : undefined,
      search: qApplied || undefined,
      payload_search: payloadApplied || undefined,
      ...range,
    };
  }, [page, provider, statusFilters, userFilter, engagementFilter, qApplied, payloadApplied, timePreset]);

  const fetchLogs = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await integrationSyncLogsApi.list(listParams);
      if (seq !== fetchSeqRef.current) return;
      setLogs(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setError(getApiError(err));
      setLogs([]);
      setTotal(0);
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const selectedLog = useMemo(() => {
    if (!selectedLogId) return null;
    return logs.find((l) => l.sync_log_id === selectedLogId) ?? null;
  }, [logs, selectedLogId]);

  useEffect(() => {
    if (selectedLog) setPayloadTab(defaultPayloadTab(selectedLog));
  }, [selectedLog?.sync_log_id]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const hasExtraFilters = Boolean(userFilter || engagementFilter || payloadApplied);

  const clearExtraFilters = () => {
    setUserDraft("");
    setEngagementDraft("");
    setPayloadDraft("");
    patchParams({ user: null, engagement: null, payload: null });
  };

  const toggleStatus = (status: string) => {
    const next = statusFilters.includes(status)
      ? statusFilters.filter((s) => s !== status)
      : [...statusFilters, status];
    patchParams({ status: next.length ? next.join(",") : null });
  };

  const applyAdvancedFilters = () => {
    patchParams({
      user: userDraft.trim() || null,
      engagement: engagementDraft.trim() || null,
      payload: payloadDraft.trim() || null,
    });
    setFiltersOpen(false);
  };

  const openLog = (log: IntegrationSyncLog) => {
    patchParams({ log: String(log.sync_log_id) }, false);
    setPayloadTab(defaultPayloadTab(log));
  };

  const closePanel = () => {
    patchParams({ log: null }, false);
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyToast(true);
      window.setTimeout(() => setCopyToast(false), 2000);
    } catch {
      // ignore
    }
  };

  const showEmptyWiden =
    !loading &&
    logs.length === 0 &&
    !hasExtraFilters &&
    statusFilters.length === 0 &&
    !provider &&
    !qApplied &&
    timePreset === "24h";

  const showEmptyClearFilters =
    !loading && logs.length === 0 && (hasExtraFilters || statusFilters.length > 0 || provider || qApplied);

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <PageHeaderActions>
        <HeaderActionButton
          label="Refresh"
          icon={RefreshCw}
          variant="secondary"
          onClick={() => void fetchLogs()}
          disabled={loading}
        />
      </PageHeaderActions>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                placeholder="Search endpoint URL…"
                value={endpointDraft}
                onChange={(e) => setEndpointDraft(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <select
              value={provider}
              onChange={(e) => patchParams({ provider: e.target.value || null })}
              className="px-2.5 py-2 rounded-lg border border-zinc-300 text-sm bg-white min-w-[150px]"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              {TIME_PRESETS.map((preset) => {
                const active = timePreset === preset.key;
                return (
                  <button
                    key={preset.key || "all"}
                    type="button"
                    onClick={() => patchParams({ time: preset.key ? preset.key : "all" })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${
                hasExtraFilters ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white hover:bg-zinc-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilters.includes(status)
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {status}
              </button>
            ))}
            {statusFilters.length > 1 && (
              <button
                type="button"
                onClick={() => patchParams({ status: null })}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                Clear status
              </button>
            )}
          </div>

          {hasExtraFilters && (
            <div className="flex flex-wrap gap-2 items-center text-xs">
              {userFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 border border-zinc-200">
                  User {userFilter}
                  <button type="button" onClick={() => patchParams({ user: null })} aria-label="Remove user filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {engagementFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 border border-zinc-200">
                  Engagement {engagementFilter}
                  <button type="button" onClick={() => patchParams({ engagement: null })} aria-label="Remove engagement filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {payloadApplied && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 border border-zinc-200 font-mono max-w-xs truncate">
                  Payload: {payloadApplied}
                  <button type="button" onClick={() => patchParams({ payload: null })} aria-label="Remove payload filter">
                    <X className="w-3 h-3 shrink-0" />
                  </button>
                </span>
              )}
              <button type="button" onClick={clearExtraFilters} className="text-zinc-500 hover:text-zinc-800 underline">
                Clear extra filters
              </button>
            </div>
          )}

          {filtersOpen && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <input
                  type="number"
                  placeholder="User ID"
                  value={userDraft}
                  onChange={(e) => setUserDraft(e.target.value)}
                  className="w-32 px-2.5 py-2 rounded-lg border border-zinc-300 text-sm"
                />
                <input
                  type="number"
                  placeholder="Engagement ID"
                  value={engagementDraft}
                  onChange={(e) => setEngagementDraft(e.target.value)}
                  className="w-40 px-2.5 py-2 rounded-lg border border-zinc-300 text-sm"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder='Request field or JSON, e.g. albumin or {"albumin": 4.62}'
                  value={payloadDraft}
                  onChange={(e) => setPayloadDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm font-mono"
                />
                <p className="text-xs text-zinc-500 mt-1">Request body only.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyAdvancedFilters}
                  className="px-3 py-1.5 text-sm rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col min-h-[320px]">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading logs…
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
                {showEmptyWiden ? (
                  <>
                    <p className="text-sm text-zinc-600">Nothing in the last 24 hours.</p>
                    <button
                      type="button"
                      onClick={() => patchParams({ time: "7d" })}
                      className="text-sm font-medium text-zinc-900 underline hover:no-underline"
                    >
                      Widen to 7 days
                    </button>
                  </>
                ) : showEmptyClearFilters ? (
                  <>
                    <p className="text-sm text-zinc-600">No logs match your filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEndpointDraft("");
                        patchParams({
                          provider: null,
                          status: null,
                          q: null,
                          user: null,
                          engagement: null,
                          payload: null,
                        });
                      }}
                      className="text-sm font-medium text-zinc-900 underline hover:no-underline"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">No sync logs found for {timePresetLabel(timePreset)}.</p>
                )}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 sticky top-0 z-10 border-b border-zinc-200">
                    <tr className="text-left text-xs text-zinc-500">
                      <th className="px-4 py-2.5 font-medium">When</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Provider</th>
                      <th className="px-4 py-2.5 font-medium">Activity</th>
                      <th className="px-4 py-2.5 font-medium">Who</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {logs.map((log) => {
                      const who = formatWho(log);
                      const selected = selectedLogId === log.sync_log_id;
                      return (
                        <tr
                          key={log.sync_log_id}
                          className={`cursor-pointer hover:bg-zinc-50 ${selected ? "bg-zinc-100/80" : ""}`}
                          onClick={() => openLog(log)}
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs" title={formatDateTime(log.created_at)}>
                            {formatRelativeTime(log.created_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={log.status} />
                          </td>
                          <td className="px-4 py-2.5">
                            <ProviderBadge provider={log.provider} />
                          </td>
                          <td className="px-4 py-2.5 max-w-[280px]">
                            <div className="text-xs font-medium text-zinc-800">{summarizeEndpoint(log)}</div>
                            <div className="text-[11px] text-zinc-500 truncate font-mono" title={log.api_endpoint_url}>
                              {log.api_endpoint_url}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            <div className="text-zinc-800">{who.primary}</div>
                            {who.secondary && <div className="text-zinc-500">{who.secondary}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 bg-zinc-50/50">
              <span className="text-xs text-zinc-500">{total.toLocaleString()} log{total !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => patchParams({ page: String(page - 1) }, false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 text-xs disabled:opacity-50 hover:bg-white"
                >
                  Prev
                </button>
                <span className="text-xs text-zinc-600">Page {page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => patchParams({ page: String(page + 1) }, false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 text-xs disabled:opacity-50 hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectedLog && (
          <aside className="w-full lg:w-[min(420px,40vw)] shrink-0 border border-zinc-200 rounded-xl bg-white flex flex-col max-h-[calc(100vh-8rem)] lg:sticky lg:top-4">
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-zinc-200">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Log #{selectedLog.sync_log_id}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
                aria-label="Close detail"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-2 flex flex-wrap gap-2 items-center border-b border-zinc-100">
              <StatusBadge status={selectedLog.status} />
              <ProviderBadge provider={selectedLog.provider} />
            </div>
            {selectedLog.status === "failed" && selectedLog.error_message && (
              <div className="px-4 py-3 border-b border-zinc-100 bg-red-50/50">
                <p className="text-xs font-medium text-red-800 mb-1">Error</p>
                <p className="text-sm text-red-700 whitespace-pre-wrap">{selectedLog.error_message}</p>
              </div>
            )}
            <div className="px-4 py-2 border-b border-zinc-100">
              <div className="flex items-start gap-2">
                <p className="text-xs font-mono text-zinc-600 break-all flex-1">{selectedLog.api_endpoint_url}</p>
                <button
                  type="button"
                  onClick={() => void copyUrl(selectedLog.api_endpoint_url)}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 text-xs hover:bg-zinc-50"
                >
                  {copyToast ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copyToast ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="px-4 pt-2 flex gap-1">
              {(["request", "response", "error"] as PayloadTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPayloadTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                    payloadTab === tab
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-4 overflow-auto flex-1 min-h-0">
              <PayloadPanel
                tab={payloadTab}
                log={selectedLog}
                onCopied={() => {
                  setCopyToast(true);
                  window.setTimeout(() => setCopyToast(false), 2000);
                }}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
