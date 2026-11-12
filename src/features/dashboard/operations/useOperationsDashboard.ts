import { useCallback, useEffect, useState } from "react";
import { usePermissions } from "../../../contexts/PermissionContext";
import {
  dashboardApi,
  getApiError,
  usersApi,
  type DashboardOperationsBlock,
  type DashboardOverviewKpisPayload,
  type DashboardOverviewPayload,
} from "../../../lib/api";
import type { MonthPoint } from "./overviewChartUtils";
import type {
  EngagementBuckets,
  OperationsSnapshot,
  ParticipantIssueBuckets,
  PaymentStatusTotals,
  PendingPaymentRow,
  SectionState,
  ServiceabilityIssueRow,
  TicketBuckets,
} from "./operationsTypes";

const LOADING = { status: "loading" } as const;

const EMPTY_OPERATIONS: DashboardOperationsBlock = {
  engagements: {
    running_today: [],
    running_this_week: [],
    org_names: {},
    truncated: false,
  },
  participant_issues: [],
  participant_issue_summary: null,
  pending_payments: [],
  failed_notifications: [],
  tickets: { open: [] },
  serviceability_issues: [],
};

function mapParticipantIssueSummary(
  raw: DashboardOperationsBlock["participant_issue_summary"]
): ParticipantIssueBuckets["summary"] {
  if (!raw) return null;
  return {
    participantsInScope: raw.participants_in_scope ?? 0,
    engagementsInScope: raw.engagements_in_scope ?? 0,
    limitReached: Boolean(raw.limit_reached),
    missingBloodSlot: raw.missing_blood_slot ?? 0,
    missingQuestionnaire: raw.missing_questionnaire ?? 0,
    missingBloodReport: raw.missing_blood_report ?? 0,
    missingBioAiReport: raw.missing_bio_ai_report ?? 0,
  };
}

function bucketIssues(
  issues: DashboardOperationsBlock["participant_issues"],
  totalParticipants: number,
  summary: ParticipantIssueBuckets["summary"]
): ParticipantIssueBuckets {
  return {
    totalParticipants,
    summary,
    missingBloodSlot: issues.filter((issue) => issue.issue_type === "missing_blood_slot"),
    missingQuestionnaire: issues.filter((issue) => issue.issue_type === "missing_questionnaire"),
    missingBloodReport: issues.filter((issue) => issue.issue_type === "missing_blood_report"),
    missingBioAiReport: issues.filter((issue) => issue.issue_type === "missing_bio_ai_report"),
  };
}

function usersGrowthFromKpis(data: DashboardOverviewKpisPayload): MonthPoint[] {
  const monthlyRows = Array.isArray(data.users?.monthly_totals) ? data.users.monthly_totals : [];
  const yearlyRows = Array.isArray(data.users?.yearly_totals) ? data.users.yearly_totals : [];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (monthlyRows.length > 0) {
    return monthlyRows.map((row) => ({
      key: `${row.year}-${row.month}`,
      label: monthLabels[(Number(row.month) || 1) - 1] ?? String(row.month),
      value: Number(row.total_users) || 0,
      count: row.new_users != null ? Number(row.new_users) : undefined,
    }));
  }
  return yearlyRows.map((row) => ({
    key: String(row.year),
    label: String(row.year),
    value: Number(row.total_users) || 0,
    count: row.new_users != null ? Number(row.new_users) : undefined,
  }));
}

function mergeOverview(
  kpis: DashboardOverviewKpisPayload,
  operations: DashboardOperationsBlock
): DashboardOverviewPayload {
  return { ...kpis, operations };
}

function mapKpisToSnapshot(
  data: DashboardOverviewKpisPayload,
  flags: {
    showPayments: boolean;
    showTickets: boolean;
  }
): Pick<OperationsSnapshot, "paymentStatusTotals" | "tickets"> {
  const ticketCounts = data.ticket_counts ?? { open: 0, resolved: 0, closed: 0 };

  const paymentStatusTotals: SectionState<PaymentStatusTotals> = flags.showPayments
    ? {
        status: "ready",
        data: {
          pending: data.payment_status_totals.pending ?? 0,
          confirmed: data.payment_status_totals.confirmed ?? 0,
          cancelled: data.payment_status_totals.cancelled ?? 0,
        },
      }
    : { status: "idle" };

  const tickets: SectionState<TicketBuckets> = flags.showTickets
    ? {
        status: "ready",
        data: {
          open: [],
          openCount: ticketCounts.open ?? 0,
          resolvedCount: ticketCounts.resolved ?? 0,
          closedCount: ticketCounts.closed ?? 0,
        },
      }
    : { status: "idle" };

  return { paymentStatusTotals, tickets };
}

