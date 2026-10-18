import type {
  CampConsultationParticipantItem,
  CampConsultationRequestConsent,
  ConsultationManageDetail,
} from "../../lib/api";

export function isHealthConsentIncomplete(
  consent: CampConsultationRequestConsent | null | undefined
): boolean {
  if (!consent) return true;
  return !consent.bio_ai || !consent.blood_report || !consent.questionnaire;
}

export function needsAskConsentFromParticipant(
  item: CampConsultationParticipantItem
): boolean {
  if (!item.requested) return false;
  return isHealthConsentIncomplete(item.consent);
}

export function needsAskConsentFromManageDetail(detail: ConsultationManageDetail): boolean {
  if (!detail.engagement_participant_id) return false;
  return isHealthConsentIncomplete(detail.consent);
}

export function manageDetailToConsentParticipantItem(
  detail: ConsultationManageDetail
): CampConsultationParticipantItem {
  return {
    engagement_participant_id: detail.engagement_participant_id ?? 0,
    consultation_id: detail.consultation_id,
    user_id: detail.user_id,
    first_name: detail.first_name,
    last_name: detail.last_name,
    email: detail.email,
    phone: detail.phone,
    date: detail.date,
    slot: detail.slot,
    cabin: detail.cabin,
    done: detail.done,
    expert_type: detail.expert_type,
    requested: true,
    want: true,
    consent: detail.consent,
  };
}
