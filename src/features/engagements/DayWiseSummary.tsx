import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ClipboardCheck,
  Droplets,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import type {
  DayWiseBloodMetrics,
  DayWiseConsultationMetrics,
  EngagementDayWiseSummary,
} from "../../lib/api";

type SectionTab = "blood_collection" | "consultation";

const TILE =
  "rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-2 flex flex-col gap-1 min-h-[4.5rem]";

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickDefaultDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  const today = todayIso();
  if (dates.includes(today)) return today;
  const past = dates.filter((d) => d <= today);
  if (past.length > 0) return past[past.length - 1] ?? null;
  return dates[0] ?? null;
}

function MetricSkeleton() {
  return (
    <div className={TILE}>
      <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse" />
      <div className="h-6 w-8 bg-zinc-100 rounded animate-pulse" />
    </div>
  );
}

const BLOOD_CARDS: Array<{
  key: keyof DayWiseBloodMetrics;
  label: string;
  icon: typeof Droplets;
  iconWrap: string;
}> = [
  {
    key: "expected_collection",
    label: "Expected collection",
    icon: CalendarCheck,
    iconWrap: "bg-violet-50 text-violet-700",
  },
  {
    key: "sample_collected",
    label: "Sample collected",
    icon: Droplets,
    iconWrap: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "questionnaire_completed",
    label: "Questionnaire completed",
    icon: ClipboardCheck,
    iconWrap: "bg-zinc-100 text-zinc-700",
  },
];

const CONSULT_CARDS: Array<{
  key: keyof DayWiseConsultationMetrics;
  label: string;
  icon: typeof Stethoscope;
  iconWrap: string;
}> = [
  {
    key: "consultation_want",
    label: "Consultation want",
    icon: UserCheck,
    iconWrap: "bg-amber-50 text-amber-700",
  },
  {
    key: "consultation_done",
    label: "Consultation done",
    icon: Stethoscope,
    iconWrap: "bg-blue-50 text-blue-700",
  },
];

export function DayWiseSummary({
  summary,
  loading,
  error,
}: {
  summary: EngagementDayWiseSummary | null;
  loading: boolean;
  error: string | null;
}) {
  const [section, setSection] = useState<SectionTab>("blood_collection");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dates = useMemo(() => {
    if (!summary) return [];
    return section === "blood_collection"
      ? summary.blood_collection_dates
      : summary.consultation_dates;
  }, [summary, section]);

  useEffect(() => {
    setSelectedDate(pickDefaultDate(dates));
  }, [dates]);

  const bloodMetrics: DayWiseBloodMetrics | null =
    selectedDate && summary ? summary.blood_collection[selectedDate] ?? null : null;
  const consultMetrics: DayWiseConsultationMetrics | null =
    selectedDate && summary ? summary.consultation[selectedDate] ?? null : null;

  return (
    <section
      data-testid="day-wise-summary"
      className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 h-full flex flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Day-wise summary</h2>
        <div
          className="flex shrink-0 gap-0.5 rounded-lg border border-zinc-200 p-0.5"
          data-testid="day-wise-section-tabs"
        >
          {(
            [
              { id: "blood_collection" as const, label: "Blood collection" },
              { id: "consultation" as const, label: "Consultation" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`day-wise-tab-${tab.id}`}
              onClick={() => setSection(tab.id)}
              className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition ${
                section === tab.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200">{error}</p>
      ) : (
        <>
          <div
            className="flex flex-wrap gap-1"
            data-testid="day-wise-date-pills"
          >
            {loading && dates.length === 0 ? (
              <div className="h-6 w-16 bg-zinc-100 rounded-md animate-pulse" />
            ) : dates.length === 0 ? (
              <p className="text-xs text-zinc-500">No scheduled dates</p>
            ) : (
              dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  data-testid={`day-wise-date-${d}`}
                  onClick={() => setSelectedDate(d)}
                  className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    selectedDate === d
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:bg-zinc-100 border border-zinc-200"
                  }`}
                >
                  {formatDayLabel(d)}
                </button>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
            {section === "blood_collection"
              ? BLOOD_CARDS.map((card) => {
                  const Icon = card.icon;
                  if (loading) {
                    return <MetricSkeleton key={card.key} />;
                  }
                  return (
                    <article
                      key={card.key}
                      data-testid={`day-wise-metric-${card.key}`}
                      className={TILE}
                    >
                      <div className="flex items-start gap-1.5">
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full ${card.iconWrap}`}
                        >
                          <Icon className="size-2.5" />
                        </span>
                        <span className="min-w-0 text-[10px] leading-snug text-zinc-500 break-words">
                          {card.label}
                        </span>
                      </div>
                      <div className="text-lg font-semibold tabular-nums text-zinc-900 leading-none">
                        {bloodMetrics?.[card.key] ?? 0}
                      </div>
                    </article>
                  );
                })
              : CONSULT_CARDS.map((card) => {
                  const Icon = card.icon;
                  if (loading) {
                    return <MetricSkeleton key={card.key} />;
                  }
                  return (
                    <article
                      key={card.key}
                      data-testid={`day-wise-metric-${card.key}`}
                      className={TILE}
                    >
                      <div className="flex items-start gap-1.5">
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full ${card.iconWrap}`}
                        >
                          <Icon className="size-2.5" />
                        </span>
                        <span className="min-w-0 text-[10px] leading-snug text-zinc-500 break-words">
                          {card.label}
                        </span>
                      </div>
                      <div className="text-lg font-semibold tabular-nums text-zinc-900 leading-none">
                        {consultMetrics?.[card.key] ?? 0}
                      </div>
                    </article>
                  );
                })}
          </div>
        </>
      )}
    </section>
  );
}
