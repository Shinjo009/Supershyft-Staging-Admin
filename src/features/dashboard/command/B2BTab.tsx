import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DashboardLifecycle } from "../../../lib/api";
import { EmptyState, ProgressBar, StatusBadge } from "./bits";
import { cn } from "./cn";
import { fmtDay } from "./dates";
import type { CommandDashboardState } from "./useCommandDashboard";

function dayCount(from: string | null, to: string | null) {
  if (!from || !to) return 0;
  const a = Date.parse(`${from}T12:00:00`);
  const b = Date.parse(`${to}T12:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function B2BTab({ ops }: { ops: CommandDashboardState }) {
  const navigate = useNavigate();
  const data = ops.data;
  const [q, setQ] = useState("");
  const filter = ops.lifecycle;
  const counts = data?.b2b.lifecycle_counts ?? { ongoing: 0, upcoming: 0, completed: 0 };

  const pills: { id: DashboardLifecycle; label: string }[] = [
    { id: "all", label: "All" },
    { id: "ongoing", label: "Ongoing" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];

  const summaries = [
    { id: "ongoing" as const, label: "Ongoing", value: counts.ongoing, hint: "On track", tone: "success" as const },
    { id: "upcoming" as const, label: "Upcoming", value: counts.upcoming, hint: "Scheduled", tone: "info" as const },
    { id: "completed" as const, label: "Completed", value: counts.completed, hint: "Past camps", tone: "neutral" as const },
  ];

  const rows = useMemo(() => {
    const camps = data?.b2b.camps ?? [];
    const query = q.trim().toLowerCase();
    return camps.filter((c) => {
      if (filter !== "all" && c.lifecycle !== filter && c.status !== (filter === "ongoing" ? "running" : filter === "upcoming" ? "scheduled" : "completed")) {
        // bootstrap already filtered by lifecycle when set; still allow client refine
        if (filter === "ongoing" && c.status !== "running") return false;
        if (filter === "upcoming" && c.status !== "scheduled") return false;
        if (filter === "completed" && c.status !== "completed") return false;
      }
      if (!query) return true;
      return (
        (c.engagement_name || "").toLowerCase().includes(query) ||
        (c.organization_name || "").toLowerCase().includes(query) ||
        (c.city || "").toLowerCase().includes(query) ||
        (c.engagement_code || "").toLowerCase().includes(query)
      );
    });
  }, [data?.b2b.camps, filter, q]);

  if (!data) return <EmptyState title="No B2B data" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Camps</h1>
        <p className="text-sm text-muted-foreground">Corporate and organization engagements by lifecycle.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {summaries.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => ops.setLifecycle(s.id)}
            className={cn(
              "flex flex-col items-start rounded-xl border bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition hover:border-foreground/20 hover:shadow-sm",
              filter === s.id && "border-foreground/20",
            )}
          >
            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            <span className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</span>
            <span className="mt-1 text-xs text-muted-foreground">{s.hint}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-0.5">
          {pills.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => ops.setLifecycle(p.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground",
                filter === p.id && "bg-primary text-primary-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search camps, org, city…"
            className="h-8 w-64 rounded-lg border bg-card pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04)]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-3 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Camp</span>
          <span>Organization</span>
          <span>Schedule</span>
          <span>Status</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No camps in this view" hint="Try another lifecycle filter or search." />
        ) : (
          <ul className="divide-y">
            {rows.map((c) => {
              const days = dayCount(c.start_date, c.end_date) + 1;
              const progress =
                c.status === "completed" ? 100 : c.status === "running" ? 55 : c.status === "scheduled" ? 10 : 0;
              return (
                <li key={c.engagement_id}>
                  <button
                    type="button"
                    onClick={() => {
                      const code = c.engagement_code || String(c.engagement_id);
                      navigate(`/engagements/${encodeURIComponent(code)}`);
                    }}
                    className="grid w-full grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.engagement_name || c.engagement_code}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.city || "—"} · {c.engagement_code}
                      </div>
                      <div className="mt-1.5 max-w-xs">
                        <ProgressBar
                          value={progress}
                          tone={c.status === "running" ? "success" : c.status === "scheduled" ? "info" : "accent"}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 text-sm">{c.organization_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDay(c.start_date)} – {fmtDay(c.end_date)}
                      <div>{days} day camp</div>
                    </div>
                    <StatusBadge status={c.status === "running" ? "ongoing" : c.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {data.b2b.camps_total > rows.length && filter === "all" && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing {rows.length} of {data.b2b.camps_total}. Open drill for full list.
            <button
              type="button"
              className="ml-2 text-foreground underline"
              onClick={() => ops.openDrill({ drill: "b2b_camps", title: "All B2B camps", audience: "b2b" })}
            >
              View all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
