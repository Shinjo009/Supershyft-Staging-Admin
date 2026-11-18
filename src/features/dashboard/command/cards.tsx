import {
  ClipboardList,
  Droplets,
  FileText,
  ListTodo,
  Loader2,
  Sparkles,
  Stethoscope,
  Ticket,
  Tent,
} from "lucide-react";
import type {
  CommandAudienceSplitSummary,
  CommandNotificationHealth,
  CommandTicketsSummary,
} from "../../../lib/api";
import { MiniDonut, MiniStat } from "./charts";
import { MetricCard, type MetricCardVariant } from "./MetricCard";
import {
  ACTION_SUBCARD_ORDER,
  type ActionSubcardId,
  type CardId,
} from "./period";

function AudienceSplitBody({
  total,
  b2b,
  b2c,
}: {
  total: number;
  b2b: number;
  b2c: number;
}) {
  return (
    <div className="w-full">
      <div
        className="text-4xl font-semibold tabular-nums leading-none text-zinc-900"
        data-testid="audience-split-total"
      >
        {total}
      </div>
      <div
        className="mt-3 flex w-full items-baseline justify-between gap-4"
        data-testid="audience-split"
      >
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-xs font-medium text-zinc-500">B2B</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-900">{b2b}</span>
        </div>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-xs font-medium text-zinc-500">B2C</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-900">{b2c}</span>
        </div>
      </div>
    </div>
  );
}

const FEATURE_IDS = new Set<CardId>(["booking_issues"]);

function variantFor(id: string): MetricCardVariant {
  if (FEATURE_IDS.has(id as CardId)) return "feature";
  return "metric";
}

export function ServerLoadCard({
  cpu,
  memory,
  storage,
  loading,
}: {
  cpu: number | null;
  memory: number | null;
  storage: number | null;
  loading?: boolean;
}) {
  const fmt = (v: number | null) => (v == null || !Number.isFinite(v) ? "—" : `${Math.round(v)}%`);
  return (
    <MetricCard title="Server load" variant="feature" data-testid="card-server_load">
      {loading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
      ) : (
        <div className="grid w-full grid-cols-3 gap-2">
          <MiniStat label="CPU" value={fmt(cpu)} warn={(cpu ?? 0) > 70} />
          <MiniStat label="Memory" value={fmt(memory)} warn={(memory ?? 0) > 70} />
          <MiniStat label="Storage" value={fmt(storage)} warn={(storage ?? 0) > 70} />
        </div>
      )}
    </MetricCard>
  );
}

export function NotificationHealthCard({
  data,
  loading,
  onOpen,
}: {
  data: CommandNotificationHealth | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  const sent = data?.sent ?? 0;
  const failed = data?.failed ?? 0;
  const pending = data?.pending ?? 0;
  const total = data?.total ?? 0;
  return (
    <MetricCard
      title="Notification health"
      variant="feature"
      clickable
      onClick={onOpen}
      data-testid="card-notification_health"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
      ) : (
        <MiniDonut
          compact
          largeValues
          center={String(total)}
          slices={[
            { label: "Sent", value: sent, color: "#059669" },
            { label: "Failed", value: failed, color: "#dc2626" },
            { label: "Pending", value: pending, color: "#d97706" },
          ]}
        />
      )}
    </MetricCard>
  );
}

export function PeopleRegisteredCard({
  total,
  loading,
  onOpen,
}: {
  total: number | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <MetricCard
      title="People registered"
      variant="metric"
      clickable
      onClick={onOpen}
      data-testid="card-people_registered"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
      ) : (
        <div className="w-full">
          <div className="text-4xl font-semibold tabular-nums leading-none text-zinc-900">
            {total ?? 0}
          </div>
        </div>
      )}
    </MetricCard>
  );
}

