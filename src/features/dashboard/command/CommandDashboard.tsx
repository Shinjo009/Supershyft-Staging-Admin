import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  commandDashboardApi,
  getApiError,
  serverHealthApi,
  type CommandAudienceSplitSummary,
  type CommandNotificationHealth,
  type CommandTicketsSummary,
} from "../../../lib/api";
import { B2BGrid } from "./B2BGrid";
import { BioaiReportGeneratedDetail } from "./BioaiReportGeneratedDetail";
import { BloodReportGeneratedDetail } from "./BloodReportGeneratedDetail";
import { ConsultationDoneDetail } from "./ConsultationDoneDetail";
import { NotificationHealthDetail } from "./NotificationHealthDetail";
import { OpenEngagementDetail } from "./OpenEngagementDetail";
import { OverviewGrid } from "./OverviewGrid";
import { PeriodFilter } from "./PeriodFilter";
import { PeopleRegisteredDetail } from "./PeopleRegisteredDetail";
import { QuestionnaireDoneDetail } from "./QuestionnaireDoneDetail";
import { TabBar } from "./TabBar";
import { TestsCompletedDetail } from "./TestsCompletedDetail";
import { TicketsDetail } from "./TicketsDetail";
import {
  DEFAULT_PERIOD,
  cardInteraction,
  normalizeCard,
  normalizePeriod,
  normalizeTab,
  type CardId,
  type DashboardTab,
  type PeriodPreset,
} from "./period";

function buildPeriodParams(
  period: PeriodPreset,
  from: string | null,
  to: string | null
) {
  if (period === "custom" && from && to) {
    return { period, from, to };
  }
  return { period };
}

function splitFromMeta(meta?: { total?: number; b2b?: number; b2c?: number } | null) {
  return {
    total: meta?.total ?? 0,
    b2b: meta?.b2b ?? 0,
    b2c: meta?.b2c ?? 0,
  };
}

