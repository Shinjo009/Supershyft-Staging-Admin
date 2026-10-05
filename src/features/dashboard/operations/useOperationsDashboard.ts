import { useCallback, useEffect, useState } from "react";
import { usePermissions } from "../../../contexts/PermissionContext";
import {
  dashboardApi,
  engagementDataCompletenessApi,
  engagementsApi,
  getApiError,
  integrationSyncLogsApi,
  notificationsApi,
  organizationsApi,
  paymentsApi,
  supportApi,
  usersApi,
  type EngagementListItem,
  type IntegrationSyncLog,
  type NotificationItem,
  type ParticipantIssueItem,
  type SupportTicket,
} from "../../../lib/api";
import {
  isPendingOverThreshold,
  pendingMinutes,
  rangesOverlap,
  todayISO,
  weekRangeLocal,
} from "./operationsDateUtils";
import {
  ACTIVE_ENGAGEMENT_STATUS,
  type EngagementBuckets,
  type OperationsSnapshot,
  type ParticipantIssueBuckets,
  type PaymentStatusTotals,
  type PendingPaymentRow,
  type SectionState,
  type ServiceabilityIssueRow,
  type TicketBuckets,
} from "./operationsTypes";

function ticketListCount(response: { data: SupportTicket[]; meta: Record<string, unknown> }): number {
  const total = response.meta?.total;
  if (typeof total === "number" && Number.isFinite(total)) return total;
  return response.data?.length ?? 0;
}

async function bookingStatusTotal(status: string): Promise<number> {
  const response = await paymentsApi.listBookings({
    page: 1,
    limit: 1,
    status,
    sort_key: "booking_id",
    sort_dir: "desc",
  });
  return response.data.data.total ?? 0;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const LOADING = { status: "loading" } as const;

function bucketIssues(
  issues: ParticipantIssueItem[],
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

function payloadRecord(value: IntegrationSyncLog["request_payload"] | IntegrationSyncLog["response_payload"]): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function stringField(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function mapServiceabilityLog(log: IntegrationSyncLog): ServiceabilityIssueRow {
  const request = payloadRecord(log.request_payload);
  const response = payloadRecord(log.response_payload);
  const zipcode = stringField(request, "zipcode");
  const lat = stringField(request, "lat");
  const lng = stringField(request, "long") ?? stringField(request, "lng");
  const locationParts = [
    zipcode ? `Pin ${zipcode}` : null,
    lat && lng ? `${lat}, ${lng}` : null,
  ].filter(Boolean);

  const issueMessage =
    (log.error_message || "").trim() ||
    stringField(response, "message") ||
    "Location is not serviceable";

  return {
    sync_log_id: log.sync_log_id,
    user_id: log.user_id ?? null,
    engagement_id: log.engagement_id ?? null,
    participant_label: log.user_id != null ? `User #${log.user_id}` : "—",
    location_label: locationParts.length > 0 ? locationParts.join(" · ") : "—",
    issue_message: issueMessage,
    engagement_label: log.engagement_id != null ? `#${log.engagement_id}` : "—",
    failed_at: log.created_at,
  };
}

async function listEngagements(params: {
  status: string;
  date?: string;
}): Promise<{ rows: EngagementListItem[]; truncated: boolean }> {
  const rows: EngagementListItem[] = [];
  let page = 1;
  let total = 0;

  while (page <= MAX_PAGES) {
    const response = await engagementsApi.list({
      ...params,
      page,
      limit: PAGE_SIZE,
      sort_by: "start_date",
      sort_dir: "asc",
    });
    const batch = response.data.data ?? [];
    total = response.data.meta.total ?? batch.length;
    rows.push(...batch);
    if (rows.length >= total || batch.length === 0) {
      return { rows, truncated: false };
    }
    page += 1;
  }

  return { rows, truncated: rows.length < total };
}

async function listPendingOverThreshold(): Promise<PendingPaymentRow[]> {
  const rows: PendingPaymentRow[] = [];
  let page = 1;
  let total = 0;

  while (page <= MAX_PAGES) {
    const response = await paymentsApi.listBookings({
      page,
      limit: PAGE_SIZE,
      status: "pending",
      sort_key: "booking_id",
      sort_dir: "desc",
    });
    const batch = response.data.data.items ?? [];
    total = response.data.data.total ?? batch.length;
    for (const booking of batch) {
      if (!isPendingOverThreshold(booking.booked_at)) continue;
      const minutes = pendingMinutes(booking.booked_at);
      if (minutes == null) continue;
      rows.push({ ...booking, pendingMinutes: minutes });
    }
    if (page * PAGE_SIZE >= total || batch.length === 0) break;
    page += 1;
  }

  return rows;
}

async function listFailedNotifications(): Promise<NotificationItem[]> {
  const rows: NotificationItem[] = [];
  let page = 1;
  let total = 0;

  while (page <= MAX_PAGES) {
    const response = await notificationsApi.list({
      page,
      limit: PAGE_SIZE,
      status: "failed",
    });
    const batch = response.data.data ?? [];
    total = response.data.meta.total ?? batch.length;
    rows.push(...batch);
    if (rows.length >= total || batch.length === 0) break;
    page += 1;
  }

  return rows;
}

async function resolveServiceabilityLabels(
  rows: ServiceabilityIssueRow[]
): Promise<ServiceabilityIssueRow[]> {
  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is number => id != null))];
  const engagementIds = [
    ...new Set(rows.map((row) => row.engagement_id).filter((id): id is number => id != null)),
  ];

  const userNames = new Map<number, string>();
  const engagementNames = new Map<number, string>();

  await Promise.all([
    Promise.allSettled(
      userIds.map(async (id) => {
        const response = await usersApi.get(id);
        const user = response.data.data;
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
        userNames.set(id, name || `User #${id}`);
      })
    ),
    Promise.allSettled(
      engagementIds.map(async (id) => {
        const response = await engagementsApi.get(id);
        const engagement = response.data.data;
        const name = (engagement.engagement_name || "").trim();
        engagementNames.set(id, name || `#${id}`);
      })
    ),
  ]);

  return rows.map((row) => ({
    ...row,
    participant_label:
      row.user_id != null ? userNames.get(row.user_id) || `User #${row.user_id}` : "—",
    engagement_label:
      row.engagement_id != null
        ? engagementNames.get(row.engagement_id) || `#${row.engagement_id}`
        : "—",
  }));
}