export function TestsCompletedCard({
  summary,
  loading,
  onOpen,
}: {
  summary: CommandAudienceSplitSummary | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <MetricCard
      title="Tests completed"
      icon={Droplets}
      variant="metric"
      clickable
      onClick={onOpen}
      data-testid="card-tests_completed"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
      ) : (
        <AudienceSplitBody
          total={summary?.total ?? 0}
          b2b={summary?.b2b ?? 0}
          b2c={summary?.b2c ?? 0}
        />
      )}
    </MetricCard>
  );
}

export function QuestionnaireDoneCard({
  summary,
  loading,
  onOpen,
}: {
  summary: CommandAudienceSplitSummary | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <MetricCard
      title="Questionnaire done"
      icon={ClipboardList}
      variant="metric"
      clickable
      onClick={onOpen}
      data-testid="card-questionnaire_done"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
      ) : (
        <AudienceSplitBody
          total={summary?.total ?? 0}
          b2b={summary?.b2b ?? 0}
          b2c={summary?.b2c ?? 0}
        />
      )}
    </MetricCard>
  );
}

function AudienceSplitMetricCard({
  title,
  icon: Icon,
  summary,
  loading,
  onOpen,
  testId,
}: {
  title: string;
  icon: typeof Droplets;
  summary: CommandAudienceSplitSummary | null;
  loading?: boolean;
  onOpen: () => void;
  testId: string;
}) {
  return (
    <MetricCard
      title={title}
      icon={Icon}
      variant="metric"
      clickable
      onClick={onOpen}
      data-testid={testId}
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
      ) : (
        <AudienceSplitBody
          total={summary?.total ?? 0}
          b2b={summary?.b2b ?? 0}
          b2c={summary?.b2c ?? 0}
        />
      )}
    </MetricCard>
  );
}

export function BloodReportGeneratedCard({
  summary,
  loading,
  onOpen,
}: {
  summary: CommandAudienceSplitSummary | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <AudienceSplitMetricCard
      title="Blood report generated"
      icon={FileText}
      summary={summary}
      loading={loading}
      onOpen={onOpen}
      testId="card-blood_report_generated"
    />
  );
}

export function BioaiReportGeneratedCard({
  summary,
  loading,
  onOpen,
}: {
  summary: CommandAudienceSplitSummary | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <AudienceSplitMetricCard
      title="BioAI report generated"
      icon={Sparkles}
      summary={summary}
      loading={loading}
      onOpen={onOpen}
      testId="card-bioai_report_generated"
    />
  );
}

export function ConsultationDoneCard({
  summary,
  loading,
  onOpen,
}: {
  summary: CommandAudienceSplitSummary | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <AudienceSplitMetricCard
      title="Consultation done"
      icon={Stethoscope}
      summary={summary}
      loading={loading}
      onOpen={onOpen}
      testId="card-consultation_done"
    />
  );
}

export function OpenEngagementCard({
  summary,
  loading,
  onOpen,
}: {
  summary: CommandAudienceSplitSummary | null;
  loading?: boolean;
  onOpen: () => void;
}) {
  return (
    <AudienceSplitMetricCard
      title="Open engagement"
      icon={Tent}
      summary={summary}
      loading={loading}
      onOpen={onOpen}
      testId="card-open_engagement"
    />
  );
}

/** Soft tints matching supershyft-command warning/success opacity style */
const TICKET_SLICES = [
  {
    id: "open",
    label: "Open",
    tint: "border-amber-500/30 bg-amber-500/[0.10]",
    dot: "bg-amber-500",
  },
  {
    id: "solved",
    label: "Solved",
    tint: "border-emerald-500/25 bg-emerald-500/[0.10]",
    dot: "bg-emerald-600",
  },
] as const;