function mapOperationsToSnapshot(
  kpis: DashboardOverviewKpisPayload,
  ops: DashboardOperationsBlock,
  flags: {
    showEngagements: boolean;
    showParticipants: boolean;
    showPayments: boolean;
    showNotifications: boolean;
    showTickets: boolean;
    showBookingIssues: boolean;
  }
): Pick<
  OperationsSnapshot,
  "engagements" | "participants" | "payments" | "notifications" | "tickets" | "bookingIssues"
> {
  const ticketCounts = kpis.ticket_counts ?? { open: 0, resolved: 0, closed: 0 };

  const engagements: SectionState<EngagementBuckets> = flags.showEngagements
    ? {
        status: "ready",
        data: {
          runningToday: ops.engagements.running_today,
          runningThisWeek: ops.engagements.running_this_week,
          orgNames: ops.engagements.org_names,
          truncated: ops.engagements.truncated,
        },
      }
    : { status: "idle" };

  const participants: SectionState<ParticipantIssueBuckets> = flags.showParticipants
    ? {
        status: "ready",
        data: bucketIssues(
          ops.participant_issues,
          kpis.engagement_participants_total ?? 0,
          mapParticipantIssueSummary(ops.participant_issue_summary)
        ),
      }
    : { status: "idle" };

  const payments: SectionState<PendingPaymentRow[]> = flags.showPayments
    ? {
        status: "ready",
        data: ops.pending_payments.map((row) => ({
          ...row,
          pendingMinutes: row.pending_minutes ?? 0,
        })),
      }
    : { status: "idle" };

  const notifications: SectionState<DashboardOperationsBlock["failed_notifications"]> =
    flags.showNotifications ? { status: "ready", data: ops.failed_notifications } : { status: "idle" };

  const tickets: SectionState<TicketBuckets> = flags.showTickets
    ? {
        status: "ready",
        data: {
          open: ops.tickets.open,
          openCount: ticketCounts.open ?? 0,
          resolvedCount: ticketCounts.resolved ?? 0,
          closedCount: ticketCounts.closed ?? 0,
        },
      }
    : { status: "idle" };

  const bookingIssues: SectionState<ServiceabilityIssueRow[]> = flags.showBookingIssues
    ? { status: "ready", data: ops.serviceability_issues }
    : { status: "idle" };

  return {
    engagements,
    participants,
    payments,
    notifications,
    tickets,
    bookingIssues,
  };
}

