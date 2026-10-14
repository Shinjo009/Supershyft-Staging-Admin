import { useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, Clock3, Hash, Timer } from "lucide-react";
import { getApiError, participantsApi, type EngagementBookingSummary } from "../../lib/api";

const CARD =
  "rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-3 flex flex-col gap-1 min-h-[5.5rem]";

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
      <div className="h-3.5 w-20 bg-zinc-100 rounded animate-pulse" />
      <div className="h-8 w-12 bg-zinc-100 rounded animate-pulse" />
      <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
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
    <section className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium text-zinc-500">Booking summary</h2>
        {summary?.as_of_date ? (
          <div className="text-xs text-zinc-400 tabular-nums">as of {summary.as_of_date}</div>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600 p-3 rounded-lg bg-red-50 border border-red-200">{error}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {METRICS.map((metric) => {
            const Icon = metric.icon;
            return loading ? (
              <MetricSkeleton key={metric.key} />
            ) : (
              <article key={metric.key} className={CARD}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-600 leading-snug">{metric.label}</p>
                  <div className={`p-1 rounded-md shrink-0 ${metric.iconWrap}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-2xl font-semibold tabular-nums tracking-tight ${metric.valueClass}`}>
                  {(summary?.[metric.key] ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">{metric.hint}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
