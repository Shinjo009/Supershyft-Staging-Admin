import { computeCampNo } from "./campNo";
import type { EngagementCreate } from "../../lib/api";

export type EngagementWizardSaveStep =
  | "basics"
  | "location"
  | "offerings"
  | "schedule"
  | "notifications";

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

function engagementUpdateIdentityFields(data: EngagementCreate) {
  if (!data.start_date || !data.end_date) {
    throw new Error("Start and end dates are required");
  }
  return {
    engagement_code: (data.engagement_code ?? "").trim(),
    engagement_type: data.engagement_type,
    start_date: data.start_date,
    end_date: data.end_date,
    slot_duration: data.slot_duration,
  };
}

function normalizePackageIds(data: EngagementCreate) {
  return {
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
  };
}

function engagementOfferingsFields(data: EngagementCreate) {
  const packages = normalizePackageIds(data);
  return {
    ...packages,
    consultations: data.consultations ?? null,
    metsights_engagement_id: data.metsights_engagement_id?.trim() || null,
    healthians_zone_id: data.healthians_zone_id?.trim() || null,
    external_camp_id: data.external_camp_id ?? null,
    blood_collection_type: data.blood_collection_type || null,
    consultation_mode: data.consultation_mode || null,
    create_profile_on_metsights: Boolean(data.create_profile_on_metsights),
    enroll_for_fitprint_full: Boolean(data.enroll_for_fitprint_full),
    load_prev_assessment_questionnaires: Boolean(data.load_prev_assessment_questionnaires),
    load_prev_questionnaire_category_keys: data.load_prev_questionnaire_category_keys ?? null,
    payment_type: data.payment_type ?? "paid_by_group",
    auto_booking: Boolean(data.auto_booking),
  };
}

/** Full update payload (final wizard submit). */
export function buildEngagementUpdatePayload(data: EngagementCreate) {
  const orgId = data.organization_id && data.organization_id > 0 ? data.organization_id : null;
  const locationFields = buildEngagementLocationFields(data);
  const nextCampNo = computeCampNo(orgId, data.start_date);
  const payload: Record<string, unknown> = {
    engagement_name: data.engagement_name,
    ...engagementUpdateIdentityFields(data),
    organization_id: orgId,
    ...engagementOfferingsFields(data),
    ...locationFields,
  };
  if (data.notifications !== undefined) {
    payload.notifications = data.notifications;
  }
  if (data.slot_detail !== undefined) {
    payload.slot_detail = data.slot_detail;
  }
  return {
    payload,
    nextCampNo,
  };
}

/** Step-scoped update: only keys for the current wizard step (+ required identity fields). */
export function buildEngagementUpdatePayloadForWizardStep(
  data: EngagementCreate,
  step: EngagementWizardSaveStep,
) {
  const orgId = data.organization_id && data.organization_id > 0 ? data.organization_id : null;
  const nextCampNo = computeCampNo(orgId, data.start_date);
  const payload: Record<string, unknown> = {
    ...engagementUpdateIdentityFields(data),
  };

  switch (step) {
    case "basics":
      payload.engagement_name = data.engagement_name;
      payload.organization_id = orgId;
      break;
    case "location":
      Object.assign(payload, buildEngagementLocationFields(data));
      break;
    case "offerings":
      Object.assign(payload, engagementOfferingsFields(data));
      break;
    case "schedule":
      if (data.slot_detail !== undefined) {
        payload.slot_detail = data.slot_detail;
      }
      break;
    case "notifications":
      if (data.notifications !== undefined) {
        payload.notifications = data.notifications;
      }
      break;
    default:
      break;
  }

  return { payload, nextCampNo };
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
  const packages = normalizePackageIds(data);
  const { notifications: formNotifications, ...dataWithoutNotifications } = data;
  return {
    ...dataWithoutNotifications,
    ...locationFields,
    organization_id: orgId,
    metsights_engagement_id: data.metsights_engagement_id?.trim() || null,
    ...packages,
    healthians_zone_id: data.healthians_zone_id?.trim() || null,
    external_camp_id: data.external_camp_id ?? null,
    blood_collection_type: data.blood_collection_type || null,
    consultation_mode: data.consultation_mode || null,
    create_profile_on_metsights: Boolean(data.create_profile_on_metsights),
    enroll_for_fitprint_full: Boolean(data.enroll_for_fitprint_full),
    load_prev_assessment_questionnaires: Boolean(data.load_prev_assessment_questionnaires),
    load_prev_questionnaire_category_keys: data.load_prev_questionnaire_category_keys ?? null,
    payment_type: data.payment_type ?? "paid_by_group",
    auto_booking: Boolean(data.auto_booking),
    ...(formNotifications && formNotifications.length > 0
      ? { notifications: formNotifications }
      : {}),
    camp_no: computeCampNo(orgId, data.start_date),
    slot_detail: data.slot_detail ?? null,
  };
}
