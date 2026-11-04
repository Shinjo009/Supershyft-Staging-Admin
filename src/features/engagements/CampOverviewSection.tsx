import {
  AlertTriangle,
  ClipboardList,
  Copy,
  Droplets,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  engagementCampOverviewApi,
  getApiError,
  type Engagement,
  type EngagementCampOverview,
} from "../../lib/api";
import { PermissionGate } from "../../contexts/PermissionContext";
import { consoleUrlForEngagement } from "./consoleUrlActions";
import { formatEngagementStatusLabel } from "./engagementViewShared";

function pct(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
      <div
        className="h-full rounded-full bg-zinc-800"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

const DAY_METRICS = [
  { id: "registered" as const, label: "Participants registered", icon: Users },
  { id: "collected" as const, label: "Samples collected", icon: Droplets },
  { id: "questionnaire" as const, label: "Questionnaire completed", icon: ClipboardList },
  { id: "report" as const, label: "Reports delivered", icon: FileText },
  { id: "consultation" as const, label: "Consultations completed", icon: Stethoscope },
  { id: "recollect" as const, label: "Failed collections / recollections", icon: AlertTriangle },
];

export function CampOverviewSection({
  engagement,
}: {
  engagement: Pick<
    Engagement,
    "engagement_id" | "engagement_code" | "camp_no" | "status" | "organization_id"
  >;
}) {
  const engagementId = engagement.engagement_id;
  const [data, setData] = useState<EngagementCampOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void engagementCampOverviewApi
      .get(engagementId)
      .then((res) => {
        if (!cancelled) {
          setData(res.data.data);
          const first = res.data.data.days[0]?.date ?? null;
          setDayKey(first);
        }
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

  const selectedDay = useMemo(
    () => data?.days.find((d) => d.date === dayKey) ?? data?.days[0] ?? null,
    [data, dayKey],
  );

  const consoleUrl = consoleUrlForEngagement(engagementId);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading camp overview…
      </div>
    );
  }
  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!data) return null;

  const p = data.progress;
  const registered = p.registered || 1;
  const progressCards = [
    { label: "Total registered", done: p.registered, icon: Users, tint: "bg-sky-50 text-sky-700" },
    { label: "Blood collected", done: p.collected, icon: Droplets, tint: "bg-emerald-50 text-emerald-700" },
    {
      label: "Questionnaire filled",
      done: p.questionnaire_done,
      icon: ClipboardList,
      tint: "bg-violet-50 text-violet-700",
    },
    { label: "Blood report sent", done: p.blood_report, icon: FileText, tint: "bg-amber-50 text-amber-700" },
    { label: "Bio-AI report sent", done: p.bio_ai, icon: Sparkles, tint: "bg-orange-50 text-orange-700" },
    {
      label: "Consultation done",
      done: p.consultations_done,
      icon: Stethoscope,
      tint: "bg-blue-50 text-blue-700",
    },
  ];

  const attention = [
    {
      label: "Blood collection pending",
      value: data.needs_attention.collection_pending,
      icon: Droplets,
      tint: "border-red-200 bg-red-50",
    },
    {
      label: "Incomplete questionnaires",
      value: data.needs_attention.questionnaire_pending,
      icon: ClipboardList,
      tint: "border-sky-200 bg-sky-50",
    },
    {
      label: "Delayed reports",
      value: data.needs_attention.reports_pending,
      icon: FileText,
      tint: "border-zinc-200 bg-zinc-50",
    },
    {
      label: "Consultations pending",
      value: data.needs_attention.consultations_pending,
      icon: Stethoscope,
      tint: "border-amber-200 bg-amber-50",
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(consoleUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const statusLabel =
    (engagement.status ?? "").toLowerCase() === "running"
      ? "Running"
      : formatEngagementStatusLabel(engagement.status);

  return (
    <div className="space-y-4">
      {/* Row 1: Camp progress (2/3) + Day-wise summary (1/3) */}
      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white lg:col-span-2">
          <header className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-3">
            <Gauge className="h-3.5 w-3.5 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">Camp progress report</h3>
          </header>
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
            {progressCards.map((row) => {
              const percent = pct(row.done, registered);
              const pending = Math.max(0, p.registered - row.done);
              return (
                <div key={row.label} className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${row.tint}`}
                    >
                      <row.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs leading-tight text-zinc-500">{row.label}</span>
                  </div>
                  <div className="text-xl font-semibold tabular-nums leading-none text-zinc-900">
                    {row.done}
                    <span className="text-xs font-normal text-zinc-500"> / {p.registered}</span>
                  </div>
                  <ProgressBar value={percent} />
                  <div className="mt-1.5 text-[11px] text-zinc-500">
                    {percent}% · {pending} pending
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-zinc-200 bg-white">
          <header className="flex flex-nowrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <h3 className="truncate text-sm font-semibold text-zinc-900">Day-wise summary</h3>
            </div>
            <div className="flex shrink-0 flex-nowrap justify-end gap-0.5">
              {data.days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setDayKey(d.date)}
                  className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] transition ${
                    selectedDay?.date === d.date
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  Day {d.day_index}
                </button>
              ))}
            </div>
          </header>
          {selectedDay ? (
            <div className="grid h-full grid-cols-2 content-stretch gap-1.5 p-2.5">
              {DAY_METRICS.map((m) => {
                const n = selectedDay[m.id] ?? 0;
                const warn = m.id === "recollect";
                return (
                  <div
                    key={m.id}
                    className={`flex min-h-0 flex-col justify-center gap-1 rounded-md border px-2 py-1.5 text-left ${
                      warn && n ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                          warn ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        <m.icon className="size-2.5" />
                      </span>
                      <span className="min-w-0 truncate text-[10px] leading-tight text-zinc-500">
                        {m.label}
                      </span>
                    </div>
                    <div className="text-lg font-semibold tabular-nums leading-none text-zinc-900">
                      {n}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-zinc-500">No days to summarise</p>
          )}
        </section>
      </div>

      {/* Row 2: Needs attention (2/3) + Console (1/3) */}
      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white lg:col-span-2">
          <header className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-3">
            <AlertTriangle className="h-3.5 w-3.5 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">Needs attention</h3>
          </header>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {attention.map((card) => (
              <div key={card.label} className={`rounded-lg border px-3 py-2.5 ${card.tint}`}>
                <card.icon className="mb-1.5 h-3.5 w-3.5 text-zinc-500" />
                <div className="text-xs leading-tight text-zinc-600">{card.label}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums leading-none text-zinc-900">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
              {engagement.camp_no != null
                ? `Camp ${engagement.camp_no}`
                : engagement.engagement_code ?? "—"}
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
              B2B
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                (engagement.status ?? "").toLowerCase() === "running"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="mt-4 text-sm font-semibold text-zinc-900">Console</div>
          <div
            className="mt-2 truncate rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-500"
            title={consoleUrl}
          >
            {consoleUrl}
          </div>
          <div className="mt-3 flex flex-nowrap gap-2">
            <PermissionGate category="engagement_console">
              <>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Copy className="size-3.5" />
                  {copied ? "Copied" : "Copy URL"}
                </button>
                <a
                  href={consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  <ExternalLink className="size-3.5" />
                  Open Console
                </a>
              </>
            </PermissionGate>
          </div>
        </div>
      </div>
    </div>
  );
}
