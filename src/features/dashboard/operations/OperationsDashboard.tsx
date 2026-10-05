import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  EngagementListItem,
  NotificationItem,
  ParticipantIssueItem,
  SupportTicket,
} from "../../../lib/api";
import {
  formatAmountPaise,
  formatClockTime,
  formatDateTime,
  formatPendingFor,
  formatShortDate,
} from "./operationsDateUtils";
import { DashboardOverview, type OverviewUsersStats } from "./DashboardOverview";
import { OperationsTable, StatusPill, TruncateText, type OperationsColumn } from "./OperationsTable";
import { OperationsViewAllModal } from "./OperationsViewAllModal";
import type { PendingPaymentRow, ServiceabilityIssueRow } from "./operationsTypes";
import { useOperationsDashboard } from "./useOperationsDashboard";
import { YearStatsCards } from "./YearStatsCards";

type ViewAllKind =
  | "engagements"
  | "issues"
  | "payments"
  | "notifications"
  | "tickets"
  | "bookingIssues";

function recipientLabel(row: NotificationItem): string {
  const recipient = row.recipients?.[0];
  if (recipient) {
    const name = [recipient.first_name, recipient.last_name].filter(Boolean).join(" ").trim();
    if (name) return name;
  }
  const userId = row.user?.user_ids?.[0];
  return userId ? `User #${userId}` : "—";
}

function notificationUserId(row: NotificationItem): number | null {
  return row.recipients?.[0]?.user_id ?? row.user?.user_ids?.[0] ?? null;
}

function issueLabel(issue: ParticipantIssueItem["issue_type"]): string {
  if (issue === "missing_questionnaire") return "Missing Questionnaire";
  if (issue === "missing_blood_report") return "Missing Blood Report";
  if (issue === "missing_bio_ai_report") return "Missing Bio-AI Report";
  return issue;
}

function engagementStatusTone(status?: string | null): "emerald" | "amber" | "zinc" {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "running") return "emerald";
  if (normalized === "scheduled") return "amber";
  return "zinc";
}

