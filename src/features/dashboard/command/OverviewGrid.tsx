import type {
  CommandAudienceSplitSummary,
  CommandNotificationHealth,
  CommandTicketsSummary,
} from "../../../lib/api";
import {
  BioaiReportGeneratedCard,
  BloodReportGeneratedCard,
  ConsultationDoneCard,
  NotificationHealthCard,
  OpenEngagementCard,
  PeopleRegisteredCard,
  PlaceholderCard,
  QuestionnaireDoneCard,
  ServerLoadCard,
  TestsCompletedCard,
  TicketsCard,
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
  testsSummary,
  questionnaireSummary,
  bloodReportSummary,
  bioaiReportSummary,
  consultationDoneSummary,
  openEngagementSummary,
  ticketsSummary,
  loadingServer,
  loadingNotif,
  loadingPeople,
  loadingTests,
  loadingQuestionnaire,
  loadingBloodReport,
  loadingBioaiReport,
  loadingConsultationDone,
  loadingOpenEngagement,
  loadingTickets,
  onOpenCard,
}: {
  server: { cpu: number | null; memory: number | null; storage: number | null };
  notificationHealth: CommandNotificationHealth | null;
  peopleTotal: number | null;
  testsSummary: CommandAudienceSplitSummary | null;
  questionnaireSummary: CommandAudienceSplitSummary | null;
  bloodReportSummary: CommandAudienceSplitSummary | null;
  bioaiReportSummary: CommandAudienceSplitSummary | null;
  consultationDoneSummary: CommandAudienceSplitSummary | null;
  openEngagementSummary: CommandAudienceSplitSummary | null;
  ticketsSummary: CommandTicketsSummary | null;
  loadingServer?: boolean;
  loadingNotif?: boolean;
  loadingPeople?: boolean;
  loadingTests?: boolean;
  loadingQuestionnaire?: boolean;
  loadingBloodReport?: boolean;
  loadingBioaiReport?: boolean;
  loadingConsultationDone?: boolean;
  loadingOpenEngagement?: boolean;
  loadingTickets?: boolean;
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
    if (id === "tests_completed") {
      return (
        <TestsCompletedCard
          key={id}
          summary={testsSummary}
          loading={loadingTests}
          onOpen={() => onOpenCard("tests_completed")}
        />
      );
    }
    if (id === "questionnaire_done") {
      return (
        <QuestionnaireDoneCard
          key={id}
          summary={questionnaireSummary}
          loading={loadingQuestionnaire}
          onOpen={() => onOpenCard("questionnaire_done")}
        />
      );
    }
    if (id === "blood_report_generated") {
      return (
        <BloodReportGeneratedCard
          key={id}
          summary={bloodReportSummary}
          loading={loadingBloodReport}
          onOpen={() => onOpenCard("blood_report_generated")}
        />
      );
    }
    if (id === "bioai_report_generated") {
      return (
        <BioaiReportGeneratedCard
          key={id}
          summary={bioaiReportSummary}
          loading={loadingBioaiReport}
          onOpen={() => onOpenCard("bioai_report_generated")}
        />
      );
    }
    if (id === "consultation_done") {
      return (
        <ConsultationDoneCard
          key={id}
          summary={consultationDoneSummary}
          loading={loadingConsultationDone}
          onOpen={() => onOpenCard("consultation_done")}
        />
      );
    }
    if (id === "open_engagement") {
      return (
        <OpenEngagementCard
          key={id}
          summary={openEngagementSummary}
          loading={loadingOpenEngagement}
          onOpen={() => onOpenCard("open_engagement")}
        />
      );
    }
    if (id === "tickets") {
      return (
        <TicketsCard
          key={id}
          summary={ticketsSummary}
          loading={loadingTickets}
          onOpen={() => onOpenCard("tickets")}
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
