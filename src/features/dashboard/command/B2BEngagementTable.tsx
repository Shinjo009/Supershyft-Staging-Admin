import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  commandDashboardApi,
  getApiError,
  type CommandB2BBucket,
  type CommandB2BEngagementRow,
  type CommandPeriodParams,
} from "../../../lib/api";

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${start} – ${end}`;
  return start || end || "—";
}

function statusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "running") return "Ongoing";
  if (s === "scheduled") return "Upcoming";
  if (s === "completed") return "Completed";
  return status || "—";
}

export function B2BEngagementTable({
  bucket,
  periodParams,
}: {
  bucket: CommandB2BBucket;
  periodParams: CommandPeriodParams;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CommandB2BEngagementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [bucket, periodParams.period, periodParams.from, periodParams.to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commandDashboardApi
      .b2bEngagements({ ...periodParams, bucket, page, limit })
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
  }, [bucket, periodParams.period, periodParams.from, periodParams.to, page]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const title =
    bucket === "ongoing" ? "Ongoing" : bucket === "upcoming" ? "Upcoming" : "Completed";

  return (
    <div className="space-y-3" data-testid="b2b-engagement-table">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <span className="text-sm text-zinc-500">({total})</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No engagements in this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5 font-medium">Camp Name &amp; Location</th>
                  <th className="px-3 py-2.5 font-medium">Dates</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">People</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.engagement_id}
                    role="link"
                    tabIndex={0}
                    data-testid={`b2b-row-${row.engagement_code}`}
                    onClick={() => navigate(`/engagements/${row.engagement_code}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/engagements/${row.engagement_code}`);
                      }
                    }}
                    className="cursor-pointer border-b border-zinc-100 last:border-0 transition hover:bg-zinc-50/80"
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-zinc-900">
                        {row.engagement_name || "—"}
                      </div>
                      <div className="text-xs text-zinc-500">{row.city || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700">
                      {formatDateRange(row.start_date, row.end_date)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700">{statusLabel(row.status)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-zinc-900">
                      {row.participant_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > limit ? (
        <div className="flex items-center justify-end gap-2 text-sm text-zinc-600">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
