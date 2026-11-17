import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type MetricCardVariant = "feature" | "metric" | "panel";

export function MetricCard({
  title,
  description,
  icon: Icon,
  children,
  onClick,
  clickable,
  showViewAll,
  variant = "feature",
  className = "",
  bodyClassName,
  "data-testid": testId,
}: {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
  onClick?: () => void;
  clickable?: boolean;
  /** Show “View all” without requiring click wiring (UI shell). */
  showViewAll?: boolean;
  variant?: MetricCardVariant;
  className?: string;
  /** Overrides default body padding when set. */
  bodyClassName?: string;
  "data-testid"?: string;
}) {
  const shell =
    variant === "metric"
      ? "min-h-[9.5rem]"
      : variant === "panel"
        ? "min-h-0 overflow-hidden"
        : "min-h-[10.25rem]";

  const headerPad = "px-3 py-2";
  const defaultBodyPad =
    variant === "panel" ? "p-2.5" : variant === "feature" ? "px-3 py-2.5" : "px-3.5 py-3";
  const bodyAlign = variant === "panel" ? "items-stretch" : "items-center";
  const bodyClass = `flex min-h-0 flex-1 ${
    bodyClassName ?? `${bodyAlign} ${defaultBodyPad}`
  }`;

  const body = (
    <>
      <div
        className={`flex shrink-0 items-start justify-between gap-2 border-b border-zinc-100 ${headerPad}`}
      >
        <div className="min-w-0">
          <h3
            className={`flex min-w-0 items-center gap-1.5 font-semibold text-zinc-900 ${
              variant === "metric" ? "text-[13px]" : "text-sm"
            }`}
          >
            {Icon ? (
              <Icon className="size-3.5 shrink-0 text-zinc-500" aria-hidden strokeWidth={1.75} />
            ) : null}
            <span className="truncate">{title}</span>
          </h3>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{description}</p>
          ) : null}
        </div>
        {clickable || showViewAll ? (
          <span className="shrink-0 pt-0.5 text-xs font-medium text-zinc-500">View all</span>
        ) : null}
      </div>
      <div className={bodyClass}>{children}</div>
    </>
  );

  const baseClass = `flex h-full w-full flex-col rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${shell} ${className}`;

  if (clickable && onClick) {
    return (
      <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        className={`${baseClass} text-left transition hover:border-zinc-300 hover:bg-zinc-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400`}
      >
        {body}
      </button>
    );
  }

  return (
    <div data-testid={testId} className={baseClass}>
      {body}
    </div>
  );
}
