import { useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, Clock3, Hash, Timer } from "lucide-react";
import { getApiError, participantsApi, type EngagementBookingSummary } from "../../lib/api";

const CARD =
  "rounded-lg border border-zinc-200/80 bg-white px-2.5 py-2 flex flex-col justify-between min-h-[4.25rem] shadow-[0_1px_0_rgba(24,24,27,0.04)]";

const METRICS: Array<{
  key:
    | "today_expected_booking_count"
    | "today_pending_booking_count"
    | "today_booking_count"
    | "total_booking_count"
    | "pending_booking_count";
  label: string;
  hint: string;
  icon: typeof Hash;
  valueClass: string;
  iconWrap: string;
}> = [
  {
    key: "today_expected_booking_count",
    label: "Today's expected",
    hint: "Scheduled for today",
    icon: CalendarClock,
    valueClass: "text-violet-800",
    iconWrap: "bg-violet-50 text-violet-700",
  },
  {
    key: "today_pending_booking_count",
    label: "Today's pending",
    hint: "Upcoming today",
    icon: Timer,
    valueClass: "text-orange-800",
    iconWrap: "bg-orange-50 text-orange-700",
  },
  {
    key: "today_booking_count",
    label: "Today's bookings",
    hint: "Collected today",
    icon: CalendarCheck,
    valueClass: "text-sky-800",
    iconWrap: "bg-sky-50 text-sky-700",
  },
  {
    key: "total_booking_count",
    label: "Total bookings",
    hint: "All collected",
    icon: Hash,
    valueClass: "text-zinc-900",
    iconWrap: "bg-zinc-100 text-zinc-700",
  },
  {
    key: "pending_booking_count",
    label: "Pending / upcoming",
    hint: "Still open",
    icon: Clock3,
    valueClass: "text-amber-800",
    iconWrap: "bg-amber-50 text-amber-700",
  },
];

function MetricSkeleton() {
  return (
    <div className={CARD}>
      <div className="h-3 w-16 bg-zinc-100 rounded animate-pulse" />
      <div className="h-7 w-12 bg-zinc-100 rounded animate-pulse mt-2" />
      <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse mt-1" />
    </div>
  );
}

export function EngagementBookingSummaryCards({ engagementId }: { engagementId: number }) {
  const [summary, setSummary] = useState<EngagementBookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reset the previous engagement snapshot before loading the new one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(null);
    setError(null);
    setLoading(true);
    void participantsApi
      .bookingSummary(engagementId)
      .then((res) => {
        if (!cancelled) setSummary(res.data.data);
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

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-2">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <h2 className="text-xs font-semibold text-zinc-800">Booking summary</h2>
        {summary?.as_of_date ? (
          <div className="text-[10px] text-zinc-400 tabular-nums">as of {summary.as_of_date}</div>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-red-600 p-2 rounded-lg bg-red-50 border border-red-200">{error}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {METRICS.map((metric) => {
            const Icon = metric.icon;
            return loading ? (
              <MetricSkeleton key={metric.key} />
            ) : (
              <article key={metric.key} className={CARD}>
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-[10px] font-medium text-zinc-500 leading-snug break-words pr-0.5">
                    {metric.label}
                  </p>
                  <div className={`p-0.5 rounded-md shrink-0 ${metric.iconWrap}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                </div>
                <p
                  className={`mt-1 text-xl font-semibold tabular-nums tracking-tight leading-none ${metric.valueClass}`}
                >
                  {(summary?.[metric.key] ?? 0).toLocaleString()}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-400 leading-tight">{metric.hint}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
