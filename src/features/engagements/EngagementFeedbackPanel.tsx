import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  engagementsApi,
  getApiError,
  type EngagementFeedbackListItem,
  type EngagementFeedbackOverallRating,
} from "../../lib/api";

const OVERALL_LABELS: Record<EngagementFeedbackOverallRating, string> = {
  excellent: "Excellent",
  very_good: "Very Good",
  good: "Good",
  could_be_better: "Could Be Better",
  bad: "Bad",
};

const CATEGORY_LABELS: Record<string, string> = {
  blood_collection: "Blood Collection",
  bio_ai_reports: "Bio-AI Reports",
  consultations: "Consultations",
};

function participantName(row: EngagementFeedbackListItem): string {
  const parts = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return `User ${row.user_id}`;
}

function formatCategoryRatings(ratings: Record<string, number>): string {
  const entries = Object.entries(ratings ?? {});
  if (entries.length === 0) return "—";
  return entries
    .map(([key, value]) => `${CATEGORY_LABELS[key] ?? key}: ${value}/5`)
    .join(" · ");
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

type Props = {
  engagementId: number;
};

export function EngagementFeedbackPanel({ engagementId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EngagementFeedbackListItem[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await engagementsApi.listFeedback(engagementId, { page: 1, limit: 100 });
      setRows(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? res.data.data?.length ?? 0);
    } catch (err) {
      setError(getApiError(err));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Participant feedback</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{total} submission{total === 1 ? "" : "s"}</p>
        </div>
      </div>

      {error ? (
        <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      {rows.length === 0 && !error ? (
        <p className="px-4 py-10 text-sm text-zinc-500 text-center">No feedback submitted yet.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Participant</th>
                <th className="text-left font-medium px-4 py-2.5">Overall</th>
                <th className="text-left font-medium px-4 py-2.5">Categories</th>
                <th className="text-left font-medium px-4 py-2.5">Comment</th>
                <th className="text-left font-medium px-4 py-2.5">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => (
                <tr key={row.feedback_id} className="text-zinc-800">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-zinc-900">{participantName(row)}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{row.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    {OVERALL_LABELS[row.overall_rating] ?? row.overall_rating}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-600 max-w-xs">
                    {formatCategoryRatings(row.category_ratings)}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-600 max-w-md whitespace-pre-wrap">
                    {row.comment?.trim() ? row.comment : "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-500 whitespace-nowrap">
                    {formatDate(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
