import type { CommandNotificationHealth } from "../../../lib/api";
import {
  NotificationHealthCard,
  PeopleRegisteredCard,
  PlaceholderCard,
  ServerLoadCard,
} from "./cards";
import { OVERVIEW_CARD_ORDER, WIRED_CARDS, type CardId } from "./period";

const FEATURE_IDS: CardId[] = ["server_load", "notification_health", "booking_issues"];
const METRIC_IDS: CardId[] = [
  "people_registered",
  "tests_completed",
  "questionnaire_done",
  "blood_report_generated",
  "bioai_report_generated",
  "consultation_done",
  "open_engagement",
];

function cardMeta(id: CardId) {
  return OVERVIEW_CARD_ORDER.find((c) => c.id === id)!;
}

export function OverviewGrid({
  server,
  notificationHealth,
  peopleTotal,
  loadingServer,
  loadingNotif,
  loadingPeople,
  onOpenCard,
}: {
  server: { cpu: number | null; memory: number | null; storage: number | null };
  notificationHealth: CommandNotificationHealth | null;
  peopleTotal: number | null;
  loadingServer?: boolean;
  loadingNotif?: boolean;
  loadingPeople?: boolean;
  onOpenCard: (id: CardId) => void;
}) {
  const renderCard = (id: CardId) => {
    const meta = cardMeta(id);
    if (id === "server_load") {
      return (
        <ServerLoadCard
          key={id}
          cpu={server.cpu}
          memory={server.memory}
          storage={server.storage}
          loading={loadingServer}
        />
      );
    }
    if (id === "notification_health") {
      return (
        <NotificationHealthCard
          key={id}
          data={notificationHealth}
          loading={loadingNotif}
          onOpen={() => onOpenCard("notification_health")}
        />
      );
    }
    if (id === "people_registered") {
      return (
        <PeopleRegisteredCard
          key={id}
          total={peopleTotal}
          loading={loadingPeople}
          onOpen={() => onOpenCard("people_registered")}
        />
      );
    }
    if (!WIRED_CARDS.has(id)) {
      return <PlaceholderCard key={id} id={id} title={meta.title} />;
    }
    return null;
  };

  return (
    <div className="space-y-3" data-testid="overview-grid">
      {/* Top row — three equal feature cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{FEATURE_IDS.map(renderCard)}</div>

      {/* Bottom — metric tiles (3/5) + tickets / action stack (2/5) */}
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:col-span-3">
          {METRIC_IDS.map(renderCard)}
        </div>
        {/* Tickets compact; Action Center content-sized (tiles keep design proportions) */}
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-2">
          <div className="h-[6.75rem] shrink-0">{renderCard("tickets")}</div>
          <div className="shrink-0">{renderCard("action_center")}</div>
        </div>
      </div>
    </div>
  );
}
