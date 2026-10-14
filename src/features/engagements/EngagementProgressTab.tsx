import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Minus, X } from "lucide-react";
import {
  engagementParticipantProgressApi,
  formatParticipantProgressError,
  type EngagementParticipantProgressResponse,
  type ParticipantProgressStageCell,
  type ParticipantProgressStageStatus,
} from "../../lib/api";

function participantName(row: { first_name?: string | null; last_name?: string | null; user_id: number }) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return name || `User #${row.user_id}`;
}

function StageIcon({ status }: { status: ParticipantProgressStageStatus }) {
  if (status === "complete") {
    return <Check className="w-4 h-4 text-emerald-600 inline" aria-label="Complete" />;
  }
  if (status === "not_applicable") {
    return <Minus className="w-4 h-4 text-zinc-300 inline" aria-label="N/A" />;
  }
  if (status === "failed") {
    return <X className="w-4 h-4 text-red-600 inline" aria-label="Failed" />;
  }
  return <Clock className="w-4 h-4 text-amber-500 inline" aria-label="Pending" />;
}

function cellStatus(cell: ParticipantProgressStageCell | boolean | undefined): ParticipantProgressStageStatus {
  if (cell == null) return "pending";
  if (typeof cell === "boolean") return cell ? "complete" : "pending";
  return cell.status;
}

function cellTooltip(
  key: string,
  cell: ParticipantProgressStageCell | boolean | undefined,
  meta?: { source?: string },
): string {
  const source =
    (typeof cell === "object" && cell?.source) || meta?.source || key.replace(/_/g, " ");
  const status = cellStatus(cell);
  return `${source} — ${status}`;
}

export function EngagementProgressTab({ engagementId }: { engagementId: number }) {
  const [data, setData] = useState<EngagementParticipantProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commsOnly, setCommsOnly] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

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
        if (!cancelled) setError(formatParticipantProgressError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [engagementId, reloadToken]);

  const stageKeys = data?.stage_keys ?? [];
  const total = data?.summary.total_participants ?? 0;
  const stageMeta = data?.stage_meta ?? {};

  const visibleGroups = useMemo(() => {
    if (!data?.stage_groups) return [{ key: "all", label: "", steps: stageKeys }];
    if (!commsOnly) return data.stage_groups;
    return data.stage_groups.filter((g) => g.key === "comms");
  }, [data, commsOnly, stageKeys]);

  const columnKeys = useMemo(() => {
    if (!commsOnly) return stageKeys;
    return visibleGroups.flatMap((g) => g.steps);
  }, [commsOnly, stageKeys, visibleGroups]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm space-y-3">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => setReloadToken((t) => t + 1)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const setup = data.engagement_setup;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-zinc-500">Engagement setup (steps 1 & 8)</div>
          <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={commsOnly}
              onChange={(e) => setCommsOnly(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show comms columns only
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {setup?.engagement_setup ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 border border-zinc-200">
              <StageIcon status={setup.engagement_setup.status} />
              <span>Setup verified</span>
            </span>
          ) : null}
          {setup?.booking_guide_phlebo ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 border border-zinc-200">
              <StageIcon status={setup.booking_guide_phlebo.status} />
              <span>Phlebo booking guide</span>
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-600" /> Complete</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> Pending</span>
          <span className="inline-flex items-center gap-1"><Minus className="w-3.5 h-3.5 text-zinc-300" /> N/A</span>
          <span className="inline-flex items-center gap-1"><X className="w-3.5 h-3.5 text-red-600" /> Failed notify</span>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4">
        <div className="text-xs font-medium text-zinc-500 mb-2">Camp progress summary</div>
        {total === 0 ? (
          <p className="text-sm text-zinc-500">No participants enrolled yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stageKeys
              .filter((key) => key !== "enrolled" && key !== "engagement_setup" && key !== "booking_guide_phlebo")
              .map((key) => {
                const agg = data.summary.by_stage[key];
                const label = data.stage_labels[key] ?? key;
                if (!agg) return null;
                const denom = agg.applicable || 0;
                const complete = agg.complete;
                const done = denom > 0 && complete >= denom;
                return (
                  <span
                    key={key}
                    title={stageMeta[key]?.source}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium tabular-nums ${
                      done ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {label}: {complete}/{denom || "—"}
                    {agg.not_applicable > 0 ? ` (+${agg.not_applicable} N/A)` : ""}
                  </span>
                );
              })}
          </div>
        )}
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
                  {visibleGroups.map((group) =>
                    group.steps.length === 0 ? null : (
                      <th
                        key={group.key}
                        colSpan={group.steps.length}
                        className="text-center font-semibold px-2 py-2 border-l border-zinc-200 text-zinc-700 whitespace-nowrap"
                      >
                        {group.label}
                      </th>
                    ),
                  )}
                  <th className="text-left font-medium px-3 py-2 border-l border-zinc-200">Journey</th>
                </tr>
                <tr className="bg-zinc-50/80 text-zinc-500 border-t border-zinc-100">
                  <th className="sticky left-0 bg-zinc-50 z-10" colSpan={2} />
                  {columnKeys.map((key) => (
                    <th
                      key={key}
                      title={stageMeta[key]?.source}
                      className="text-center font-medium px-1 py-1 whitespace-nowrap max-w-[4.5rem] truncate"
                    >
                      {data.stage_labels[key] ?? key}
                    </th>
                  ))}
                  <th />
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
                    {columnKeys.map((key) => {
                      const cell = row.stages[key];
                      const status = cellStatus(cell);
                      return (
                        <td key={key} className="px-1 py-2 text-center" title={cellTooltip(key, cell, stageMeta[key])}>
                          <StageIcon status={status} />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 border-l border-zinc-100">
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
