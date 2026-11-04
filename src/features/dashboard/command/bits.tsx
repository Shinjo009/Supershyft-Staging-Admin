import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/12 text-warning ring-warning/25",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-info/10 text-info ring-info/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const STATUS: Record<string, [Tone, string]> = {
  collected: ["success", "Collected"],
  scheduled: ["info", "Scheduled"],
  not_scheduled: ["warning", "Not scheduled"],
  not_started: ["neutral", "Not started"],
  pending: ["warning", "Pending"],
  delivered: ["success", "Delivered"],
  generated: ["success", "Generated"],
  failed: ["danger", "Failed"],
  sent: ["success", "Sent"],
  active: ["success", "Ongoing"],
  ongoing: ["info", "Ongoing"],
  upcoming: ["info", "Upcoming"],
  completed: ["success", "Completed"],
  cancelled: ["neutral", "Cancelled"],
  running: ["success", "Ongoing"],
  open: ["danger", "Open"],
  solved: ["success", "Solved"],
  resolved: ["success", "Resolved"],
  closed: ["neutral", "Closed"],
  confirmed: ["success", "Confirmed"],
  overdue: ["danger", "Overdue"],
  attended: ["success", "Attended"],
  booked: ["info", "Booked"],
  not_booked: ["neutral", "Not booked"],
};

const KPI_TINT = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  violet: "text-[oklch(0.5_0.12_300)]",
  rose: "text-[oklch(0.52_0.18_25)]",
  slate: "text-foreground",
} as const;

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const [tone, l] = STATUS[status] ?? ["neutral", status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONE[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {label ?? l}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        {
          success: "bg-success",
          warning: "bg-warning",
          danger: "bg-destructive",
          info: "bg-info",
          neutral: "bg-muted-foreground/40",
        }[tone],
      )}
    />
  );
}

export function KpiCard({
  label,
  value,
  split,
  onClick,
  live,
  compact,
  tint,
  icon: Icon,
  year,
  years,
  onYearChange,
  hint,
}: {
  label: string;
  value: number | string;
  split?: { b2b: number; b2c: number } | null;
  onClick?: () => void;
  live?: boolean;
  compact?: boolean;
  tint?: keyof typeof KPI_TINT;
  icon?: LucideIcon;
  year?: number;
  years?: readonly number[];
  onYearChange?: (year: number) => void;
  hint?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex h-full flex-col items-start rounded-xl border bg-card text-left shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition hover:border-foreground/20 hover:shadow-sm",
        compact ? "gap-2 p-3.5" : "min-h-[124px] gap-1 p-4",
        onClick && "cursor-pointer focus-within:ring-2 focus-within:ring-ring",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon && <Icon className="size-3.5 shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {live && (
            <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              Live
            </span>
          )}
          {years && year != null && onYearChange ? (
            <select
              value={year}
              aria-label={`${label} year`}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="h-6 rounded-md border bg-background px-1.5 text-[11px] font-medium text-foreground"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          ) : null}
        </span>
      </div>
      <button
        type="button"
        className="mt-1 flex min-h-0 w-full flex-1 flex-col text-left"
        onClick={onClick}
        disabled={!onClick}
      >
        <div
          className={cn(
            "text-4xl font-semibold tabular-nums leading-none tracking-tight",
            tint ? KPI_TINT[tint] : "text-foreground",
          )}
        >
          {value}
        </div>
        <div className="mt-auto pt-3">
          {split ? (
            <div className="flex flex-wrap items-center gap-x-5 text-sm text-muted-foreground">
              <span>
                B2B{" "}
                <span className="text-xl font-semibold tabular-nums text-foreground">
                  {split.b2b}
                </span>
              </span>
              <span>
                B2C{" "}
                <span className="text-xl font-semibold tabular-nums text-foreground">
                  {split.b2c}
                </span>
              </span>
            </div>
          ) : (
            hint && <div className="text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
      </button>
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  headerClassName,
  compact,
  icon: Icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  compact?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04)]",
        className,
      )}
    >
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b",
          compact ? "px-3 py-2" : "px-4 py-3",
          headerClassName,
        )}
      >
        <div className="min-w-0">
          <h2 className={cn("flex min-w-0 items-center gap-1.5 text-sm font-semibold", compact && "truncate")}>
            {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
            {title}
          </h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-2.5">
        <Inbox className="size-4 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="max-w-sm text-xs text-muted-foreground">{hint}</div>}
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "info",
  className,
}: {
  value: number;
  tone?: "info" | "success" | "warning" | "danger" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full", {
          info: "bg-info",
          success: "bg-success",
          warning: "bg-warning",
          danger: "bg-destructive",
          accent: "bg-primary",
        }[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