export function TicketsCard({
  summary,
  loading,
  onOpen,
}: {
  summary?: CommandTicketsSummary | null;
  loading?: boolean;
  onOpen?: () => void;
}) {
  const open = summary?.open ?? 0;
  const solved = summary?.solved ?? 0;
  const total = summary?.total ?? open + solved;
  const clickable = typeof onOpen === "function";
  return (
    <MetricCard
      title="Tickets"
      icon={Ticket}
      description={
        loading ? (
          <span className="text-zinc-400">Loading…</span>
        ) : (
          <>
            <span className="tabular-nums" data-testid="tickets-raised-total">
              {total}
            </span>{" "}
            raised
          </>
        )
      }
      variant="panel"
      clickable={clickable}
      onClick={onOpen}
      showViewAll={clickable}
      bodyClassName="items-stretch p-0 overflow-hidden"
      data-testid="card-tickets"
    >
      {loading ? (
        <div className="flex h-full items-center justify-center p-2.5">
          <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
        </div>
      ) : (
        <div className="grid h-full min-h-0 w-full grid-cols-2 items-stretch gap-2 p-2.5">
          {TICKET_SLICES.map((s) => (
            <div
              key={s.id}
              className={`flex min-h-0 min-w-0 items-center justify-between gap-2 overflow-hidden rounded-lg border px-2.5 py-2 ${s.tint}`}
              data-testid={`tickets-slice-${s.id}`}
            >
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span className={`size-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="shrink-0 text-lg font-semibold tabular-nums leading-none text-zinc-900">
                {s.id === "open" ? open : solved}
              </span>
            </div>
          ))}
        </div>
      )}
    </MetricCard>
  );
}

/**
 * Soft pastels matched to design screenshot / command info·danger·warning tones.
 * Explicit hex avoids Tailwind opacity utility quirks.
 */
const ACTION_TILE_TONES: Record<ActionSubcardId, string> = {
  upcoming_collections: "border-[#C5D0E0] bg-[#EEF2F7]",
  overdue_collections: "border-[#F5C2C2] bg-[#FEF2F2]",
  questionnaire_pending: "border-[#E8C9A0] bg-[#FFF7ED]",
  blood_reports_pending: "border-[#E8C9A0] bg-[#FFF7ED]",
  bio_ai_pending: "border-[#E8C9A0] bg-[#FFF7ED]",
  consultation_pending: "border-[#C5D0E0] bg-[#EEF2F7]",
};

export type ActionCenterCounts = Partial<Record<ActionSubcardId, number | null>>;

export function ActionCenterCard({
  counts,
  loading,
  onOpenSubcard,
}: {
  counts?: ActionCenterCounts;
  loading?: boolean;
  onOpenSubcard?: (id: ActionSubcardId) => void;
}) {
  return (
    <MetricCard
      title="Action Center"
      icon={ListTodo}
      variant="panel"
      bodyClassName="items-stretch p-0 overflow-hidden"
      data-testid="card-action_center"
    >
      {/* gap-3 ≈ 12px between tiles; p-3 outer inset — matches design gutters */}
      <div className="grid w-full grid-cols-3 gap-3 p-3">
        {ACTION_SUBCARD_ORDER.map((tile) => {
          const tone = ACTION_TILE_TONES[tile.id];
          const value = counts?.[tile.id];
          const display =
            loading || value == null ? "—" : value.toLocaleString();
          return (
            <button
              key={tile.id}
              type="button"
              data-testid={`action-tile-${tile.id}`}
              onClick={() => onOpenSubcard?.(tile.id)}
              className={`flex min-h-[4.75rem] flex-col justify-center gap-1.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${tone}`}
            >
              <span className="text-xs font-medium leading-tight text-zinc-600">
                {tile.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums leading-none text-zinc-900">
                {display}
              </span>
            </button>
          );
        })}
      </div>
    </MetricCard>
  );
}

export function PlaceholderCard({ title, id }: { title: string; id: string }) {
  return (
    <MetricCard title={title} variant={variantFor(id)} data-testid={`card-${id}`}>
      <div className="w-full text-xs text-zinc-400" aria-hidden>
        {/* reserved */}
      </div>
    </MetricCard>
  );
}