export function CommandDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const rawPeriod = searchParams.get("period");
  const rawCard = searchParams.get("card");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const tab = normalizeTab(rawTab);
  const period = normalizePeriod(rawPeriod);
  const card = normalizeCard(rawCard, tab);

  // Normalize URL defaults / invalid values once they diverge
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    if (rawTab !== tab) {
      next.set("tab", tab);
      changed = true;
    }
    if (rawPeriod !== period) {
      next.set("period", period);
      changed = true;
    }
    if (period !== "custom") {
      if (next.has("from") || next.has("to")) {
        next.delete("from");
        next.delete("to");
        changed = true;
      }
    }
    if (rawCard && !card) {
      next.delete("card");
      changed = true;
    }

    if (changed) setSearchParams(next, { replace: true });
    // Intentionally depend on raw query pieces, not the whole searchParams object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTab, rawPeriod, rawCard, tab, period, card, from, to, setSearchParams]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === "") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setTab = (nextTab: DashboardTab) => {
    updateParams({ tab: nextTab, card: null });
  };

  const setPeriod = (nextPeriod: PeriodPreset) => {
    updateParams({
      period: nextPeriod,
      from: null,
      to: null,
    });
  };

  const setCustom = (nextFrom: string, nextTo: string) => {
    updateParams({
      period: "custom",
      from: nextFrom,
      to: nextTo,
    });
  };

  const openCard = (id: CardId, owningTab: DashboardTab = tab) => {
    updateParams({ card: id, tab: owningTab });
  };

  const closeCard = () => {
    updateParams({ card: null });
  };

  const periodParams = useMemo(
    () => buildPeriodParams(period, from, to),
    [period, from, to]
  );

  const [server, setServer] = useState<{
    cpu: number | null;
    memory: number | null;
    storage: number | null;
  }>({ cpu: null, memory: null, storage: null });
  const [loadingServer, setLoadingServer] = useState(true);
  const [notif, setNotif] = useState<CommandNotificationHealth | null>(null);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [peopleTotal, setPeopleTotal] = useState<number | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [testsSummary, setTestsSummary] = useState<CommandAudienceSplitSummary | null>(
    null
  );
  const [loadingTests, setLoadingTests] = useState(true);
  const [questionnaireSummary, setQuestionnaireSummary] =
    useState<CommandAudienceSplitSummary | null>(null);
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(true);
  const [bloodReportSummary, setBloodReportSummary] =
    useState<CommandAudienceSplitSummary | null>(null);
  const [loadingBloodReport, setLoadingBloodReport] = useState(true);
  const [bioaiReportSummary, setBioaiReportSummary] =
    useState<CommandAudienceSplitSummary | null>(null);
  const [loadingBioaiReport, setLoadingBioaiReport] = useState(true);
  const [consultationDoneSummary, setConsultationDoneSummary] =
    useState<CommandAudienceSplitSummary | null>(null);
  const [loadingConsultationDone, setLoadingConsultationDone] = useState(true);
  const [openEngagementSummary, setOpenEngagementSummary] =
    useState<CommandAudienceSplitSummary | null>(null);
  const [loadingOpenEngagement, setLoadingOpenEngagement] = useState(true);
  const [ticketsSummary, setTicketsSummary] = useState<CommandTicketsSummary | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingServer(true);
    serverHealthApi
      .current()
      .then((res) => {
        if (cancelled) return;
        const metrics = res.data.data?.latest_metrics;
        const run = res.data.data?.run;
        setServer({
          cpu: metrics?.cpu_usage ?? run?.cpu_pct ?? null,
          memory: metrics?.memory_usage ?? run?.mem_pct ?? null,
          storage: metrics?.storage_usage ?? run?.storage_pct ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError((prev) => prev ?? getApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingServer(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "overview") return;
    let cancelled = false;
    setLoadingNotif(true);
    setLoadingPeople(true);
    setLoadingTests(true);
    setLoadingQuestionnaire(true);
    setLoadingBloodReport(true);
    setLoadingBioaiReport(true);
    setLoadingConsultationDone(true);
    setLoadingOpenEngagement(true);
    setLoadingTickets(true);

    const summaryParams = {
      ...periodParams,
      include_rows: false as const,
      page: 1,
      limit: 1,
    };

    Promise.all([
      commandDashboardApi.notificationHealth(periodParams),
      commandDashboardApi.peopleRegistered(summaryParams),
      commandDashboardApi.testsCompleted(summaryParams),
      commandDashboardApi.questionnaireDone(summaryParams),
      commandDashboardApi.bloodReportGenerated(summaryParams),
      commandDashboardApi.bioaiReportGenerated(summaryParams),
      commandDashboardApi.consultationDone(summaryParams),
      commandDashboardApi.openEngagements(summaryParams),
      commandDashboardApi.tickets(summaryParams),
    ])
      .then(
        ([
          notifRes,
          peopleRes,
          testsRes,
          questRes,
          bloodRes,
          bioaiRes,
          consultRes,
          openRes,
          ticketsRes,
        ]) => {
          if (cancelled) return;
          setNotif(notifRes.data.data);
          setPeopleTotal(peopleRes.data.meta?.total ?? 0);
          setTestsSummary(splitFromMeta(testsRes.data.meta));
          setQuestionnaireSummary(splitFromMeta(questRes.data.meta));
          setBloodReportSummary(splitFromMeta(bloodRes.data.meta));
          setBioaiReportSummary(splitFromMeta(bioaiRes.data.meta));
          setConsultationDoneSummary(splitFromMeta(consultRes.data.meta));
          setOpenEngagementSummary(splitFromMeta(openRes.data.meta));
          setTicketsSummary({
            open: ticketsRes.data.meta?.open ?? 0,
            solved: ticketsRes.data.meta?.solved ?? 0,
            total: ticketsRes.data.meta?.total ?? 0,
          });
          setLoadError(null);
        }
      )
      .catch((err) => {
        if (cancelled) return;
        setLoadError(getApiError(err));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingNotif(false);
          setLoadingPeople(false);
          setLoadingTests(false);
          setLoadingQuestionnaire(false);
          setLoadingBloodReport(false);
          setLoadingBioaiReport(false);
          setLoadingConsultationDone(false);
          setLoadingOpenEngagement(false);
          setLoadingTickets(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, periodParams.period, periodParams.from, periodParams.to]);

  const interaction = cardInteraction(card);
  const showTabs = !(card && interaction === "new_page");

  return (
    <div className="min-w-0 space-y-4" data-testid="command-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showTabs ? (
          <TabBar active={tab} onChange={setTab} />
        ) : (
          <div data-testid="tabs-hidden" aria-hidden className="h-9" />
        )}
        <PeriodFilter
          period={period || DEFAULT_PERIOD}
          from={from}
          to={to}
          onPeriodChange={setPeriod}
          onCustomApply={setCustom}
        />
      </div>

      {loadError && tab === "overview" && interaction !== "new_page" ? (
        <p className="text-sm text-amber-700" role="status">
          {loadError}
        </p>
      ) : null}

      {tab === "b2b" ? (
        <B2BGrid
          periodParams={periodParams}
          selectedCard={card}
          onOpenCard={(id) => openCard(id, "b2b")}
        />
      ) : card === "notification_health" ? (
        <NotificationHealthDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "people_registered" ? (
        <PeopleRegisteredDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "tests_completed" ? (
        <TestsCompletedDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "questionnaire_done" ? (
        <QuestionnaireDoneDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "blood_report_generated" ? (
        <BloodReportGeneratedDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "bioai_report_generated" ? (
        <BioaiReportGeneratedDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "consultation_done" ? (
        <ConsultationDoneDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "open_engagement" ? (
        <OpenEngagementDetail periodParams={periodParams} onBack={closeCard} />
      ) : card === "tickets" ? (
        <TicketsDetail periodParams={periodParams} onBack={closeCard} />
      ) : (
        <OverviewGrid
          server={server}
          notificationHealth={notif}
          peopleTotal={peopleTotal}
          testsSummary={testsSummary}
          questionnaireSummary={questionnaireSummary}
          bloodReportSummary={bloodReportSummary}
          bioaiReportSummary={bioaiReportSummary}
          consultationDoneSummary={consultationDoneSummary}
          openEngagementSummary={openEngagementSummary}
          ticketsSummary={ticketsSummary}
          loadingServer={loadingServer}
          loadingNotif={loadingNotif}
          loadingPeople={loadingPeople}
          loadingTests={loadingTests}
          loadingQuestionnaire={loadingQuestionnaire}
          loadingBloodReport={loadingBloodReport}
          loadingBioaiReport={loadingBioaiReport}
          loadingConsultationDone={loadingConsultationDone}
          loadingOpenEngagement={loadingOpenEngagement}
          loadingTickets={loadingTickets}
          onOpenCard={(id) => openCard(id, "overview")}
        />
      )}
    </div>
  );
}
