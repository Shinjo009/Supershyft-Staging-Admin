import type { EngagementListItem, NotificationItem, ParticipantIssueItem } from "../../../lib/api";
import type { BookingListItem } from "../../../lib/api";
import type { SupportTicket } from "../../../lib/api";

export type SectionState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

export interface EngagementBuckets {
  runningToday: EngagementListItem[];
  runningThisWeek: EngagementListItem[];
  orgNames: Record<number, string>;
  truncated: boolean;
}

export interface ParticipantIssueSummary {
  participantsInScope: number;
  engagementsInScope: number;
  limitReached: boolean;
  missingBloodSlot: number;
  missingQuestionnaire: number;
  missingBloodReport: number;
  missingBioAiReport: number;
}

export interface ParticipantIssueBuckets {
  totalParticipants: number;
  summary: ParticipantIssueSummary | null;
  missingBloodSlot: ParticipantIssueItem[];
  missingQuestionnaire: ParticipantIssueItem[];
  missingBloodReport: ParticipantIssueItem[];
  missingBioAiReport: ParticipantIssueItem[];
}

export interface PendingPaymentRow extends BookingListItem {
  pendingMinutes: number;
}

export interface ServiceabilityIssueRow {
  sync_log_id: number;
  user_id: number | null;
  engagement_id: number | null;
  participant_label: string;
  location_label: string;
  issue_message: string;
  engagement_label: string;
  failed_at: string;
}

export interface TicketBuckets {
  open: SupportTicket[];
  openCount: number;
  resolvedCount: number;
  closedCount: number;
}

/** Booking status totals for overview pie (Cancelled = failed + released). */
export interface PaymentStatusTotals {
  pending: number;
  confirmed: number;
  cancelled: number;
}

export interface OperationsSnapshot {
  engagements: SectionState<EngagementBuckets>;
  participants: SectionState<ParticipantIssueBuckets>;
  payments: SectionState<PendingPaymentRow[]>;
  paymentStatusTotals: SectionState<PaymentStatusTotals>;
  notifications: SectionState<NotificationItem[]>;
  tickets: SectionState<TicketBuckets>;
  bookingIssues: SectionState<ServiceabilityIssueRow[]>;
}

export const ROW_LIMIT = 10;

export const ACTIVE_ENGAGEMENT_STATUS = "running,scheduled";
