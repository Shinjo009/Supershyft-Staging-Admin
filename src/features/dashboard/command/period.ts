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
  // B2B/B2C are reserved in the shell but not active yet — always land on overview.
  if (raw === "overview" || raw === "b2b" || raw === "b2c" || !raw) return "overview";
  return "overview";
}

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
  | "action_center";

export const OVERVIEW_CARD_ORDER: { id: CardId; title: string; clickable: boolean }[] = [
  { id: "server_load", title: "Server load", clickable: false },
  { id: "notification_health", title: "Notification health", clickable: true },
  { id: "booking_issues", title: "Booking issues", clickable: false },
  { id: "people_registered", title: "People registered", clickable: true },
  { id: "tests_completed", title: "Tests completed", clickable: false },
  { id: "questionnaire_done", title: "Questionnaire done", clickable: false },
  { id: "blood_report_generated", title: "Blood report generated", clickable: false },
  { id: "bioai_report_generated", title: "BioAI report generated", clickable: false },
  { id: "consultation_done", title: "Consultation done", clickable: false },
  { id: "open_engagement", title: "Open engagement", clickable: false },
  { id: "tickets", title: "Tickets", clickable: false },
  { id: "action_center", title: "Action center", clickable: false },
];

export const WIRED_CARDS = new Set<CardId>([
  "server_load",
  "notification_health",
  "people_registered",
]);

export function normalizeCard(raw: string | null): CardId | null {
  if (!raw) return null;
  const id = raw.trim() as CardId;
  if (id === "notification_health" || id === "people_registered") return id;
  return null;
}
