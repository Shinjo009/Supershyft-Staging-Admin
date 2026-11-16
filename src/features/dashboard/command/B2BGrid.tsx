import { ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  commandDashboardApi,
  getApiError,
  type CommandB2BBucket,
  type CommandB2BSummary,
  type CommandPeriodParams,
} from "../../../lib/api";
import { B2BEngagementTable } from "./B2BEngagementTable";
import { B2B_CARD_ORDER, type CardId } from "./period";

const TONE_DOT: Record<string, string> = {
  ongoing: "bg-emerald-500",
  upcoming: "bg-sky-500",
  completed: "bg-zinc-400",
};

export function B2BGrid({
  periodParams,
  selectedCard,
  onOpenCard,
}: {
  periodParams: CommandPeriodParams;
  selectedCard: CardId | null;
  onOpenCard: (id: CardId) => void;
}) {
  const [summary, setSummary] = useState<CommandB2BSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commandDashboardApi
      .b2bSummary(periodParams)
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

  const selectedBucket =
    selectedCard === "ongoing" ||
    selectedCard === "upcoming" ||
    selectedCard === "completed"
      ? (selectedCard as CommandB2BBucket)
      : null;

  return (
    <div className="space-y-4" data-testid="b2b-grid">
      {error ? (
        <p className="text-sm text-amber-700" role="status">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {B2B_CARD_ORDER.map((card) => {
          const value =
            summary && card.id in summary
              ? summary[card.id as keyof CommandB2BSummary]
              : null;
          const selected = selectedCard === card.id;
          return (
            <button
              key={card.id}
              type="button"
              data-testid={`card-${card.id}`}
              onClick={() => onOpenCard(card.id)}
              className={`flex items-start justify-between rounded-xl border bg-white px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-zinc-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                selected ? "border-zinc-400" : "border-zinc-200"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <span
                    className={`size-2 shrink-0 rounded-full ${TONE_DOT[card.id] ?? "bg-zinc-400"}`}
                    aria-hidden
                  />
                  {card.title}
                </div>
                <div className="mt-1.5 text-2xl font-semibold tabular-nums leading-none text-zinc-900">
                  {loading ? (
                    <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
                  ) : (
                    (value ?? 0)
                  )}
                </div>
                <div className="mt-1.5 text-xs text-zinc-500">{card.hint}</div>
              </div>
              <ChevronRight className="mt-0.5 size-4 text-zinc-400" aria-hidden />
            </button>
          );
        })}
      </div>

      {selectedBucket ? (
        <B2BEngagementTable bucket={selectedBucket} periodParams={periodParams} />
      ) : null}
    </div>
  );
}
