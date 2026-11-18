import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { DataTable, type Column } from "../../shared/ui/DataTable";
import type { ApiTrafficEndpointStat, ApiTrafficSummary } from "../../lib/api";

function formatSeconds(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value < 1) return `${Math.round(value * 1000)}ms`;
  return `${value.toFixed(3)}s`;
}

function formatPercent(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(2)}%`;
}

function formatGeneratedAt(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function windowLabel(seconds: number | undefined): string {
  if (seconds == null || seconds < 1) return "—";
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function EndpointCell({ row }: { row: ApiTrafficEndpointStat }) {
  return (
    <span className="font-mono text-xs text-zinc-800">
      <span className="text-zinc-500">{row.method}</span> {row.path}
    </span>
  );
}

export function ApiTrafficPanel({
  data,
  loading,
  error,
}: {
  data: ApiTrafficSummary | null;
  loading: boolean;
  error: string | null;
}) {
  const endpointColumns = useMemo<Column<ApiTrafficEndpointStat>[]>(
    () => [
      {
        key: "path",
        label: "Endpoint",
        sortable: false,
        render: (row) => <EndpointCell row={row} />,
      },
      {
        key: "count",
        label: "Requests",
        sortable: true,
        className: "tabular-nums",
      },
      {
        key: "error_4xx",
        label: "4xx",
        sortable: true,
        className: "tabular-nums text-amber-700",
      },
      {
        key: "error_5xx",
        label: "5xx",
        sortable: true,
        className: "tabular-nums text-red-700",
      },
      {
        key: "p95_s",
        label: "p95",
        sortable: true,
        hideOnMobile: true,
        render: (row) => <span className="tabular-nums">{formatSeconds(row.p95_s)}</span>,
      },
    ],
    []
  );

  const totals = data?.totals;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">API traffic</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nginx rollup (window {windowLabel(data?.window_seconds)}). Updated{" "}
            {formatGeneratedAt(data?.generated_at)}.
          </p>
        </div>
      </div>

      {error && !data ? (
        <div className="px-4 py-6 text-sm text-amber-800 bg-amber-50 border-t border-amber-100">
          {error}
        </div>
      ) : loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : !data ? (
        <div className="px-4 py-8 text-center text-sm text-zinc-500">No API traffic data yet.</div>
      ) : (
        <div className="space-y-0 divide-y divide-zinc-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-px bg-zinc-100 border-b border-zinc-100">
            {[
              { label: "Requests", value: totals?.requests?.toLocaleString() ?? "—" },
              { label: "Error rate", value: formatPercent(totals?.error_rate) },
              { label: "4xx", value: totals?.error_4xx?.toLocaleString() ?? "—" },
              { label: "5xx", value: totals?.error_5xx?.toLocaleString() ?? "—" },
              { label: "p50", value: formatSeconds(totals?.p50_s) },
              { label: "p95", value: formatSeconds(totals?.p95_s) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{kpi.label}</p>
                <p className="text-lg font-semibold text-zinc-900 tabular-nums mt-0.5">{kpi.value}</p>
              </div>
            ))}
          </div>

          {totals?.lines_missing_rt != null && totals.lines_missing_rt > 0 ? (
            <div className="px-4 py-2 text-xs text-zinc-500 bg-zinc-50">
              {totals.lines_missing_rt.toLocaleString()} requests in window lack timing (logged before{" "}
              <span className="font-mono">rt=</span> was enabled); latency stats use timed lines only.
            </div>
          ) : null}

          <SectionTable
            title="Top endpoints"
            subtitle="By request count"
            columns={endpointColumns}
            rows={data.top_endpoints ?? []}
          />
          <SectionTable
            title="Live errors"
            subtitle="Endpoints with 4xx/5xx"
            columns={endpointColumns}
            rows={data.error_endpoints ?? []}
            emptyMessage="No errors in this window."
          />
          <SectionTable
            title="Slowest endpoints"
            subtitle="By p95 latency"
            columns={endpointColumns}
            rows={data.slowest_endpoints ?? []}
            emptyMessage="No latency data in this window."
          />
        </div>
      )}
    </div>
  );
}

function SectionTable({
  title,
  subtitle,
  columns,
  rows,
  emptyMessage = "No data.",
}: {
  title: string;
  subtitle: string;
  columns: Column<ApiTrafficEndpointStat>[];
  rows: ApiTrafficEndpointStat[];
  emptyMessage?: string;
}) {
  return (
    <div>
      <div className="px-4 sm:px-5 py-3 border-b border-zinc-50">
        <h3 className="text-xs font-semibold text-zinc-800">{title}</h3>
        <p className="text-[11px] text-zinc-500">{subtitle}</p>
      </div>
      {!rows.length ? (
        <div className="px-4 py-6 text-sm text-zinc-500 text-center">{emptyMessage}</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(row) => `${row.method}:${row.path}`}
          firstColumnClickableView={false}
        />
      )}
    </div>
  );
}