import type {
  EngagementParticipantProgressParticipant,
  EngagementParticipantProgressResponse,
  ParticipantProgressStageStatus,
} from "../../lib/api";

/** E2E steps that are WhatsApp/email dispatch checks (merged in manager view). */
export const COMMS_STEP_KEYS: readonly string[] = [
  "onboarding_notify",
  "questionnaire_reminder_before",
  "pretest_guidelines",
  "blood_report_ready",
  "bioai_report_ready",
  "consultation_ready",
  "consultation_booking_alert",
  "consultation_remainder_done",
];

/** Participant milestones shown in "What needs attention" (not comms, not camp-level). */
export const MANAGER_MILESTONE_KEYS: readonly string[] = [
  "app_camp_scheduled",
  "questionnaire",
  "booking_id",
  "blood_report",
  "blood_values",
  "metsights_q_sync",
  "bio_ai_json",
  "bio_ai_report",
  "consultation_booked",
];

const MANAGER_LABELS: Record<string, string> = {
  engagement_setup: "Camp configuration",
  booking_guide_phlebo: "Phlebo booking guide",
  enrolled: "Enrolled",
  onboarding_notify: "Welcome message",
  app_camp_scheduled: "Book camp date & time",
  questionnaire: "Complete questionnaire",
  questionnaire_reminder_before: "Questionnaire reminder",
  pretest_guidelines: "Pre-test guidelines",
  booking_id: "Blood draw / booking ID",
  blood_report: "Blood report (PDF)",
  blood_values: "Blood test values",
  blood_report_ready: "Blood report alert",
  metsights_q_sync: "Metsights profile sync",
  bio_ai_json: "BioAI data",
  bio_ai_report: "BioAI report",
  bioai_report_ready: "BioAI report alert",
  consultation_ready: "Consultation ready alert",
  consultation_booked: "Book consultation",
  consultation_booking_alert: "Consultation booking alert",
  consultation_remainder_done: "Consultation follow-up",
};

export function managerLabelForStep(stepKey: string | null | undefined): string {
  if (!stepKey) return "—";
  return MANAGER_LABELS[stepKey] ?? stepKey.replace(/_/g, " ");
}

export function managerNextStepLabel(bottleneckKey: string | null | undefined): string {
  if (!bottleneckKey) return "All done";
  if (COMMS_STEP_KEYS.includes(bottleneckKey)) {
    return `Notification: ${managerLabelForStep(bottleneckKey)}`;
  }
  return managerLabelForStep(bottleneckKey);
}

function cellStatus(
  cell: { status?: ParticipantProgressStageStatus } | boolean | undefined,
): ParticipantProgressStageStatus {
  if (cell == null) return "pending";
  if (typeof cell === "boolean") return cell ? "complete" : "pending";
  return cell.status ?? "pending";
}

export function participantNeedsCommsAttention(
  row: EngagementParticipantProgressParticipant,
): boolean {
  for (const key of COMMS_STEP_KEYS) {
    const st = cellStatus(row.stages[key]);
    if (st === "pending" || st === "failed") return true;
  }
  return false;
}

export function countParticipantsNeedingComms(
  participants: EngagementParticipantProgressParticipant[],
): number {
  return participants.filter(participantNeedsCommsAttention).length;
}

export function commsBreakdownByStep(
  data: EngagementParticipantProgressResponse,
): { key: string; label: string; pending: number }[] {
  const out: { key: string; label: string; pending: number }[] = [];
  for (const key of COMMS_STEP_KEYS) {
    if (!data.stage_keys.includes(key)) continue;
    const agg = data.summary.by_stage[key];
    if (!agg) continue;
    const pending = agg.pending + agg.failed;
    if (pending > 0 && agg.applicable > 0) {
      out.push({ key, label: managerLabelForStep(key), pending });
    }
  }
  out.sort((a, b) => b.pending - a.pending);
  return out;
}

export function topParticipantBottleneck(
  bottlenecks: EngagementParticipantProgressResponse["summary"]["bottlenecks"],
): { key: string; label: string; pending: number } | null {
  if (!bottlenecks?.length) return null;
  const people = bottlenecks.filter((b) => b.scope !== "engagement");
  if (people.length === 0) return null;
  const top = people[0];
  return {
    key: top.key,
    label: managerLabelForStep(top.key),
    pending: top.pending,
  };
}
