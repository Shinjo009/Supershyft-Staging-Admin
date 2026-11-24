import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  commandDashboardApi,
  getApiError,
  type CommandPeriodParams,
  type CommandTicketRow,
} from "../../../lib/api";
import { DetailPageHeader, useDebouncedDetailSearch } from "./DetailPageHeader";

function formatRaisedAt(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

/** Map support_tickets.status → Open | Solved for the detail table. */
function formatTicketStatus(status: string | null | undefined) {
  const key = String(status || "")
    .trim()
    .toLowerCase();
  if (key === "open") return "Open";
  if (key === "closed" || key === "resolved") return "Solved";
  return status?.trim() || "—";
}

export function TicketsDetail({
  periodParams,
  onBack,
}: {
  periodParams: CommandPeriodParams;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<CommandTicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedDetailSearch(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [periodParams.period, periodParams.from, periodParams.to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commandDashboardApi
      .tickets({
        ...periodParams,
        page,
        limit,
        include_rows: true,
        search: debouncedSearch || undefined,
      })
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
  }, [periodParams.period, periodParams.from, periodParams.to, page, debouncedSearch]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3" data-testid="detail-tickets">
      <DetailPageHeader
        title="Tickets"
        total={total}
        onBack={onBack}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No tickets in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5 font-medium">Ticket ID</th>
                  <th className="px-3 py-2.5 font-medium">Raised by</th>
                  <th className="px-3 py-2.5 font-medium">Contact</th>
                  <th className="px-3 py-2.5 font-medium">Query</th>
                  <th className="px-3 py-2.5 font-medium">Raised at</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.ticket_id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-3 py-2.5 font-medium tabular-nums text-zinc-900">
                      {row.ticket_id}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-zinc-900">{row.raised_by.name}</div>
                      <div className="text-xs text-zinc-500">{row.raised_by.phone || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700">{row.contact || "—"}</td>
                    <td className="max-w-[28rem] px-3 py-2.5 text-zinc-700">
                      <span className="line-clamp-3">{row.query || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-700">{formatRaisedAt(row.raised_at)}</td>
                    <td className="px-3 py-2.5 text-zinc-700">{formatTicketStatus(row.status)}</td>
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