async function listServiceabilityFailures(): Promise<ServiceabilityIssueRow[]> {
  const rows: ServiceabilityIssueRow[] = [];
  let page = 1;
  let total = 0;

  while (page <= MAX_PAGES) {
    const response = await integrationSyncLogsApi.list({
      page,
      limit: PAGE_SIZE,
      provider: "healthians",
      status: "failed",
      search: "checkServiceabilityByLocation",
    });
    const batch = response.data.data ?? [];
    total = response.data.meta.total ?? batch.length;
    rows.push(...batch.map(mapServiceabilityLog));
    if (rows.length >= total || batch.length === 0) break;
    page += 1;
  }

  return resolveServiceabilityLabels(rows);
}

function keepActive(rows: EngagementListItem[]): EngagementListItem[] {
  return rows.filter((row) => {
    const status = (row.status ?? "").toLowerCase();
    return status === "running" || status === "scheduled";
  });
}

export function useOperationsDashboard() {
  const { canView } = usePermissions();
  const showEngagements = canView("engagements");
  const showParticipants = canView("engagements") && canView("users");
  const showPayments = canView("payments_bookings");
  const showNotifications = canView("notifications");
  const showTickets = canView("support");
  const showBookingIssues = canView("payments_bookings");
  const showOrganizations = canView("organizations");

  const [snapshot, setSnapshot] = useState<OperationsSnapshot>(() => ({
    engagements: showEngagements ? LOADING : { status: "idle" },
    participants: showParticipants ? LOADING : { status: "idle" },
    payments: showPayments ? LOADING : { status: "idle" },
    paymentStatusTotals: showPayments ? LOADING : { status: "idle" },
    notifications: showNotifications ? LOADING : { status: "idle" },
    tickets: showTickets ? LOADING : { status: "idle" },
    bookingIssues: showBookingIssues ? LOADING : { status: "idle" },
  }));

  const load = useCallback(async (): Promise<OperationsSnapshot> => {
    const today = todayISO();
    const week = weekRangeLocal();

    const engagementsPromise = showEngagements
      ? Promise.all([
          listEngagements({ status: ACTIVE_ENGAGEMENT_STATUS, date: today }),
          listEngagements({ status: ACTIVE_ENGAGEMENT_STATUS }),
          showOrganizations
            ? organizationsApi.list({ limit: 100, page: 1 })
            : Promise.resolve(null),
        ]).then(([todayResult, activeResult, orgs]): SectionState<EngagementBuckets> => {
          const orgNames: Record<number, string> = {};
          for (const org of orgs?.data.data ?? []) {
            if (org.name) orgNames[org.organization_id] = org.name;
          }
          const runningToday = keepActive(todayResult.rows);
          const runningThisWeek = keepActive(activeResult.rows).filter((row) =>
            rangesOverlap(row.start_date, row.end_date, week.start, week.end)
          );
          return {
            status: "ready",
            data: {
              runningToday,
              runningThisWeek,
              orgNames,
              truncated: todayResult.truncated || activeResult.truncated,
            },
          };
        })
      : Promise.resolve<SectionState<EngagementBuckets>>({ status: "idle" });

    const participantsPromise = showParticipants
      ? Promise.all([
          engagementDataCompletenessApi.listSummary({
            status: ACTIVE_ENGAGEMENT_STATUS,
            include_participant_issues: true,
            limit: 100,
          }),
          dashboardApi.participantStats(),
        ]).then(
          ([completeness, participantStats]): SectionState<ParticipantIssueBuckets> => ({
            status: "ready",
            data: bucketIssues(
              completeness.data.data.participant_issues ?? [],
              participantStats.data.data.engagement_participants_total ?? 0
            ),
          })
        )
      : Promise.resolve<SectionState<ParticipantIssueBuckets>>({ status: "idle" });

    const paymentsPromise = showPayments
      ? listPendingOverThreshold().then(
          (rows): SectionState<PendingPaymentRow[]> => ({ status: "ready", data: rows })
        )
      : Promise.resolve<SectionState<PendingPaymentRow[]>>({ status: "idle" });

    const paymentTotalsPromise = showPayments
      ? Promise.all([
          bookingStatusTotal("pending"),
          bookingStatusTotal("confirmed"),
          bookingStatusTotal("failed"),
          bookingStatusTotal("released"),
        ]).then(
          ([pending, confirmed, failed, released]): SectionState<PaymentStatusTotals> => ({
            status: "ready",
            data: {
              pending,
              confirmed,
              cancelled: failed + released,
            },
          })
        )
      : Promise.resolve<SectionState<PaymentStatusTotals>>({ status: "idle" });

    const notificationsPromise = showNotifications
      ? listFailedNotifications().then(
          (rows): SectionState<NotificationItem[]> => ({ status: "ready", data: rows })
        )
      : Promise.resolve<SectionState<NotificationItem[]>>({ status: "idle" });

    const ticketsPromise = showTickets
      ? Promise.all([
          supportApi.listTickets({ status: "open" }),
          supportApi.listTickets({ status: "resolved" }),
          supportApi.listTickets({ status: "closed" }),
        ]).then(
          ([openRes, resolvedRes, closedRes]): SectionState<TicketBuckets> => ({
            status: "ready",
            data: {
              open: openRes.data.data ?? [],
              resolvedCount: ticketListCount(resolvedRes.data),
              closedCount: ticketListCount(closedRes.data),
            },
          })
        )
      : Promise.resolve<SectionState<TicketBuckets>>({ status: "idle" });

    const bookingIssuesPromise = showBookingIssues
      ? listServiceabilityFailures().then(
          (rows): SectionState<ServiceabilityIssueRow[]> => ({ status: "ready", data: rows })
        )
      : Promise.resolve<SectionState<ServiceabilityIssueRow[]>>({ status: "idle" });

    const [
      engagements,
      participants,
      payments,
      paymentStatusTotals,
      notifications,
      tickets,
      bookingIssues,
    ] = await Promise.allSettled([
      engagementsPromise,
      participantsPromise,
      paymentsPromise,
      paymentTotalsPromise,
      notificationsPromise,
      ticketsPromise,
      bookingIssuesPromise,
    ]);

    const settle = <T,>(result: PromiseSettledResult<SectionState<T>>): SectionState<T> => {
      if (result.status === "fulfilled") return result.value;
      return { status: "error", message: getApiError(result.reason) };
    };

    return {
      engagements: settle(engagements),
      participants: settle(participants),
      payments: settle(payments),
      paymentStatusTotals: settle(paymentStatusTotals),
      notifications: settle(notifications),
      tickets: settle(tickets),
      bookingIssues: settle(bookingIssues),
    };
  }, [
    showBookingIssues,
    showEngagements,
    showNotifications,
    showOrganizations,
    showParticipants,
    showPayments,
    showTickets,
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
    void load().then(setSnapshot);
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
    let cancelled = false;
    void load().then((next) => {
      if (!cancelled) setSnapshot(next);
    });
    return () => {
      cancelled = true;
    };
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
  };
}
