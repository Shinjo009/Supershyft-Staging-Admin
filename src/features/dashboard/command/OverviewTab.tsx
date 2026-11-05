import {
  CalendarDays,
  ClipboardList,
  Droplets,
  FileText,
  ListTodo,
  Stethoscope,
  Ticket,
  Users,
} from "lucide-react";
import type { DashboardCommandBootstrap } from "../../../lib/api";
import { EmptyState, KpiCard, Section } from "./bits";
import { cn } from "./cn";
import { compactCount } from "./dates";
import type { CommandDashboardState } from "./useCommandDashboard";
import { FixedWidgetGrid } from "./widgets";

function TicketsOverview({
  data,
  onOpen,
}: {
  data: DashboardCommandBootstrap;
  onOpen: (status?: "open" | "solved") => void;
}) {
  const slices = [
    {
      id: "open" as const,
      label: "Open",
      value: data.tickets.open,
      color: "oklch(0.66 0.15 65)",
      tint: "border-warning/30 bg-warning/10",
    },
    {
      id: "solved" as const,
      label: "Solved",
      value: data.tickets.solved,
      color: "oklch(0.56 0.13 155)",
      tint: "border-success/25 bg-success/10",
    },
  ];
  return (
    <Section
      title="Tickets"
      compact
      icon={Ticket}
      description={`${data.tickets.open + data.tickets.solved + data.tickets.closed} raised`}
      bodyClassName="overflow-hidden"
      actions={
        <button
          type="button"
          className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onOpen()}
        >
          View all
        </button>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-2 items-stretch gap-2 p-2.5">
        {slices.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpen(s.id)}
            className={cn(
              "flex min-h-0 min-w-0 items-center justify-between gap-2 overflow-hidden rounded-lg border px-2.5 py-2 text-left transition hover:border-foreground/20 hover:shadow-sm",
              s.tint,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 text-lg font-semibold tabular-nums leading-none">{s.value}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function ActionCenterMini({
  data,
  onDrill,
}: {
  data: DashboardCommandBootstrap;
  onDrill: (drill: string, title: string) => void;
}) {
  const ac = data.action_center;
  const tiles: {
    key: string;
    label: string;
    value: number;
    tone: "info" | "warning" | "danger";
    drill: string;
    title: string;
  }[] = [
    {
      key: "upcoming",
      label: "Upcoming collections",
      value: ac.upcoming_collections,
      tone: "info",
      drill: "upcoming_collections",
      title: "Upcoming collections",
    },
    {
      key: "overdue",
      label: "Overdue collections",
      value: ac.overdue_collections,
      tone: "danger",
      drill: "overdue_collections",
      title: "Overdue collections",
    },
    {
      key: "q",
      label: "Questionnaire pending",
      value: ac.questionnaire_pending,
      tone: "warning",
      drill: "questionnaire_pending",
      title: "Questionnaire pending",
    },
    {
      key: "lab",
      label: "Blood reports pending",
      value: ac.blood_reports_pending,
      tone: "warning",
      drill: "blood_reports_pending",
      title: "Blood reports pending",
    },
    {
      key: "bio",
      label: "Bio-AI pending",
      value: ac.bio_ai_pending,
      tone: "warning",
      drill: "bio_ai_pending",
      title: "Bio-AI pending",
    },
    {
      key: "consult",
      label: "Consultations pending",
      value: ac.consultations_pending,
      tone: "info",
      drill: "consultations_pending",
      title: "Consultations pending",
    },
  ];
  const tileTone = {
    info: "border-info/25 bg-info/10",
    warning: "border-warning/30 bg-warning/12",
    danger: "border-destructive/25 bg-destructive/10",
  } as const;

  return (
    <Section title="Action Center" compact icon={ListTodo} bodyClassName="min-h-0">
      <div className="grid h-full min-h-[11rem] grid-cols-3 grid-rows-2 gap-2 p-2.5">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            title={tile.title}
            onClick={() => onDrill(tile.drill, tile.title)}
            className={cn(
              "flex h-full min-h-[5rem] flex-col justify-between gap-1 rounded-lg border px-2.5 py-2 text-left transition hover:border-foreground/20 hover:shadow-sm",
              tileTone[tile.tone],
            )}
          >
            <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{tile.label}</span>
            <span className="text-2xl font-semibold tabular-nums leading-none">{compactCount(tile.value)}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

export function OverviewTab({ ops }: { ops: CommandDashboardState }) {
  const data = ops.data;
  if (!data) {
    return <EmptyState title="No overview data" hint="Try refreshing the dashboard." />;
  }

  const cards = [
    { id: "registered", label: "People registered", key: "people_registered" as const, icon: Users, tint: "info" as const },
    { id: "tested", label: "Tests completed", key: "tests_completed" as const, icon: Droplets, tint: "success" as const },
    { id: "qDone", label: "Questionnaire done", key: "questionnaire_done" as const, icon: ClipboardList, tint: "violet" as const },
    { id: "delivered", label: "Reports delivered", key: "reports_delivered" as const, icon: FileText, tint: "warning" as const },
    { id: "consultDone", label: "Consultations done", key: "consultations" as const, icon: Stethoscope, tint: "rose" as const },
    { id: "open", label: "Open engagements", key: "open_engagements" as const, icon: CalendarDays, tint: "slate" as const, live: true },
  ];

  const drillMap: Record<string, string> = {
    registered: "people_registered",
    tested: "tests_completed",
    qDone: "questionnaire_done",
    delivered: "reports_delivered",
    consultDone: "consultations",
    open: "open_engagements",
  };

  return (
    <div className="grid min-h-full grid-rows-[minmax(12.5rem,1.15fr)_minmax(19rem,2fr)] gap-3">
      <div className="h-full min-h-[12.5rem]">
        <FixedWidgetGrid
          data={data}
          className="h-full"
          onNavigate={(t) => {
            if (t.type === "failed_notifications") {
              ops.openDrill({ drill: "failed_notifications", title: "Failed notifications" });
            } else if (t.type === "booking_issues") {
              ops.openDrill({ drill: "booking_issues", title: "Booking issues" });
            }
          }}
        />
      </div>
      <div className="grid h-full min-h-[19rem] grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="grid min-h-0 grid-cols-1 grid-rows-2 gap-3 sm:grid-cols-3 lg:col-span-3">
          {cards.map((card) => {
            const kpi = data.overview_kpis[card.key];
            const value = "total" in kpi ? kpi.total : 0;
            const split =
              card.key === "people_registered"
                ? null
                : {
                    b2b: Number(("b2b" in kpi ? kpi.b2b : 0) ?? 0),
                    b2c: Number(("b2c" in kpi ? kpi.b2c : 0) ?? 0),
                  };
            return (
              <KpiCard
                key={card.id}
                compact
                tint={card.tint}
                label={card.label}
                value={value}
                split={split}
                icon={card.icon}
                live={"live" in card ? card.live : false}
                onClick={() =>
                  ops.openDrill({
                    drill: drillMap[card.id],
                    title: card.label,
                    audience: "all",
                  })
                }
              />
            );
          })}
        </div>
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-2">
          <div className="h-[calc((100%-0.75rem)/3)] min-h-[5.5rem]">
            <TicketsOverview
              data={data}
              onOpen={(status) =>
                ops.openDrill({
                  drill: status === "open" ? "tickets_open" : status === "solved" ? "tickets_solved" : "tickets_all",
                  title: status === "open" ? "Open tickets" : status === "solved" ? "Solved tickets" : "Support tickets",
                })
              }
            />
          </div>
          <div className="min-h-[12.25rem] flex-1">
            <ActionCenterMini
              data={data}
              onDrill={(drill, title) => ops.openDrill({ drill, title, audience: "all" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
