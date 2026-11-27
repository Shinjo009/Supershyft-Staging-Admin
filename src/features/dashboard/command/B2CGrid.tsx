import {
  CalendarDays,
  Droplets,
  FileText,
  Inbox,
  Loader2,
  Package,
  Sparkles,
  Stethoscope,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  commandDashboardApi,
  getApiError,
  type CommandB2CSummary,
  type CommandPeriodParams,
} from "../../../lib/api";
import { MetricCard } from "./MetricCard";
import { B2C_KPI_CARD_ORDER, type CardId } from "./period";

const KPI_ICONS: Partial<Record<CardId, typeof Users>> = {
  total_bookings: Users,
  collection_tomorrow: CalendarDays,
  tests_completed: Droplets,
  lab_report_delivered: FileText,
  bio_ai_reports: Sparkles,
  consultation_done: Stethoscope,
};

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <Inbox className="size-5 text-zinc-400" aria-hidden />
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export function B2CGrid({
  periodParams,
  onOpenCard,
  onOpenPackage,
  onOpenCoupon,
}: {
  periodParams: CommandPeriodParams;
  onOpenCard: (id: CardId) => void;
  onOpenPackage: (packageId: number) => void;
  onOpenCoupon: (discountCodeId: number) => void;
}) {
  const [summary, setSummary] = useState<CommandB2CSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commandDashboardApi
      .b2cSummary(periodParams)
      .then((res) => {
        if (cancelled) return;
        setSummary(res.data.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err));
        setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodParams.period, periodParams.from, periodParams.to]);

  const valueFor = (id: CardId): number | null => {
    if (!summary) return null;
    switch (id) {
      case "total_bookings":
        return summary.total_bookings;
      case "collection_tomorrow":
        return summary.collection_tomorrow;
      case "tests_completed":
        return summary.tests_completed;
      case "lab_report_delivered":
        return summary.lab_report_delivered;
      case "bio_ai_reports":
        return summary.bio_ai_reports;
      case "consultation_done":
        return summary.consultation_done;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4" data-testid="b2c-grid">
      {error ? (
        <p className="text-sm text-amber-700" role="status">
          {error}
        </p>
      ) : null}

      <div className="grid items-stretch gap-3 lg:grid-cols-3">
        <div className="grid grid-cols-2 grid-rows-3 gap-3 lg:col-span-1">
          {B2C_KPI_CARD_ORDER.map((card) => {
            const Icon = KPI_ICONS[card.id];
            const value = valueFor(card.id);
            const clickable = card.interaction === "new_page";
            return (
              <MetricCard
                key={card.id}
                title={card.title}
                icon={Icon}
                variant="metric"
                clickable={clickable}
                hideViewAll
                wrapTitle
                onClick={clickable ? () => onOpenCard(card.id) : undefined}
                data-testid={`card-${card.id}`}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin text-zinc-400" />
                ) : (
                  <div className="text-3xl font-semibold tabular-nums leading-none text-zinc-900">
                    {value ?? "—"}
                  </div>
                )}
              </MetricCard>
            );
          })}
        </div>

        <div className="min-h-0 lg:col-span-2">
          <MetricCard
            title="Tomorrow's collections"
            description={
              summary
                ? `${summary.tomorrows_collection.length} scheduled`
                : undefined
            }
            icon={CalendarDays}
            variant="panel"
            data-testid="card-tomorrows_collection"
            bodyClassName="items-stretch p-0"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-zinc-500">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : !summary || summary.tomorrows_collection.length === 0 ? (
              <EmptyState
                title="No collections tomorrow"
                hint="Nobody is scheduled for tomorrow in B2C."
              />
            ) : (
              <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto">
                {summary.tomorrows_collection.map((row) => (
                  <li
                    key={row.user_id}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
                    data-testid={`tomorrow-row-${row.user_id}`}
                  >
                    <span className="w-14 shrink-0 font-mono text-xs text-zinc-600">
                      {row.collection_time || "—"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-zinc-900">
                        {row.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {row.phone || "—"}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                      {row.address || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </MetricCard>
        </div>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-2">
        <MetricCard
          title="Package performance"
          description="Bookings by package in this period"
          icon={Package}
          variant="panel"
          data-testid="card-package_performance"
          bodyClassName="items-stretch p-0"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : !summary || summary.packages.length === 0 ? (
            <EmptyState title="No package bookings" hint="Try a wider date range." />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.packages.map((pkg) => (
                <li key={pkg.package_id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50"
                    onClick={() => onOpenPackage(pkg.package_id)}
                    data-testid={`package-row-${pkg.package_id}`}
                  >
                    <span className="truncate font-medium text-zinc-900">
                      {pkg.package_name}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      <span className="font-medium text-zinc-900">{pkg.user_count}</span>
                      {" users"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </MetricCard>

        <MetricCard
          title="Coupon usage"
          description="Redemptions in this period"
          icon={Ticket}
          variant="panel"
          data-testid="card-coupon_usage"
          bodyClassName="items-stretch p-0"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : !summary || summary.coupons.length === 0 ? (
            <EmptyState
              title="No coupon usage"
              hint="No B2C coupon redemptions in this period."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.coupons.map((coupon) => (
                <li key={coupon.discount_code_id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50"
                    onClick={() => onOpenCoupon(coupon.discount_code_id)}
                    data-testid={`coupon-row-${coupon.discount_code_id}`}
                  >
                    <span className="font-semibold tracking-wide text-zinc-900">
                      {coupon.discount_code}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      {coupon.user_count} user{coupon.user_count === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </MetricCard>
      </div>
    </div>
  );
}
