import type { CommandNotificationHealth } from "../../../lib/api";
import {
  NotificationHealthCard,
  PeopleRegisteredCard,
  PlaceholderCard,
  ServerLoadCard,
} from "./cards";
import { OVERVIEW_CARD_ORDER, WIRED_CARDS, type CardId } from "./period";

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
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      data-testid="overview-grid"
    >
      {OVERVIEW_CARD_ORDER.map((card) => {
        if (card.id === "server_load") {
          return (
            <ServerLoadCard
              key={card.id}
              cpu={server.cpu}
              memory={server.memory}
              storage={server.storage}
              loading={loadingServer}
            />
          );
        }
        if (card.id === "notification_health") {
          return (
            <NotificationHealthCard
              key={card.id}
              data={notificationHealth}
              loading={loadingNotif}
              onOpen={() => onOpenCard("notification_health")}
            />
          );
        }
        if (card.id === "people_registered") {
          return (
            <PeopleRegisteredCard
              key={card.id}
              total={peopleTotal}
              loading={loadingPeople}
              onOpen={() => onOpenCard("people_registered")}
            />
          );
        }
        if (!WIRED_CARDS.has(card.id)) {
          return <PlaceholderCard key={card.id} id={card.id} title={card.title} />;
        }
        return null;
      })}
    </div>
  );
}
