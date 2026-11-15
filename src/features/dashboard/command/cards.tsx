import { Loader2 } from "lucide-react";
import type { CommandNotificationHealth } from "../../../lib/api";
import { MiniDonut, MiniStat } from "./charts";
import { MetricCard } from "./MetricCard";

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
    <MetricCard title="Server load" data-testid="card-server_load">
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
      clickable
      onClick={onOpen}
      data-testid="card-people_registered"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" aria-label="Loading" />
      ) : (
        <div className="w-full">
          <div className="text-3xl font-semibold tabular-nums text-zinc-900">
            {total ?? 0}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Registrations in selected period</p>
        </div>
      )}
    </MetricCard>
  );
}

export function PlaceholderCard({ title, id }: { title: string; id: string }) {
  return (
    <MetricCard title={title} data-testid={`card-${id}`}>
      <div className="w-full text-xs text-zinc-400" aria-hidden>
        {/* reserved */}
      </div>
    </MetricCard>
  );
}
