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
import {
  COMMS_STEP_KEYS,
  MANAGER_MILESTONE_KEYS,
  commsBreakdownByStep,
  countParticipantsNeedingComms,
  managerLabelForStep,
  managerNextStepLabel,
  topParticipantBottleneck,
} from "./progressManagerLabels";

const GRID_EXCLUDE_KEYS = new Set(["engagement_setup", "booking_guide_phlebo", "enrolled"]);

const CAMP_SETUP_CHECKLIST = [
  "Packages assigned (assessment or diagnostics)",
  "Schedule and on-site slots configured",
  "Onboarding assistant assigned",
  "Onboarding notifications configured",
];

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

function ProgressGridView({
  data,
  stageKeys,
  stageMeta,
  total,
}: {
  data: EngagementParticipantProgressResponse;
  stageKeys: string[];
  stageMeta: Record<string, { source?: string; type?: string }>;
  total: number;
}) {
  const [commsOnly, setCommsOnly] = useState(false);

  const gridStageKeys = useMemo(
    () => stageKeys.filter((k) => !GRID_EXCLUDE_KEYS.has(k)),
    [stageKeys],
  );

  const visibleGroups = useMemo(() => {
    const filterSteps = (steps: string[]) => steps.filter((k) => !GRID_EXCLUDE_KEYS.has(k));
    if (!data.stage_groups) {
      return [{ key: "all", label: "", steps: gridStageKeys }];
    }
    const groups = data.stage_groups
      .map((g) => ({ ...g, steps: filterSteps(g.steps) }))
      .filter((g) => g.steps.length > 0);
    if (!commsOnly) return groups;
    return groups.filter((g) => g.key === "comms");
  }, [data, commsOnly, gridStageKeys]);

  const columnKeys = useMemo(() => {
    if (!commsOnly) return gridStageKeys;
    return visibleGroups.flatMap((g) => g.steps);
  }, [commsOnly, gridStageKeys, visibleGroups]);

  const setup = data.engagement_setup;

  return (
    <div className="space-y-4">
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm space-y-2">
        <p className="font-medium text-zinc-800">Camp-level status (not per person)</p>
        <div className="flex flex-wrap gap-2">
          {setup?.engagement_setup ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-zinc-200">
              <StageIcon status={setup.engagement_setup.status} />
              Camp configuration
            </span>
          ) : null}
          {setup?.booking_guide_phlebo ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-zinc-200">
              <StageIcon status={setup.booking_guide_phlebo.status} />
              Phlebo booking guide
            </span>
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-zinc-500">Step completion (camp-wide)</div>
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
        {total === 0 ? (
          <p className="text-sm text-zinc-500">No participants enrolled yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {gridStageKeys
              .filter((key) => !COMMS_STEP_KEYS.includes(key))
              .map((key) => {
                const agg = data.summary.by_stage[key];
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
                    {managerLabelForStep(key)}: {complete}/{denom || "—"}
                  </span>
                );
              })}
          </div>
        )}
      </div>

      {total > 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 text-sm font-medium text-zinc-900">
            Per participant (all steps)
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="text-left font-medium px-3 py-2 sticky left-0 bg-zinc-50 z-10 min-w-[140px]">
                    Participant
                  </th>
                  <th className="text-left font-medium px-3 py-2 min-w-[140px]">Next step</th>
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
                      title={stageMeta[key]?.source ?? data.stage_labels[key]}
                      className="text-center font-medium px-2 py-1 whitespace-nowrap min-w-[5.5rem]"
                    >
                      {managerLabelForStep(key)}
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
                      {row.bottleneck ? (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                          {managerNextStepLabel(row.bottleneck)}
                        </span>
                      ) : (
                        <span className="text-emerald-700">All done</span>
                      )}
                    </td>
                    {columnKeys.map((key) => {
                      const cell = row.stages[key];
                      const status = cellStatus(cell);
                      return (
                        <td
                          key={key}
                          className="px-1 py-2 text-center"
                          title={cellTooltip(key, cell, stageMeta[key])}
                        >
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

export function EngagementProgressTab({
  engagementId,
  engagementCode,
}: {
  engagementId: number;
  engagementCode?: string | null;
}) {
  const [data, setData] = useState<EngagementParticipantProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const setup = data?.engagement_setup;

  const editHref = engagementCode
    ? `/engagements/${encodeURIComponent(engagementCode)}/edit`
    : null;

  const sortedParticipants = useMemo(() => {
    if (!data) return [];
    return [...data.participants].sort((a, b) => {
      const aStuck = a.bottleneck ? 0 : 1;
      const bStuck = b.bottleneck ? 0 : 1;
      if (aStuck !== bStuck) return aStuck - bStuck;
      return participantName(a).localeCompare(participantName(b));
    });
  }, [data]);

  const journeyCompleteCount = useMemo(() => {
    if (!data) return 0;
    return data.participants.filter((p) => !p.bottleneck).length;
  }, [data]);

  const needAttentionCount = total - journeyCompleteCount;
  const topPeopleBottleneck = topParticipantBottleneck(data?.summary.bottlenecks);
  const commsNeedCount = data ? countParticipantsNeedingComms(data.participants) : 0;
  const commsBreakdown = data ? commsBreakdownByStep(data) : [];

  const campSetupPending =
    setup?.engagement_setup?.status === "pending" || setup?.engagement_setup?.status === "failed";
  const phleboPending =
    setup?.booking_guide_phlebo?.status === "pending" ||
    setup?.booking_guide_phlebo?.status === "failed";

  const milestoneRows = useMemo(() => {
    if (!data) return [];
    const rows: { key: string; label: string; pending: number }[] = [];
    for (const key of MANAGER_MILESTONE_KEYS) {
      if (!data.stage_keys.includes(key)) continue;
      const agg = data.summary.by_stage[key];
      if (!agg) continue;
      const pending = agg.pending + agg.failed;
      if (pending > 0 && agg.applicable > 0) {
        rows.push({ key, label: managerLabelForStep(key), pending });
      }
    }
    return rows;
  }, [data]);

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Camp health and what each person still needs to do — in plain language.
      </p>

      {campSetupPending ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-amber-950">
            Finish camp setup before chasing participants
          </h3>
          <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
            {CAMP_SETUP_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {editHref ? (
            <Link
              to={editHref}
              className="inline-flex text-sm font-medium text-amber-950 underline hover:text-amber-900"
            >
              Edit engagement
            </Link>
          ) : null}
        </div>
      ) : null}

      {phleboPending ? (
        <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-700 flex flex-wrap items-center justify-between gap-2">
          <span>
            <span className="font-medium">Phlebo booking guide</span> — not sent or not configured for
            this camp.
          </span>
          {editHref ? (
            <Link to={`${editHref}?step=notifications`} className="text-sm font-medium underline">
              Configure notifications
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-500">Enrolled</p>
          <p className="text-2xl font-semibold text-zinc-900 tabular-nums mt-1">{total}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-500">Journey complete</p>
          <p className="text-2xl font-semibold text-emerald-800 tabular-nums mt-1">
            {journeyCompleteCount}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-xs font-medium text-zinc-500">Need attention</p>
          <p className="text-2xl font-semibold text-amber-800 tabular-nums mt-1">{needAttentionCount}</p>
          {topPeopleBottleneck && needAttentionCount > 0 ? (
            <p className="text-xs text-zinc-500 mt-1">
              Most waiting on:{" "}
              <span className="font-medium text-zinc-700">
                {topPeopleBottleneck.label} ({topPeopleBottleneck.pending})
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-900">What needs attention</h3>
        <ul className="space-y-2 text-sm">
          {campSetupPending ? (
            <li className="flex flex-wrap items-baseline justify-between gap-2 py-2 border-b border-zinc-100">
              <span className="font-medium text-zinc-800">Camp configuration</span>
              <span className="text-zinc-600 tabular-nums">Fix in Edit engagement</span>
            </li>
          ) : null}
          {commsNeedCount > 0 ? (
            <li className="py-2 border-b border-zinc-100 space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-800">Notifications</span>
                <span className="text-zinc-600 tabular-nums">
                  {commsNeedCount} participant{commsNeedCount === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Welcome, reminders, report alerts, and other messages.
              </p>
              {commsBreakdown.length > 0 ? (
                <p className="text-xs text-zinc-600">
                  Top gaps:{" "}
                  {commsBreakdown
                    .slice(0, 2)
                    .map((c) => `${c.label} (${c.pending})`)
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          ) : null}
          {milestoneRows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-baseline justify-between gap-2 py-2 border-b border-zinc-100 last:border-0"
            >
              <span className="text-zinc-800">{row.label}</span>
              <span className="font-medium text-zinc-900 tabular-nums">{row.pending} pending</span>
            </li>
          ))}
          {!campSetupPending && commsNeedCount === 0 && milestoneRows.length === 0 ? (
            <li className="text-zinc-500 py-2">Nothing blocking right now — great job.</li>
          ) : null}
        </ul>
      </div>

      {total > 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 text-sm font-medium text-zinc-900">
            Participants
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-left">
                  <th className="font-medium px-4 py-2">Name</th>
                  <th className="font-medium px-4 py-2">Next step</th>
                  <th className="font-medium px-4 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {sortedParticipants.map((row) => (
                  <tr key={row.user_id} className="border-t border-zinc-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{participantName(row)}</div>
                      <div className="text-xs text-zinc-500">{row.phone ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.bottleneck ? (
                        <span className="text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md text-sm">
                          {managerNextStepLabel(row.bottleneck)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">All done</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${row.user_id}/journey`}
                        className="text-zinc-700 underline hover:text-zinc-900 whitespace-nowrap"
                      >
                        Open journey
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 text-sm text-zinc-500">
          No participants enrolled yet.
        </div>
      )}

      <details className="bg-white border border-zinc-200 rounded-xl group">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-800 list-none flex items-center justify-between">
          Technical details (ops)
          <span className="text-xs text-zinc-500 font-normal group-open:hidden">Show full step grid</span>
        </summary>
        <div className="px-4 pb-4 pt-1 border-t border-zinc-100">
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mb-4">
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Complete
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending
            </span>
            <span className="inline-flex items-center gap-1">
              <Minus className="w-3.5 h-3.5 text-zinc-300" /> N/A
            </span>
            <span className="inline-flex items-center gap-1">
              <X className="w-3.5 h-3.5 text-red-600" /> Failed notify
            </span>
          </div>
          <ProgressGridView data={data} stageKeys={stageKeys} stageMeta={stageMeta} total={total} />
        </div>
      </details>
    </div>
  );
}