export function OperationsDashboard({
  registerRefetch,
  users,
}: {
  registerRefetch?: (refetch: () => void) => void;
  users?: OverviewUsersStats;
}) {
  const navigate = useNavigate();
  const ops = useOperationsDashboard();
  const { refetch } = ops;
  const yearStatsRefetch = useRef<() => void>(() => undefined);
  const usersStats: OverviewUsersStats = users ?? {
    show: false,
    total: null,
    active: null,
    growth: [],
    loading: false,
    error: null,
  };
  const [viewAllKind, setViewAllKind] = useState<ViewAllKind | null>(null);

  const registerYearStatsRefetch = useCallback((fn: () => void) => {
    yearStatsRefetch.current = fn;
  }, []);

  useEffect(() => {
    registerRefetch?.(() => {
      refetch();
      yearStatsRefetch.current();
    });
  }, [refetch, registerRefetch]);

  const engagementRows = useMemo(() => {
    if (ops.engagements.status !== "ready") return [];
    const seen = new Set<number>();
    const rows: EngagementListItem[] = [];
    for (const row of [...ops.engagements.data.runningToday, ...ops.engagements.data.runningThisWeek]) {
      if (seen.has(row.engagement_id)) continue;
      seen.add(row.engagement_id);
      rows.push(row);
    }
    return rows;
  }, [ops.engagements]);

  const issueRows = useMemo(() => {
    if (ops.participants.status !== "ready") return [];
    return [
      ...ops.participants.data.missingQuestionnaire,
      ...ops.participants.data.missingBloodReport,
      ...ops.participants.data.missingBioAiReport,
    ];
  }, [ops.participants]);

  const paymentRows = ops.payments.status === "ready" ? ops.payments.data : [];
  const notificationRows = ops.notifications.status === "ready" ? ops.notifications.data : [];
  const ticketRows = ops.tickets.status === "ready" ? ops.tickets.data.open : [];
  const bookingIssueRows = ops.bookingIssues.status === "ready" ? ops.bookingIssues.data : [];

  const engagementColumns: OperationsColumn<EngagementListItem>[] = [
    {
      key: "name",
      label: "Engagement",
      render: (row) => (
        <TruncateText>{row.engagement_name || `Engagement #${row.engagement_id}`}</TruncateText>
      ),
    },
    {
      key: "code",
      label: "Code",
      render: (row) => <TruncateText>{row.engagement_code || "—"}</TruncateText>,
    },
    {
      key: "org",
      label: "Organization",
      render: (row) => {
        if (ops.engagements.status !== "ready") return "—";
        if (row.organization_id == null) return "—";
        return (
          <TruncateText>
            {ops.engagements.data.orgNames[row.organization_id] || `Org #${row.organization_id}`}
          </TruncateText>
        );
      },
    },
    { key: "start", label: "Start", render: (row) => formatShortDate(row.start_date) },
    { key: "end", label: "End", render: (row) => formatShortDate(row.end_date) },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill label={row.status || "—"} tone={engagementStatusTone(row.status)} />,
    },
  ];

  const issueColumns: OperationsColumn<ParticipantIssueItem>[] = [
    { key: "participant", label: "Participant", render: (row) => <TruncateText>{row.participant_name}</TruncateText> },
    {
      key: "engagement",
      label: "Engagement",
      render: (row) => (
        <TruncateText>{row.engagement_name || `Engagement #${row.engagement_id}`}</TruncateText>
      ),
    },
    { key: "issue", label: "Issue", render: (row) => issueLabel(row.issue_type) },
    { key: "status", label: "Status", render: (row) => <StatusPill label={row.status} tone="amber" /> },
  ];

  const paymentColumns: OperationsColumn<PendingPaymentRow>[] = [
    {
      key: "participant",
      label: "Participant",
      render: (row) => <TruncateText>{row.user_name || `User #${row.user_id}`}</TruncateText>,
    },
    { key: "engagement", label: "Engagement", render: (row) => <TruncateText>{row.entity_name || "—"}</TruncateText> },
    { key: "amount", label: "Amount", render: (row) => formatAmountPaise(row.amount_paise) },
    { key: "status", label: "Payment Status", render: () => <StatusPill label="Pending" tone="amber" /> },
    { key: "created", label: "Created At", render: (row) => formatClockTime(row.booked_at) },
    { key: "pending", label: "Pending For", render: (row) => formatPendingFor(row.pendingMinutes) },
  ];

  const notificationColumns: OperationsColumn<NotificationItem>[] = [
    { key: "participant", label: "Participant", render: (row) => <TruncateText>{recipientLabel(row)}</TruncateText> },
    {
      key: "type",
      label: "Type",
      render: (row) => <TruncateText>{row.service_display_name || row.service_key}</TruncateText>,
    },
    {
      key: "message",
      label: "Message",
      render: (row) => <TruncateText>{row.message || row.service_display_name || "—"}</TruncateText>,
    },
    {
      key: "failed",
      label: "Failed At",
      render: (row) => formatClockTime(row.completed_at || row.dispatched_at),
    },
    { key: "status", label: "Status", render: () => <StatusPill label="Failed" tone="red" /> },
  ];

  const ticketColumns: OperationsColumn<SupportTicket>[] = [
    { key: "id", label: "Ticket ID", render: (row) => `#${row.ticket_id}` },
    {
      key: "participant",
      label: "Participant",
      render: (row) => (
        <TruncateText>{row.contact_input || (row.user_id != null ? `User #${row.user_id}` : "—")}</TruncateText>
      ),
    },
    { key: "subject", label: "Subject", render: (row) => <TruncateText>{row.query_text}</TruncateText> },
    { key: "created", label: "Created At", render: (row) => formatShortDate(row.created_at) },
    { key: "status", label: "Status", render: (row) => <StatusPill label={row.status} tone="amber" /> },
  ];

  const bookingIssueColumns: OperationsColumn<ServiceabilityIssueRow>[] = [
    {
      key: "participant",
      label: "Participant",
      render: (row) => <TruncateText>{row.participant_label}</TruncateText>,
    },
    {
      key: "engagement",
      label: "Engagement",
      render: (row) => <TruncateText>{row.engagement_label}</TruncateText>,
    },
    {
      key: "issue",
      label: "Issue",
      render: (row) => <TruncateText>{row.issue_message}</TruncateText>,
    },
    { key: "failed", label: "Failed At", render: (row) => formatDateTime(row.failed_at) },
  ];

  const openViewAll = (kind: ViewAllKind) => setViewAllKind(kind);

  return (
    <div className="space-y-3">
      <YearStatsCards
        users={usersStats}
        engagements={ops.engagements}
        showEngagements={ops.showEngagements}
        onViewAllEngagements={() => openViewAll("engagements")}
        registerRefetch={registerYearStatsRefetch}
      />

      <DashboardOverview
        users={usersStats}
        engagements={ops.engagements}
        participants={ops.participants}
        payments={ops.payments}
        paymentStatusTotals={ops.paymentStatusTotals}
        notifications={ops.notifications}
        tickets={ops.tickets}
        bookingIssues={ops.bookingIssues}
        showEngagements={false}
        showParticipants={ops.showParticipants}
        showPayments={ops.showPayments}
        showNotifications={ops.showNotifications}
        showTickets={ops.showTickets}
        showBookingIssues={ops.showBookingIssues}
        onViewAllEngagements={() => openViewAll("engagements")}
        onViewAllIssues={() => openViewAll("issues")}
        onViewAllPayments={() => openViewAll("payments")}
        onViewAllNotifications={() => openViewAll("notifications")}
        onViewAllTickets={() => openViewAll("tickets")}
        onViewAllBookingIssues={() => openViewAll("bookingIssues")}
      />

      <OperationsViewAllModal
        open={viewAllKind === "engagements"}
        onClose={() => setViewAllKind(null)}
        title={`Engagements (${engagementRows.length.toLocaleString()})`}
        rows={engagementRows}
        columns={engagementColumns}
        rowKey={(row) => row.engagement_id}
        onRowClick={(row) => {
          setViewAllKind(null);
          navigate("/engagements", { state: { viewEngagementId: row.engagement_id } });
        }}
        matchesSearch={(row, q) =>
          `${row.engagement_name ?? ""} ${row.engagement_code ?? ""} ${row.organization_id ?? ""}`
            .toLowerCase()
            .includes(q)
        }
        searchPlaceholder="Search engagements…"
        itemNoun="engagements"
      />

      <OperationsViewAllModal
        open={viewAllKind === "issues"}
        onClose={() => setViewAllKind(null)}
        title={`Participant issues (${issueRows.length.toLocaleString()})`}
        rows={issueRows}
        columns={issueColumns}
        rowKey={(row) => `${row.user_id}-${row.engagement_id}-${row.issue_type}`}
        onRowClick={(row) => {
          setViewAllKind(null);
          navigate(`/users/${row.user_id}/journey`);
        }}
        matchesSearch={(row, q) =>
          `${row.participant_name} ${row.engagement_name ?? ""} ${issueLabel(row.issue_type)}`.toLowerCase().includes(q)
        }
        searchPlaceholder="Search participants…"
        itemNoun="issues"
      />

      <OperationsViewAllModal
        open={viewAllKind === "payments"}
        onClose={() => setViewAllKind(null)}
        title={`Pending payments (${paymentRows.length.toLocaleString()})`}
        rows={paymentRows}
        columns={paymentColumns}
        rowKey={(row) => row.booking_id}
        onRowClick={(row) => {
          setViewAllKind(null);
          navigate("/payments/bookings");
        }}
        matchesSearch={(row, q) =>
          `${row.user_name ?? ""} ${row.entity_name ?? ""} ${row.user_id}`.toLowerCase().includes(q)
        }
        searchPlaceholder="Search payments…"
        itemNoun="payments"
      />

      <OperationsViewAllModal
        open={viewAllKind === "notifications"}
        onClose={() => setViewAllKind(null)}
        title={`Failed notifications (${notificationRows.length.toLocaleString()})`}
        rows={notificationRows}
        columns={notificationColumns}
        rowKey={(row) => row.notification_id}
        onRowClick={(row) => {
          setViewAllKind(null);
          const userId = notificationUserId(row);
          if (userId != null) navigate(`/users/${userId}/journey`);
          else navigate("/notifications/notifications");
        }}
        matchesSearch={(row, q) =>
          `${recipientLabel(row)} ${row.service_display_name ?? ""} ${row.message ?? ""}`.toLowerCase().includes(q)
        }
        searchPlaceholder="Search notifications…"
        itemNoun="notifications"
      />

      <OperationsViewAllModal
        open={viewAllKind === "tickets"}
        onClose={() => setViewAllKind(null)}
        title={`Open tickets (${ticketRows.length.toLocaleString()})`}
        rows={ticketRows}
        columns={ticketColumns}
        rowKey={(row) => row.ticket_id}
        onRowClick={(row) => {
          setViewAllKind(null);
          navigate("/support");
        }}
        matchesSearch={(row, q) =>
          `${row.ticket_id} ${row.contact_input ?? ""} ${row.query_text ?? ""}`.toLowerCase().includes(q)
        }
        searchPlaceholder="Search tickets…"
        itemNoun="tickets"
      />

      <OperationsViewAllModal
        open={viewAllKind === "bookingIssues"}
        onClose={() => setViewAllKind(null)}
        title={`Booking issues (${bookingIssueRows.length.toLocaleString()})`}
        rows={bookingIssueRows}
        columns={bookingIssueColumns}
        rowKey={(row) => row.sync_log_id}
        onRowClick={(row) => {
          setViewAllKind(null);
          if (row.user_id != null) navigate(`/users/${row.user_id}/journey`);
          else navigate("/engagements");
        }}
        matchesSearch={(row, q) =>
          `${row.participant_label} ${row.engagement_label} ${row.issue_message}`.toLowerCase().includes(q)
        }
        searchPlaceholder="Search booking issues…"
        itemNoun="issues"
      />
    </div>
  );
}
