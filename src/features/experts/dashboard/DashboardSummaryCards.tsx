import { Link } from "react-router-dom";
import { CalendarDays, Clock3, Inbox, Tent } from "lucide-react";
import type { ExpertDashboardSummary } from "../../../lib/api";
import { formatHours } from "./dashboardUtils";

export type DashboardViewAllKey = "requests" | "today" | "camps";

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  onViewAll,
  footer,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Inbox;
  accent: string;
  onViewAll?: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 self-start text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          View all →
        </button>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

export function DashboardSummaryCards({
  summary,
  onViewAll,
}: {
  summary: ExpertDashboardSummary;
  onViewAll: (key: DashboardViewAllKey) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <SummaryCard
        title="Requests Waiting"
        value={String(summary.requests_waiting)}
        description="Needs your action"
        icon={Inbox}
        accent="bg-amber-50 text-amber-700"
        onViewAll={() => onViewAll("requests")}
      />
      <SummaryCard
        title="Consultations Today"
        value={String(summary.consultations_today)}
        description={`${summary.consultations_today_completed} completed · ${summary.consultations_today_upcoming} upcoming`}
        icon={CalendarDays}
        accent="bg-zinc-100 text-zinc-700"
        onViewAll={() => onViewAll("today")}
      />
      <SummaryCard
        title="Open Camps"
        value={String(summary.open_camps)}
        description="Consultations still open"
        icon={Tent}
        accent="bg-zinc-100 text-zinc-700"
        onViewAll={() => onViewAll("camps")}
      />
      <SummaryCard
        title="This Week"
        value={formatHours(summary.hours_this_week)}
        description="Hours Consulted"
        icon={Clock3}
        accent="bg-zinc-100 text-zinc-700"
        footer={
          <Link
            to="/experts/portal/availability"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            Availability →
          </Link>
        }
      />
    </div>
  );
}
