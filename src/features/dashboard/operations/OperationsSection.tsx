import type { ReactNode } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

type BadgeTone = "emerald" | "amber" | "red" | "zinc";

const BADGE_TONES: Record<BadgeTone, string> = {
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  zinc: "bg-zinc-100 text-zinc-700",
};

interface OperationsSectionProps {
  title: string;
  countLabel?: string;
  /** Compact count shown in the accordion header badge. */
  badgeCount?: string | number;
  /** Status color for the count badge. */
  badgeTone?: BadgeTone;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyMessage?: string;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperationsSection({
  title,
  countLabel,
  badgeCount,
  badgeTone = "zinc",
  loading,
  error,
  onRetry,
  empty,
  emptyMessage,
  headerExtra,
  footer,
  children,
  open,
  onOpenChange,
}: OperationsSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-zinc-200 min-w-0 overflow-hidden">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 truncate">{title}</h3>
            {countLabel && open ? (
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{countLabel}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading ? (
            <span className="text-[11px] font-medium text-zinc-400">Loading…</span>
          ) : null}
          {!loading && error ? (
            <span className="text-[11px] font-medium text-red-700">Error</span>
          ) : null}
          {!loading && !error && badgeCount != null && badgeCount !== "" ? (
            <span
              className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums ${BADGE_TONES[badgeTone]}`}
            >
              {badgeCount}
            </span>
          ) : null}
        </div>
      </button>

      {open ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-zinc-100">
          {headerExtra ? <div className="pt-3 mb-3 min-w-0">{headerExtra}</div> : <div className="pt-3" />}

          <div className="min-w-0">
            {loading ? (
              <div className="space-y-2" aria-busy="true">
                <div className="h-4 w-full bg-zinc-100 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-zinc-100 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-zinc-100 rounded animate-pulse" />
              </div>
            ) : null}

            {!loading && error ? (
              <div className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p>{error}</p>
                  {onRetry ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-1 text-xs font-medium underline underline-offset-2"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!loading && !error && empty ? (
              <p className="text-sm text-zinc-500">{emptyMessage}</p>
            ) : null}

            {!loading && !error && !empty ? <div className="min-w-0">{children}</div> : null}
          </div>

          {!loading && !error && footer ? <div className="shrink-0">{footer}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
