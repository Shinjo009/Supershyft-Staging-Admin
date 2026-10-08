import type { ParticipantJourneyCategoryProgress, ParticipantJourneyInstanceSummary } from "../../lib/api";

export const JOURNEY_METSIGHTS_CATEGORY_COLUMNS = [
  { key: "physical-measurement", label: "Anthropometry" },
  { key: "diet-lifestyle-parameters", label: "Diet & Lifestyle" },
  { key: "vitals", label: "Vitals" },
  { key: "fitness-parameters", label: "Fitness Parameters" },
  { key: "blood-parameters", label: "Blood Parameters" },
  { key: "advanced-blood-parameters", label: "Advanced Blood" },
] as const;

export function getCategoryProgress(
  progressList: ParticipantJourneyCategoryProgress[],
  categoryKey: string,
): ParticipantJourneyCategoryProgress | undefined {
  return progressList.find(
    (p) => p.category_key === categoryKey && p.category_of === "metsights",
  );
}

export function isCategoryAssigned(
  progressList: ParticipantJourneyCategoryProgress[],
  categoryKey: string,
  assessmentTypeCode?: string | null,
): boolean {
  if (progressList.some((p) => p.category_key === categoryKey && p.category_of === "metsights")) {
    return true;
  }
  if (categoryKey === "fitness-parameters") {
    return assessmentTypeCode === "7";
  }
  if (["physical-measurement", "diet-lifestyle-parameters", "vitals"].includes(categoryKey)) {
    return assessmentTypeCode === "1" || assessmentTypeCode === "2" || assessmentTypeCode === "7";
  }
  if (["blood-parameters", "advanced-blood-parameters"].includes(categoryKey)) {
    return assessmentTypeCode === "1" || assessmentTypeCode === "2";
  }
  return false;
}

export function instanceHasIncompleteAssignedCategories(
  row: ParticipantJourneyInstanceSummary,
): boolean {
  return JOURNEY_METSIGHTS_CATEGORY_COLUMNS.some((col) => {
    if (!isCategoryAssigned(row.category_progress, col.key, row.assessment_type_code)) {
      return false;
    }
    const progress = getCategoryProgress(row.category_progress, col.key);
    if (!progress || !progress.has_responses) {
      return true;
    }
    return (progress.status || "").toLowerCase() !== "complete";
  });
}

export function sourceCopyCandidates(
  dest: ParticipantJourneyInstanceSummary,
  all: ParticipantJourneyInstanceSummary[],
): ParticipantJourneyInstanceSummary[] {
  return all
    .filter((row) => row.assessment_instance_id !== dest.assessment_instance_id)
    .filter((row) => (row.questionnaire?.response_count ?? 0) > 0)
    .sort((a, b) => b.assessment_instance_id - a.assessment_instance_id);
}

export function countCompleteMetsightsCategories(row: ParticipantJourneyInstanceSummary): number {
  return row.category_progress.filter(
    (p) =>
      p.category_of === "metsights" &&
      (p.status || "").toLowerCase() === "complete" &&
      p.has_responses,
  ).length;
}

export function formatJourneyStatusLabel(status?: string | null): string {
  return (status || "—").replace(/_/g, " ").replace(/^completed$/i, "complete");
}
