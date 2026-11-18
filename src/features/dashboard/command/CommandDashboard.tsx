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
import { ActionCenterDetail } from "./ActionCenterDetail";
import { B2BGrid } from "./B2BGrid";
import { B2CPanel } from "./B2CPanel";
import { BioaiReportGeneratedDetail } from "./BioaiReportGeneratedDetail";
import { BloodReportGeneratedDetail } from "./BloodReportGeneratedDetail";
import type { ActionCenterCounts } from "./cards";
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
  normalizeSubTab,
  normalizeSubcard,
  normalizeTab,
  type ActionSubcardId,
  type B2CSubTab,
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

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function CommandDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const rawPeriod = searchParams.get("period");
  const rawCard = searchParams.get("card");
  const rawSubcard = searchParams.get("subcard");
  const rawSubTab = searchParams.get("sub_tab");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rawPackageId = searchParams.get("package_id");
  const rawDiscountCodeId = searchParams.get("discount_code_id");

  const tab = normalizeTab(rawTab);
  const period = normalizePeriod(rawPeriod);
  const card = normalizeCard(rawCard, tab);
  const subTab = normalizeSubTab(rawSubTab, tab);
  const subcard = card === "action_center" ? normalizeSubcard(rawSubcard) : null;
  const packageId = parsePositiveInt(rawPackageId);
  const discountCodeId = parsePositiveInt(rawDiscountCodeId);

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
      next.delete("subcard");
      next.delete("package_id");
      next.delete("discount_code_id");
      changed = true;
    }
    // action_center requires a valid subcard; otherwise drop both
    if (card === "action_center" && !subcard) {
      next.delete("card");
      next.delete("subcard");
      changed = true;
    }
    // stray subcard without action_center card
    if (rawSubcard && card !== "action_center") {
      next.delete("subcard");
      changed = true;
    }
    // invalid subcard value while on action_center
    if (card === "action_center" && rawSubcard && !normalizeSubcard(rawSubcard)) {
      next.delete("card");
      next.delete("subcard");
      changed = true;
    }

    if (tab === "b2c") {
      if (rawSubTab !== subTab) {
        next.set("sub_tab", subTab);
        changed = true;
      }
      if (card !== "package_performance" && next.has("package_id")) {
        next.delete("package_id");
        changed = true;
      }
      if (card !== "coupon_usage" && next.has("discount_code_id")) {
        next.delete("discount_code_id");
        changed = true;
      }
      if (card === "package_performance" && !packageId) {
        next.delete("package_id");
        next.delete("card");
        changed = true;
      }
      if (card === "coupon_usage" && !discountCodeId) {
        next.delete("discount_code_id");
        next.delete("card");
        changed = true;
      }
    } else {
      if (next.has("sub_tab")) {
        next.delete("sub_tab");
        changed = true;
      }
      if (next.has("package_id")) {
        next.delete("package_id");
        changed = true;
      }
      if (next.has("discount_code_id")) {
        next.delete("discount_code_id");
        changed = true;
      }
    }

    if (changed) setSearchParams(next, { replace: true });
    // Intentionally depend on raw query pieces, not the whole searchParams object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rawTab,
    rawPeriod,
    rawCard,
    rawSubcard,
    rawSubTab,
    rawPackageId,
    rawDiscountCodeId,
    tab,
    period,
    card,
    subcard,
    subTab,
    packageId,
    discountCodeId,
    from,
    to,
    setSearchParams,
  ]);

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
    updateParams({
      tab: nextTab,
      card: null,
      subcard: null,
      package_id: null,
      discount_code_id: null,
      sub_tab: nextTab === "b2c" ? "overview" : null,
    });
  };

  const setSubTab = (next: B2CSubTab) => {
    updateParams({
      sub_tab: next,
      card: null,
      package_id: null,
      discount_code_id: null,
    });
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
    updateParams({
      card: id,
      tab: owningTab,
      subcard: null,
      package_id: null,
      discount_code_id: null,
      ...(owningTab === "b2c" ? { sub_tab: "overview" } : {}),
    });
  };

  const openPackage = (id: number) => {
    updateParams({
      tab: "b2c",
      sub_tab: "overview",
      card: "package_performance",
      package_id: String(id),
      discount_code_id: null,
      subcard: null,
    });
  };

  const openCoupon = (id: number) => {
    updateParams({
      tab: "b2c",
      sub_tab: "overview",
      card: "coupon_usage",
      discount_code_id: String(id),
      package_id: null,
      subcard: null,
    });
  };

  const openSubcard = (id: ActionSubcardId) => {
    updateParams({
      tab: "overview",
      card: "action_center",
      subcard: id,
    });
  };

  const closeCard = () => {
    updateParams({ card: null, subcard: null, package_id: null, discount_code_id: null });
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
  const [actionCenterCounts, setActionCenterCounts] = useState<ActionCenterCounts>({});
  const [loadingActionCenter, setLoadingActionCenter] = useState(true);
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
    setLoadingActionCenter(true);

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
      commandDashboardApi.upcomingCollections(summaryParams),
      commandDashboardApi.overdueCollections(summaryParams),
      commandDashboardApi.questionnairePending(summaryParams),
      commandDashboardApi.bloodReportsPending(summaryParams),
      commandDashboardApi.bioaiPending(summaryParams),
      commandDashboardApi.consultationPending(summaryParams),
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
          upcomingRes,
          overdueRes,
          questPendingRes,
          bloodPendingRes,
          bioaiPendingRes,
          consultPendingRes,
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
          setActionCenterCounts({
            upcoming_collections: upcomingRes.data.meta?.total ?? 0,
            overdue_collections: overdueRes.data.meta?.total ?? 0,
            questionnaire_pending: questPendingRes.data.meta?.total ?? 0,
            blood_reports_pending: bloodPendingRes.data.meta?.total ?? 0,
            bio_ai_pending: bioaiPendingRes.data.meta?.total ?? 0,
            consultation_pending: consultPendingRes.data.meta?.total ?? 0,
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
          setLoadingActionCenter(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, periodParams.period, periodParams.from, periodParams.to]);

  const interaction = cardInteraction(card, tab);
  const showTabs = !(card && interaction === "new_page");
  const showPeriod = !(tab === "b2c" && subTab === "users" && !card);

  return (
    <div className="min-w-0 space-y-4" data-testid="command-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showTabs ? (
          <TabBar active={tab} onChange={setTab} />
        ) : (
          <div data-testid="tabs-hidden" aria-hidden className="h-9" />
        )}
        {showPeriod ? (
          <PeriodFilter
            period={period || DEFAULT_PERIOD}
            from={from}
            to={to}
            onPeriodChange={setPeriod}
            onCustomApply={setCustom}
          />
        ) : (
          <div data-testid="period-hidden" aria-hidden className="h-9" />
        )}
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
      ) : tab === "b2c" ? (
        <B2CPanel
          subTab={subTab}
          card={card}
          packageId={packageId}
          discountCodeId={discountCodeId}
          periodParams={periodParams}
          onSubTabChange={setSubTab}
          onOpenCard={(id) => openCard(id, "b2c")}
          onOpenPackage={openPackage}
          onOpenCoupon={openCoupon}
          onBack={closeCard}
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
      ) : card === "action_center" && subcard ? (
        <ActionCenterDetail
          subcard={subcard}
          periodParams={periodParams}
          onBack={closeCard}
        />
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
          actionCenterCounts={actionCenterCounts}
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
          loadingActionCenter={loadingActionCenter}
          onOpenCard={(id) => openCard(id, "overview")}
          onOpenSubcard={openSubcard}
        />
      )}
    </div>
  );
}
