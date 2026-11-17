export type PeriodPreset =
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "six_months"
  | "one_year"
  | "all_time"
  | "custom";

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "this_quarter", label: "This quarter" },
  { id: "six_months", label: "6-months" },
  { id: "one_year", label: "1 year" },
  { id: "all_time", label: "All time" },
  { id: "custom", label: "Custom" },
];

export const DEFAULT_PERIOD: PeriodPreset = "this_week";

const VALID = new Set(PERIOD_PRESETS.map((p) => p.id));

export function normalizePeriod(raw: string | null): PeriodPreset {
  if (!raw) return DEFAULT_PERIOD;
  const v = raw.trim().toLowerCase() as PeriodPreset;
  return VALID.has(v) ? v : DEFAULT_PERIOD;
}

export type DashboardTab = "overview" | "b2b" | "b2c";

export function normalizeTab(raw: string | null): DashboardTab {
  // B2C reserved but not active yet.
  if (raw === "overview" || raw === "b2b") return raw;
  return "overview";
}

export type CardInteraction = "none" | "current_page" | "new_page";

export type CardId =
  | "server_load"
  | "notification_health"
  | "booking_issues"
  | "people_registered"
  | "tests_completed"
  | "questionnaire_done"
  | "blood_report_generated"
  | "bioai_report_generated"
  | "consultation_done"
  | "open_engagement"
  | "tickets"
  | "action_center"
  | "ongoing"
  | "upcoming"
  | "completed";

export const OVERVIEW_CARD_ORDER: {
  id: CardId;
  title: string;
  interaction: CardInteraction;
}[] = [
  { id: "server_load", title: "Server load", interaction: "none" },
  { id: "notification_health", title: "Notification health", interaction: "new_page" },
  { id: "booking_issues", title: "Booking issues", interaction: "none" },
  { id: "people_registered", title: "People registered", interaction: "new_page" },
  { id: "tests_completed", title: "Tests completed", interaction: "new_page" },
  { id: "questionnaire_done", title: "Questionnaire done", interaction: "new_page" },
  { id: "blood_report_generated", title: "Blood report generated", interaction: "new_page" },
  { id: "bioai_report_generated", title: "BioAI report generated", interaction: "new_page" },
  { id: "consultation_done", title: "Consultation done", interaction: "new_page" },
  { id: "open_engagement", title: "Open engagement", interaction: "new_page" },
  { id: "tickets", title: "Tickets", interaction: "new_page" },
  { id: "action_center", title: "Action center", interaction: "new_page" },
];

export const B2B_CARD_ORDER: {
  id: CardId;
  title: string;
  interaction: CardInteraction;
  hint: string;
}[] = [
  { id: "ongoing", title: "Ongoing", interaction: "current_page", hint: "Running camps" },
  { id: "upcoming", title: "Upcoming", interaction: "current_page", hint: "Scheduled" },
  { id: "completed", title: "Completed", interaction: "current_page", hint: "Past camps" },
];

export type ActionSubcardId =
  | "upcoming_collections"
  | "overdue_collections"
  | "questionnaire_pending"
  | "blood_reports_pending"
  | "bio_ai_pending"
  | "consultation_pending";

export const ACTION_SUBCARD_ORDER: {
  id: ActionSubcardId;
  label: string;
  title: string;
  emptyLabel: string;
}[] = [
  {
    id: "upcoming_collections",
    label: "Upcoming collections",
    title: "Upcoming collections",
    emptyLabel: "No upcoming collections in this period.",
  },
  {
    id: "overdue_collections",
    label: "Overdue collections",
    title: "Overdue collections",
    emptyLabel: "No overdue collections in this period.",
  },
  {
    id: "questionnaire_pending",
    label: "Questionnaire pending",
    title: "Questionnaire pending",
    emptyLabel: "No pending questionnaires in this period.",
  },
  {
    id: "blood_reports_pending",
    label: "Blood reports pending",
    title: "Blood reports pending",
    emptyLabel: "No pending blood reports in this period.",
  },
  {
    id: "bio_ai_pending",
    label: "Bio-AI pending",
    title: "Bio-AI pending",
    emptyLabel: "No pending Bio-AI reports in this period.",
  },
  {
    id: "consultation_pending",
    label: "Consultations pending",
    title: "Consultations pending",
    emptyLabel: "No pending consultations in this period.",
  },
];

const VALID_ACTION_SUBCARDS = new Set<ActionSubcardId>(
  ACTION_SUBCARD_ORDER.map((s) => s.id)
);

export function normalizeSubcard(raw: string | null): ActionSubcardId | null {
  if (!raw) return null;
  const id = raw.trim() as ActionSubcardId;
  return VALID_ACTION_SUBCARDS.has(id) ? id : null;
}

export const WIRED_CARDS = new Set<CardId>([
  "server_load",
  "notification_health",
  "people_registered",
  "tests_completed",
  "questionnaire_done",
  "blood_report_generated",
  "bioai_report_generated",
  "consultation_done",
  "open_engagement",
  "tickets",
  "action_center",
  "ongoing",
  "upcoming",
  "completed",
]);

const OVERVIEW_NEW_PAGE_CARDS = new Set<CardId>([
  "notification_health",
  "people_registered",
  "tests_completed",
  "questionnaire_done",
  "blood_report_generated",
  "bioai_report_generated",
  "consultation_done",
  "open_engagement",
  "tickets",
  "action_center",
]);

const B2B_CARDS = new Set<CardId>(["ongoing", "upcoming", "completed"]);

export function cardInteraction(id: CardId | null): CardInteraction {
  if (!id) return "none";
  if (OVERVIEW_NEW_PAGE_CARDS.has(id)) return "new_page";
  if (B2B_CARDS.has(id)) return "current_page";
  const overview = OVERVIEW_CARD_ORDER.find((c) => c.id === id);
  return overview?.interaction ?? "none";
}

export function normalizeCard(
  raw: string | null,
  tab: DashboardTab = "overview"
): CardId | null {
  if (!raw) return null;
  const id = raw.trim() as CardId;
  if (tab === "b2b") {
    return B2B_CARDS.has(id) ? id : null;
  }
  if (tab === "overview") {
    return OVERVIEW_NEW_PAGE_CARDS.has(id) ? id : null;
  }
  return null;
}
