import { Loader2 } from "lucide-react";
import type { CommandB2CUserRow } from "../../../lib/api";

export function B2CUserTable({
  rows,
  loading,
  error,
  emptyLabel,
  total,
  page,
  pages,
  onPrev,
  onNext,
  testId,
}: {
  rows: CommandB2CUserRow[];
  loading?: boolean;
  error?: string | null;
  emptyLabel: string;
  total?: number;
  page?: number;
  pages?: number;
  onPrev?: () => void;
  onNext?: () => void;
  testId?: string;
}) {
  const showPager = total != null && pages != null && pages > 1 && page != null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white" data-testid={testId}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="px-4 py-8 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-zinc-500">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">Package</th>
                <th className="px-3 py-2.5 font-medium">Collection</th>
                <th className="px-3 py-2.5 font-medium">Blood Collection</th>
                <th className="px-3 py-2.5 font-medium">Questionnaire</th>
                <th className="px-3 py-2.5 font-medium">Lab partner</th>
                <th className="px-3 py-2.5 font-medium">Lab report</th>
                <th className="px-3 py-2.5 font-medium">BIO-AI</th>
                <th className="px-3 py-2.5 font-medium">Consult</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-zinc-900">{row.person.name}</div>
                    <div className="text-xs text-zinc-500">{row.person.phone || "—"}</div>
                    {row.person.email ? (
                      <div className="text-xs text-zinc-500">{row.person.email}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.package || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.collection || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.blood_collection || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.questionnaire || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.lab_partner || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.lab_report || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.bio_ai || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{row.consult || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showPager ? (
        <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
          <span>
            Page {page} / {pages}
            {total != null ? ` · ${total}` : ""}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={onPrev}
              className="rounded-md px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= (pages ?? 1)}
              onClick={onNext}
              className="rounded-md px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
