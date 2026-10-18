import type {
  CampConsultationParticipantItem,
  CampConsultationRequestConsent,
  ConsultationManageDetail,
} from "../../lib/api";

type ConsentLike = {
  bio_ai?: boolean;
  blood_report?: boolean;
  questionnaire?: boolean;
} | null | undefined;

export function normalizeCampConsultationConsent(
  consent: ConsentLike
): CampConsultationRequestConsent {
  return {
    bio_ai: Boolean(consent?.bio_ai),
    blood_report: Boolean(consent?.blood_report),
    questionnaire: Boolean(consent?.questionnaire),
  };
}

export function isHealthConsentIncomplete(consent: ConsentLike): boolean {
  if (!consent) return true;
  const normalized = normalizeCampConsultationConsent(consent);
  return (
    !normalized.bio_ai || !normalized.blood_report || !normalized.questionnaire
  );
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
    consent: normalizeCampConsultationConsent(detail.consent),
  };
}