export function useOperationsDashboard() {
  const { canView } = usePermissions();
  const showEngagements = canView("engagements");
  const showParticipants = canView("engagements") && canView("users");
  const showPayments = canView("payments_bookings");
  const showNotifications = canView("notifications");
  const showTickets = canView("support");
  const showBookingIssues = canView("payments_bookings");
  const showUsers = canView("users");

  const [snapshot, setSnapshot] = useState<OperationsSnapshot>(() => ({
    engagements: showEngagements ? LOADING : { status: "idle" },
    participants: showParticipants ? LOADING : { status: "idle" },
    payments: showPayments ? LOADING : { status: "idle" },
    paymentStatusTotals: showPayments ? LOADING : { status: "idle" },
    notifications: showNotifications ? LOADING : { status: "idle" },
    tickets: showTickets ? LOADING : { status: "idle" },
    bookingIssues: showBookingIssues ? LOADING : { status: "idle" },
  }));
  const [overview, setOverview] = useState<DashboardOverviewPayload | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [operationsError, setOperationsError] = useState<string | null>(null);
  const [usersGrowth, setUsersGrowth] = useState<MonthPoint[]>([]);
  const [usersLoading, setUsersLoading] = useState(showUsers);
  const [usersFallback, setUsersFallback] = useState<{ total: number; active: number } | null>(null);
  const [kpis, setKpis] = useState<DashboardOverviewKpisPayload | null>(null);

  const load = useCallback(async () => {
    setOverviewError(null);
    setOperationsError(null);
    setUsersFallback(null);
    if (showUsers) setUsersLoading(true);

    let latestKpis: DashboardOverviewKpisPayload | null = null;
    let pendingOperations: DashboardOperationsBlock | null = null;

    const applyOperations = (operations: DashboardOperationsBlock) => {
      if (!latestKpis) {
        pendingOperations = operations;
        return;
      }
      setOverview(mergeOverview(latestKpis, operations));
      setSnapshot((prev) => ({
        ...prev,
        ...mapOperationsToSnapshot(latestKpis!, operations, {
          showEngagements,
          showParticipants,
          showPayments,
          showNotifications,
          showTickets,
          showBookingIssues,
        }),
      }));
    };

    void dashboardApi
      .operations()
      .then((response) => {
        applyOperations(response.data.data.operations);
      })
      .catch((reason) => {
        let message = getApiError(reason);
        if (
          message.includes("Network error") ||
          message.includes("timed out") ||
          message.includes("Timeout")
        ) {
          message = `${message} Check API logs for GET /admin/dashboard/operations.`;
        }
        setOperationsError(message);
        const errorSection = { status: "error" as const, message };
        setSnapshot((prev) => ({
          ...prev,
          engagements: showEngagements ? errorSection : prev.engagements,
          participants: showParticipants ? errorSection : prev.participants,
          payments: showPayments ? errorSection : prev.payments,
          notifications: showNotifications ? errorSection : prev.notifications,
          bookingIssues: showBookingIssues ? errorSection : prev.bookingIssues,
          tickets:
            showTickets && prev.tickets.status === "loading" ? errorSection : prev.tickets,
        }));
      });

    try {
      const response = await dashboardApi.overview();
      const data = response.data.data;
      latestKpis = data;
      setKpis(data);
      setUsersGrowth(usersGrowthFromKpis(data));
      setSnapshot((prev) => ({
        ...prev,
        ...mapKpisToSnapshot(data, { showPayments, showTickets }),
      }));
      if (pendingOperations) {
        setOverview(mergeOverview(data, pendingOperations));
        setSnapshot((prev) => ({
          ...prev,
          ...mapOperationsToSnapshot(data, pendingOperations!, {
            showEngagements,
            showParticipants,
            showPayments,
            showNotifications,
            showTickets,
            showBookingIssues,
          }),
        }));
      } else {
        setOverview(mergeOverview(data, EMPTY_OPERATIONS));
      }
    } catch (reason) {
      let message = getApiError(reason);
      if (
        message.includes("Network error") ||
        message.includes("timed out") ||
        message.includes("Timeout")
      ) {
        message = `${message} Check API logs for GET /admin/dashboard/overview.`;
      }
      setOverviewError(message);
      setOverview(null);
      setKpis(null);
      setUsersGrowth([]);
      const errorSection = { status: "error" as const, message };
      setSnapshot({
        paymentStatusTotals: showPayments ? errorSection : { status: "idle" },
        engagements: showEngagements ? errorSection : { status: "idle" },
        participants: showParticipants ? errorSection : { status: "idle" },
        payments: showPayments ? errorSection : { status: "idle" },
        notifications: showNotifications ? errorSection : { status: "idle" },
        tickets: showTickets ? errorSection : { status: "idle" },
        bookingIssues: showBookingIssues ? errorSection : { status: "idle" },
      });

      if (showUsers) {
        try {
          const usersRes = await usersApi.list({ page: 1, limit: 1 });
          const meta = usersRes.data.meta;
          const total = Number(meta.total) || 0;
          let active = total;
          try {
            const activeRes = await usersApi.list({ page: 1, limit: 1, status: "active" });
            active = Number(activeRes.data.meta.total) || 0;
          } catch {
            // keep active = total
          }
          setUsersFallback({ total, active });
        } catch {
          // year-stats cards still load via YearStatsCards
        }
      }
    } finally {
      setUsersLoading(false);
    }
  }, [
    showBookingIssues,
    showEngagements,
    showNotifications,
    showParticipants,
    showPayments,
    showTickets,
    showUsers,
  ]);

  const refetch = useCallback(() => {
    setSnapshot({
      engagements: showEngagements ? LOADING : { status: "idle" },
      participants: showParticipants ? LOADING : { status: "idle" },
      payments: showPayments ? LOADING : { status: "idle" },
      paymentStatusTotals: showPayments ? LOADING : { status: "idle" },
      notifications: showNotifications ? LOADING : { status: "idle" },
      tickets: showTickets ? LOADING : { status: "idle" },
      bookingIssues: showBookingIssues ? LOADING : { status: "idle" },
    });
    void load();
  }, [
    load,
    showBookingIssues,
    showEngagements,
    showNotifications,
    showParticipants,
    showPayments,
    showTickets,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadingAny = Object.values(snapshot).some((section) => section.status === "loading");

  return {
    ...snapshot,
    showEngagements,
    showParticipants,
    showPayments,
    showNotifications,
    showTickets,
    showBookingIssues,
    refetch,
    loadingAny,
    overview,
    overviewError,
    operationsError,
    usersStats: {
      show: showUsers,
      total: kpis?.users?.total_users ?? usersFallback?.total ?? null,
      active: kpis?.users?.active_users ?? usersFallback?.active ?? null,
      growth: usersGrowth,
      loading: usersLoading,
      error: overviewError && usersFallback == null ? overviewError : null,
    },
  };
}
