import { Bell, CircleAlert, Cpu } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardCommandBootstrap } from "../../../lib/api";
import { cn } from "./cn";

export type WidgetNav =
  | { type: "failed_notifications" }
  | { type: "booking_issues" }
  | { type: "server" };

function MiniStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", warn && "border-warning/30")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-semibold tabular-nums", warn && "text-warning")}>{value}</div>
    </div>
  );
}

function MiniDonut({
  slices,
  center,
  compact,
}: {
  slices: { label: string; value: number; color: string }[];
  center?: string;
  compact?: boolean;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const size = compact ? 72 : 88;
  const r = compact ? 26 : 32;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-muted"
            strokeWidth={compact ? 8 : 10}
          />
          {slices.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={compact ? 8 : 10}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {center != null && (
          <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
            {center}
          </div>
        )}
      </div>
      <ul className="min-w-0 space-y-1">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WidgetShell({
  title,
  icon: Icon,
  children,
  onClick,
}: {
  title: string;
  icon: typeof Cpu;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
      <div className="flex items-start justify-between gap-2 border-b px-3 py-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onClick} disabled={!onClick}>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{title}</span>
          </div>
        </button>
      </div>
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </div>
  );
}

export function FixedWidgetGrid({
  data,
  onNavigate,
  className,
}: {
  data: DashboardCommandBootstrap;
  onNavigate: (t: WidgetNav) => void;
  className?: string;
}) {
  const cpu = Math.round(data.server_health.cpu_usage);
  const mem = Math.round(data.server_health.memory_usage);
  const storage = Math.round(data.server_health.storage_usage);
  const nh = data.notification_health;
  const bi = data.booking_issues;

  return (
    <div className={cn("grid h-full min-h-0 grid-cols-1 items-stretch gap-3 md:grid-cols-3", className)}>
      <WidgetShell title="Server load" icon={Cpu} onClick={() => onNavigate({ type: "server" })}>
        <button
          type="button"
          className="grid w-full grid-cols-3 gap-2 text-left"
          onClick={() => onNavigate({ type: "server" })}
        >
          <MiniStat label="CPU" value={`${cpu}%`} warn={cpu > 70} />
          <MiniStat label="Memory" value={`${mem}%`} warn={mem > 70} />
          <MiniStat label="Storage" value={`${storage}%`} warn={storage > 85} />
        </button>
      </WidgetShell>

      <WidgetShell
        title="Notification health"
        icon={Bell}
        onClick={() => onNavigate({ type: "failed_notifications" })}
      >
        <button
          type="button"
          className="w-full text-left"
          onClick={() => onNavigate({ type: "failed_notifications" })}
        >
          <MiniDonut
            compact
            center={String(nh.total)}
            slices={[
              { label: "Sent", value: nh.sent, color: "oklch(0.56 0.13 155)" },
              { label: "Failed", value: nh.failed, color: "oklch(0.58 0.2 25)" },
              { label: "Pending", value: nh.pending, color: "oklch(0.66 0.15 65)" },
            ]}
          />
        </button>
      </WidgetShell>

      <WidgetShell
        title="Booking issues"
        icon={CircleAlert}
        onClick={() => onNavigate({ type: "booking_issues" })}
      >
        <button type="button" className="w-full text-left" onClick={() => onNavigate({ type: "booking_issues" })}>
          <MiniDonut
            compact
            center={String(bi.total)}
            slices={[
              { label: "Unserviceable", value: bi.unserviceable, color: "oklch(0.66 0.15 65)" },
              { label: "Payment failed", value: bi.payment_failed, color: "oklch(0.58 0.2 25)" },
            ]}
          />
        </button>
      </WidgetShell>
    </div>
  );
}
