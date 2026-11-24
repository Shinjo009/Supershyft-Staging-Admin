import { ClipboardList, Droplets, FileText, Sparkles, Stethoscope, Users } from "lucide-react";
import type { EngagementProgressReport } from "../../lib/api";

const CARD =
  "rounded-xl border border-zinc-200 bg-white px-3 py-3 flex flex-col gap-1.5 min-h-[6.5rem]";

type ProgressMetric = {
  key: keyof EngagementProgressReport;
  label: string;
  icon: typeof Users;
  iconWrap: string;
  bar: string;
  /** When true, show only the count (no /total, no pending footer). */
  countOnly?: boolean;
};

const METRICS: ProgressMetric[] = [
  {
    key: "total_registered",
    label: "Total registered",
    icon: Users,
    iconWrap: "bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
    countOnly: true,
  },
  {
    key: "blood_collected",
    label: "Blood collected",
    icon: Droplets,
    iconWrap: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  },
  {
    key: "questionnaire_filled",
    label: "Questionnaire filled",
    icon: ClipboardList,
    iconWrap: "bg-zinc-100 text-zinc-700",
    bar: "bg-zinc-700",
  },
  {
    key: "blood_report_sent",
    label: "Blood report sent",
    icon: FileText,
    iconWrap: "bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  {
    key: "bio_ai_report_sent",
    label: "Bio-AI report sent",
    icon: Sparkles,
    iconWrap: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  {
    key: "consultation_done",
    label: "Consultation done",
    icon: Stethoscope,
    iconWrap: "bg-blue-50 text-blue-700",
    bar: "bg-blue-600",
  },
];

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function MetricSkeleton() {
  return (
    <div className={CARD}>
      <div className="h-3.5 w-24 bg-zinc-100 rounded animate-pulse" />
      <div className="h-7 w-16 bg-zinc-100 rounded animate-pulse" />
      <div className="h-1.5 w-full bg-zinc-100 rounded animate-pulse" />
      <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
    </div>
  );
}

export function CampProgressReport({
  report,
  loading,
  error,
}: {
  report: EngagementProgressReport | null;
  loading: boolean;
  error: string | null;
}) {
  const total = report?.total_registered ?? 0;

  return (
    <section
      data-testid="camp-progress-report"
      className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 h-full"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Camp progress report</h2>
      {error ? (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200">{error}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {METRICS.map((metric) => {
            const Icon = metric.icon;
            if (loading || !report) {
              return <MetricSkeleton key={metric.key} />;
            }
            const done = report[metric.key] ?? 0;
            const percent = metric.countOnly
              ? total > 0
                ? 100
                : 0
              : pct(done, total);
            const pending = Math.max(0, total - done);
            return (
              <article
                key={metric.key}
                data-testid={`camp-progress-${metric.key}`}
                className={CARD}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full ${metric.iconWrap}`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-xs leading-tight text-zinc-500">{metric.label}</span>
                </div>
                <div className="text-xl font-semibold tabular-nums text-zinc-900 leading-none">
                  {metric.countOnly ? (
                    done
                  ) : (
                    <>
                      {done}
                      <span className="text-xs font-normal text-zinc-500"> / {total}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 h-1.5 w-full rounded bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${metric.bar}`}
                    style={{ width: `${percent}%` }}
                    data-testid={`camp-progress-bar-${metric.key}`}
                  />
                </div>
                {!metric.countOnly ? (
                  <div className="text-[11px] text-zinc-500">
                    {percent}% · {pending} pending
                  </div>
                ) : (
                  <div className="text-[11px] text-transparent select-none" aria-hidden>
                    —
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
