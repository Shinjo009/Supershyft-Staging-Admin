import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  commandDashboardApi,
  getApiError,
  type CommandOpenEngagementRow,
  type CommandPeriodParams,
} from "../../../lib/api";

function formatDuration(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  if (start && end) return `${start} → ${end}`;
  return start || end || "—";
}

export function OpenEngagementDetail({
  periodParams,
  onBack,
}: {
  periodParams: CommandPeriodParams;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CommandOpenEngagementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commandDashboardApi
      .openEngagements({ ...periodParams, page, limit, include_rows: true })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.data ?? []);
        setTotal(res.data.meta?.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err));
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodParams.period, periodParams.from, periodParams.to, page]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3" data-testid="detail-open_engagement">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>
        <h2 className="text-lg font-semibold text-zinc-900">Open engagement</h2>
        <span className="text-sm text-zinc-500">({total})</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No open engagements in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5 font-medium">Engagement name</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">City</th>
                  <th className="px-3 py-2.5 font-medium">Package</th>
                  <th className="px-3 py-2.5 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.engagement_id}
                    className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                    data-testid={`open-engagement-row-${row.engagement_code}`}
                    onClick={() => {
                      if (row.engagement_code) {
                        navigate(`/engagements/${row.engagement_code}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (row.engagement_code) {
                          navigate(`/engagements/${row.engagement_code}`);
                        }
                      }
                    }}
                    tabIndex={0}
                    role="link"
                  >
                    <td className="px-3 py-2.5 font-medium text-zinc-900">
                      {row.engagement_name || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700">{row.type || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-700">{row.city || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-700">{row.package || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-700">
                      {formatDuration(row.start_date, row.end_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > limit ? (
          <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            <span>
              Page {page} / {pages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
