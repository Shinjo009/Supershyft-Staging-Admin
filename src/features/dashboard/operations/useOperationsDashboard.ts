import { useCallback, useEffect, useState } from "react";
import { usePermissions } from "../../../contexts/PermissionContext";
import { dashboardApi, getApiError, type DashboardOverviewPayload } from "../../../lib/api";
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

function bucketIssues(
  issues: DashboardOverviewPayload["operations"]["participant_issues"],
  totalParticipants: number
): ParticipantIssueBuckets {
  return {
    totalParticipants,
    missingBloodSlot: issues.filter((issue) => issue.issue_type === "missing_blood_slot"),
    missingQuestionnaire: issues.filter((issue) => issue.issue_type === "missing_questionnaire"),
    missingBloodReport: issues.filter((issue) => issue.issue_type === "missing_blood_report"),
    missingBioAiReport: issues.filter((issue) => issue.issue_type === "missing_bio_ai_report"),
  };
}

function mapOverviewToSnapshot(
  data: DashboardOverviewPayload,
  flags: {
    showEngagements: boolean;
    showParticipants: boolean;
    showPayments: boolean;
    showNotifications: boolean;
    showTickets: boolean;
    showBookingIssues: boolean;
  }
): OperationsSnapshot {
  const ops = data.operations;
  const ticketCounts = data.ticket_counts ?? { open: 0, resolved: 0, closed: 0 };

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
        data: bucketIssues(ops.participant_issues, data.engagement_participants_total ?? 0),
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

  const notifications: SectionState<DashboardOverviewPayload["operations"]["failed_notifications"]> =
    flags.showNotifications
      ? { status: "ready", data: ops.failed_notifications }
      : { status: "idle" };

  const tickets: SectionState<TicketBuckets> = flags.showTickets
    ? {
        status: "ready",
        data: {
          open: ops.tickets.open,
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
    paymentStatusTotals,
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
  const [usersGrowth, setUsersGrowth] = useState<MonthPoint[]>([]);
  const [usersLoading, setUsersLoading] = useState(showUsers);

  const load = useCallback(async () => {
    setOverviewError(null);
    if (showUsers) setUsersLoading(true);
    try {
      const response = await dashboardApi.overview();
      const data = response.data.data;
      setOverview(data);
      const yearlyRows = Array.isArray(data.users?.yearly_totals) ? data.users.yearly_totals : [];
      setUsersGrowth(
        yearlyRows.map((row) => ({
          key: String(row.year),
          label: String(row.year),
          value: Number(row.total_users) || 0,
          count: row.new_users != null ? Number(row.new_users) : undefined,
        }))
      );
      setSnapshot(
        mapOverviewToSnapshot(data, {
          showEngagements,
          showParticipants,
          showPayments,
          showNotifications,
          showTickets,
          showBookingIssues,
        })
      );
    } catch (reason) {
      const message = getApiError(reason);
      setOverviewError(message);
      setOverview(null);
      setUsersGrowth([]);
      const errorSection = { status: "error" as const, message };
      setSnapshot({
        engagements: showEngagements ? errorSection : { status: "idle" },
        participants: showParticipants ? errorSection : { status: "idle" },
        payments: showPayments ? errorSection : { status: "idle" },
        paymentStatusTotals: showPayments ? errorSection : { status: "idle" },
        notifications: showNotifications ? errorSection : { status: "idle" },
        tickets: showTickets ? errorSection : { status: "idle" },
        bookingIssues: showBookingIssues ? errorSection : { status: "idle" },
      });
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
    usersStats: {
      show: showUsers,
      total: overview?.users?.total_users ?? null,
      active: overview?.users?.active_users ?? null,
      growth: usersGrowth,
      loading: usersLoading,
      error: overviewError,
    },
  };
}
