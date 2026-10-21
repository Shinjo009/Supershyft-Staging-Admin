import type {
  AssessmentPackage,
  B2cOnboardingTypeDefaults,
  BloodCollectionType,
  DefaultOnboardingAssistantItem,
  DiagnosticPackageListItem,
  PartnerListItem,
} from "../../lib/api";

export function labelAssessment(p: AssessmentPackage) {
  const name = p.display_name?.trim() || p.package_code?.trim() || `Package ${p.package_id}`;
  return `${name} (#${p.package_id})`;
}

export function labelDiagnostic(p: DiagnosticPackageListItem) {
  const name = p.package_name?.trim() || `Package ${p.diagnostic_package_id}`;
  return `${name} (#${p.diagnostic_package_id})`;
}

export function labelPartner(p: PartnerListItem | DefaultOnboardingAssistantItem) {
  if ("partner_id" in p) {
    const name = p.name?.trim();
    return name || `Partner #${p.partner_id}`;
  }
  const first = p.first_name?.trim() ?? "";
  const last = p.last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || `Partner #${p.employee_id}`;
}

export const BLOOD_COLLECTION_TYPE_OPTIONS: { value: BloodCollectionType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "home_collection", label: "Home collection" },
  { value: "camp_collection", label: "Camp collection" },
];

export function emptyTypeDefaults(assessmentId = 1, diagnosticId: number | null = 1): B2cOnboardingTypeDefaults {
  return {
    assessment_package_id: assessmentId,
    diagnostic_package_id: diagnosticId,
    diagnostic_package_id_male: null,
    diagnostic_package_id_female: null,
    blood_collection_type: null,
    create_profile_on_metsights: true,
    enroll_for_fitprint_full: false,
    load_prev_assessment_questionnaires: false,
    load_prev_questionnaire_category_keys: null,
    slot_duration: 20,
    consultation_mode: null,
    auto_booking: false,
    payment_type: "paid_by_patient",
  };
}

export type B2cDefaultsByType = Record<string, B2cOnboardingTypeDefaults>;

export function buildDefaultsByType(
  typeCodes: string[],
  raw: Record<string, B2cOnboardingTypeDefaults> | undefined,
  fallbackAssessmentId = 1,
  fallbackDiagnosticId: number | null = 1
): B2cDefaultsByType {
  const fallback = emptyTypeDefaults(fallbackAssessmentId, fallbackDiagnosticId);
  const result: B2cDefaultsByType = {};
  for (const code of typeCodes) {
    const entry = raw?.[code];
    result[code] = entry
      ? {
          assessment_package_id: entry.assessment_package_id,
          diagnostic_package_id: entry.diagnostic_package_id ?? null,
          diagnostic_package_id_male: entry.diagnostic_package_id_male ?? null,
          diagnostic_package_id_female: entry.diagnostic_package_id_female ?? null,
          blood_collection_type: entry.blood_collection_type ?? null,
          create_profile_on_metsights: entry.create_profile_on_metsights,
          enroll_for_fitprint_full: entry.enroll_for_fitprint_full,
          load_prev_assessment_questionnaires: Boolean(entry.load_prev_assessment_questionnaires),
          load_prev_questionnaire_category_keys: entry.load_prev_questionnaire_category_keys ?? null,
          slot_duration: entry.slot_duration ?? 20,
          consultation_mode: entry.consultation_mode ?? null,
          auto_booking: Boolean(entry.auto_booking),
          payment_type: entry.payment_type ?? "paid_by_patient",
        }
      : { ...fallback };
  }
  return result;
}

export function formatCount(n: number | undefined) {
  if (n === undefined) return "—";
  return n.toLocaleString();
}

export function totalPagesFromCount(total: number, pageSize: number) {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

export function shortProfileId(id: string) {
  const trimmed = id.trim();
  if (trimmed.length <= 12) return trimmed || "—";
  return `${trimmed.slice(0, 8)}…`;
}
