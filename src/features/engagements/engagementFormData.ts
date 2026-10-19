import type {
  AssessmentPackage,
  Engagement,
  EngagementCreate,
  EngagementKind,
  OrganizationListItem,
} from "../../lib/api";

export function buildDefaultEngagementCreate(
  preset?: Partial<EngagementCreate>,
  bootstrap?: {
    organizations?: OrganizationListItem[];
    assessment_packages?: AssessmentPackage[];
  },
): EngagementCreate {
  const today = new Date().toISOString().slice(0, 10);
  const orgs = bootstrap?.organizations ?? [];
  const packages = bootstrap?.assessment_packages ?? [];
  const nextOrganizationId = preset?.organization_id ?? orgs[0]?.organization_id ?? 0;
  const nextAssessmentPackageId = preset?.assessment_package_id ?? packages[0]?.package_id ?? 0;
  return {
    engagement_name: preset?.engagement_name ?? "",
    metsights_engagement_id: preset?.metsights_engagement_id ?? "",
    organization_id: nextOrganizationId,
    engagement_type: preset?.engagement_type ?? 0,
    engagement_code: preset?.engagement_code ?? "",
    assessment_package_id: nextAssessmentPackageId,
    diagnostic_package_id: preset?.diagnostic_package_id ?? undefined,
    diagnostic_package_id_male: preset?.diagnostic_package_id_male ?? undefined,
    diagnostic_package_id_female: preset?.diagnostic_package_id_female ?? undefined,
    city: preset?.city ?? "",
    address: preset?.address ?? "",
    sub_locality: preset?.sub_locality ?? "",
    landmark: preset?.landmark ?? "",
    pincode: preset?.pincode ?? "",
    state: preset?.state ?? "",
    country: preset?.country ?? "",
    latitude: preset?.latitude ?? null,
    longitude: preset?.longitude ?? null,
    slot_duration: preset?.slot_duration ?? 60,
    start_date: preset?.start_date ?? today,
    end_date: preset?.end_date ?? today,
    healthians_zone_id: preset?.healthians_zone_id ?? undefined,
    external_camp_id: preset?.external_camp_id ?? undefined,
    blood_collection_type: preset?.blood_collection_type ?? undefined,
    consultation_mode: preset?.consultation_mode ?? "offline",
    payment_type: preset?.payment_type ?? "paid_by_group",
    auto_booking: preset?.auto_booking ?? false,
    create_profile_on_metsights: preset?.create_profile_on_metsights ?? false,
    enroll_for_fitprint_full: preset?.enroll_for_fitprint_full ?? false,
    load_prev_assessment_questionnaires: preset?.load_prev_assessment_questionnaires ?? false,
    load_prev_questionnaire_category_keys: preset?.load_prev_questionnaire_category_keys ?? null,
    slot_detail: preset?.slot_detail ?? null,
    notifications: preset?.notifications ?? [],
    consultations: preset?.consultations ?? null,
  };
}

export function engagementToFormData(engagement: Engagement): EngagementCreate {
  return {
    engagement_name: engagement.engagement_name ?? "",
    metsights_engagement_id: engagement.metsights_engagement_id ?? "",
    organization_id: engagement.organization_id ?? 0,
    engagement_type: (engagement.engagement_type as EngagementKind | undefined) ?? "bio_ai",
    consultations: engagement.consultations ?? null,
    engagement_code: engagement.engagement_code ?? "",
    assessment_package_id: engagement.assessment_package_id ?? 0,
    diagnostic_package_id: engagement.diagnostic_package_id ?? undefined,
    diagnostic_package_id_male: engagement.diagnostic_package_id_male ?? undefined,
    diagnostic_package_id_female: engagement.diagnostic_package_id_female ?? undefined,
    city: engagement.city ?? "",
    address: engagement.address ?? "",
    sub_locality: engagement.sub_locality ?? "",
    landmark: engagement.landmark ?? "",
    pincode: engagement.pincode ?? "",
    state: engagement.state ?? "",
    country: engagement.country ?? "",
    latitude: engagement.latitude ?? null,
    longitude: engagement.longitude ?? null,
    slot_duration: engagement.slot_duration ?? 60,
    start_date: (engagement.start_date ?? "").toString().slice(0, 10),
    end_date: (engagement.end_date ?? "").toString().slice(0, 10),
    healthians_zone_id: engagement.healthians_zone_id ?? undefined,
    external_camp_id: engagement.external_camp_id ?? undefined,
    blood_collection_type: engagement.blood_collection_type ?? undefined,
    consultation_mode: engagement.consultation_mode ?? undefined,
    payment_type: (engagement.payment_type as EngagementCreate["payment_type"]) ?? "paid_by_group",
    auto_booking: Boolean(engagement.auto_booking),
    create_profile_on_metsights: Boolean(engagement.create_profile_on_metsights),
    enroll_for_fitprint_full: Boolean(engagement.enroll_for_fitprint_full),
    load_prev_assessment_questionnaires: Boolean(engagement.load_prev_assessment_questionnaires),
    load_prev_questionnaire_category_keys: engagement.load_prev_questionnaire_category_keys ?? null,
    slot_detail: engagement.slot_detail ?? null,
    notifications: engagement.notifications ?? [],
  };
}
