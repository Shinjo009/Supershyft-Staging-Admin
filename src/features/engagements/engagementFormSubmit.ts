import { computeCampNo } from "./campNo";
import type { EngagementCreate } from "../../lib/api";

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function buildEngagementLocationFields(data: EngagementCreate) {
  return {
    city: emptyToNull(data.city),
    address: emptyToNull(data.address),
    sub_locality: emptyToNull(data.sub_locality),
    landmark: emptyToNull(data.landmark),
    pincode: emptyToNull(data.pincode),
    state: emptyToNull(data.state),
    country: emptyToNull(data.country),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  };
}

export function buildEngagementCreatePayload(data: EngagementCreate): EngagementCreate {
  const orgId = data.organization_id && data.organization_id > 0 ? data.organization_id : null;
  if (!orgId) {
    throw new Error("Organisation is required");
  }
  if (!data.start_date || !data.end_date) {
    throw new Error("Start and end dates are required");
  }
  const locationFields = buildEngagementLocationFields(data);
  return {
    ...data,
    ...locationFields,
    organization_id: orgId,
    metsights_engagement_id: data.metsights_engagement_id?.trim() || null,
    assessment_package_id:
      data.assessment_package_id && data.assessment_package_id > 0 ? data.assessment_package_id : null,
    diagnostic_package_id:
      data.diagnostic_package_id && data.diagnostic_package_id > 0 ? data.diagnostic_package_id : null,
    diagnostic_package_id_male:
      data.diagnostic_package_id_male && data.diagnostic_package_id_male > 0
        ? data.diagnostic_package_id_male
        : null,
    diagnostic_package_id_female:
      data.diagnostic_package_id_female && data.diagnostic_package_id_female > 0
        ? data.diagnostic_package_id_female
        : null,
    healthians_zone_id: data.healthians_zone_id?.trim() || null,
    external_camp_id: data.external_camp_id ?? null,
    blood_collection_type: data.blood_collection_type || null,
    consultation_mode: data.consultation_mode || null,
    create_profile_on_metsights: Boolean(data.create_profile_on_metsights),
    enroll_for_fitprint_full: Boolean(data.enroll_for_fitprint_full),
    load_prev_assessment_questionnaires: Boolean(data.load_prev_assessment_questionnaires),
    load_prev_questionnaire_category_keys: data.load_prev_questionnaire_category_keys ?? null,
    notifications: data.notifications ?? [],
    camp_no: computeCampNo(orgId, data.start_date),
    slot_detail: data.slot_detail ?? null,
  };
}

export function buildEngagementUpdatePayload(data: EngagementCreate) {
  const orgId = data.organization_id && data.organization_id > 0 ? data.organization_id : null;
  if (!data.start_date || !data.end_date) {
    throw new Error("Start and end dates are required");
  }
  const locationFields = buildEngagementLocationFields(data);
  const nextCampNo = computeCampNo(orgId, data.start_date);
  return {
    payload: {
      engagement_name: data.engagement_name,
      engagement_code: (data.engagement_code ?? "").trim(),
      metsights_engagement_id: data.metsights_engagement_id?.trim() || null,
      organization_id: orgId,
      engagement_type: data.engagement_type,
      consultations: data.consultations ?? null,
      assessment_package_id:
        data.assessment_package_id && data.assessment_package_id > 0 ? data.assessment_package_id : null,
      diagnostic_package_id:
        data.diagnostic_package_id && data.diagnostic_package_id > 0 ? data.diagnostic_package_id : null,
      diagnostic_package_id_male:
        data.diagnostic_package_id_male && data.diagnostic_package_id_male > 0
          ? data.diagnostic_package_id_male
          : null,
      diagnostic_package_id_female:
        data.diagnostic_package_id_female && data.diagnostic_package_id_female > 0
          ? data.diagnostic_package_id_female
          : null,
      ...locationFields,
      slot_duration: data.slot_duration,
      start_date: data.start_date,
      end_date: data.end_date,
      healthians_zone_id: data.healthians_zone_id?.trim() || null,
      external_camp_id: data.external_camp_id ?? null,
      blood_collection_type: data.blood_collection_type || null,
      consultation_mode: data.consultation_mode || null,
      create_profile_on_metsights: Boolean(data.create_profile_on_metsights),
      enroll_for_fitprint_full: Boolean(data.enroll_for_fitprint_full),
      load_prev_assessment_questionnaires: Boolean(data.load_prev_assessment_questionnaires),
      load_prev_questionnaire_category_keys: data.load_prev_questionnaire_category_keys ?? null,
      notifications: data.notifications ?? [],
      slot_detail: data.slot_detail ?? null,
    },
    nextCampNo,
  };
}
