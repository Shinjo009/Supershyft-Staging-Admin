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
  { id: "tests_completed", title: "Tests completed", interaction: "none" },
  { id: "questionnaire_done", title: "Questionnaire done", interaction: "none" },
  { id: "blood_report_generated", title: "Blood report generated", interaction: "none" },
  { id: "bioai_report_generated", title: "BioAI report generated", interaction: "none" },
  { id: "consultation_done", title: "Consultation done", interaction: "none" },
  { id: "open_engagement", title: "Open engagement", interaction: "none" },
  { id: "tickets", title: "Tickets", interaction: "none" },
  { id: "action_center", title: "Action center", interaction: "none" },
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

export const WIRED_CARDS = new Set<CardId>([
  "server_load",
  "notification_health",
  "people_registered",
  "ongoing",
  "upcoming",
  "completed",
]);

const OVERVIEW_NEW_PAGE_CARDS = new Set<CardId>([
  "notification_health",
  "people_registered",
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
