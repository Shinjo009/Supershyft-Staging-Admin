import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, Minus } from "lucide-react";
import {
  engagementParticipantProgressApi,
  getApiError,
  type EngagementParticipantProgressResponse,
} from "../../lib/api";

function participantName(row: { first_name?: string | null; last_name?: string | null; user_id: number }) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return name || `User #${row.user_id}`;
}

export function EngagementProgressTab({ engagementId }: { engagementId: number }) {
  const [data, setData] = useState<EngagementParticipantProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void engagementParticipantProgressApi
      .get(engagementId)
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  const stageKeys = data?.stage_keys ?? [];
  const total = data?.summary.total_participants ?? 0;

  const funnelLine = useMemo(() => {
    if (!data || total === 0) return null;
    const counts = data.summary.stage_counts;
    const labels = data.stage_labels;
    return stageKeys
      .filter((key) => key !== "enrolled")
      .map((key) => `${labels[key] ?? key} ${counts[key] ?? 0}/${total}`)
      .join(" · ");
  }, [data, stageKeys, total]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-xl p-4">
        <div className="text-xs font-medium text-zinc-500 mb-2">Camp progress summary</div>
        {total === 0 ? (
          <p className="text-sm text-zinc-500">No participants enrolled yet.</p>
        ) : funnelLine ? (
          <p className="text-sm text-zinc-800 tabular-nums leading-relaxed">{funnelLine}</p>
        ) : null}
        {total > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {stageKeys.map((key) => {
              const count = data.summary.stage_counts[key] ?? 0;
              const label = data.stage_labels[key] ?? key;
              const complete = count >= total && total > 0;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium tabular-nums ${
                    complete ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {label}: {count}/{total}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 text-sm font-medium text-zinc-900">
            Per participant
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="text-left font-medium px-3 py-2 sticky left-0 bg-zinc-50 z-10 min-w-[140px]">
                    Participant
                  </th>
                  <th className="text-left font-medium px-3 py-2 min-w-[100px]">Stuck at</th>
                  {stageKeys.map((key) => (
                    <th key={key} className="text-center font-medium px-2 py-2 whitespace-nowrap">
                      {data.stage_labels[key] ?? key}
                    </th>
                  ))}
                  <th className="text-left font-medium px-3 py-2">Journey</th>
                </tr>
              </thead>
              <tbody>
                {data.participants.map((row) => (
                  <tr key={row.user_id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="font-medium text-zinc-900">{participantName(row)}</div>
                      <div className="text-zinc-500">{row.phone ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {row.bottleneck_label ? (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                          {row.bottleneck_label}
                        </span>
                      ) : (
                        <span className="text-emerald-700">Complete</span>
                      )}
                    </td>
                    {stageKeys.map((key) => {
                      const done = row.stages[key];
                      return (
                        <td key={key} className="px-2 py-2 text-center">
                          {done ? (
                            <Check className="w-4 h-4 text-emerald-600 inline" aria-label="Done" />
                          ) : (
                            <Minus className="w-4 h-4 text-zinc-300 inline" aria-label="Pending" />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      <Link
                        to={`/users/${row.user_id}/journey`}
                        className="text-zinc-700 underline hover:text-zinc-900"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
