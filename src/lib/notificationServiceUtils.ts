import type { NotificationServiceItem } from "./api";

function templateBlob(svc: NotificationServiceItem): string {
  const raw = svc.template_variables;
  if (raw == null) return "";
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

function templateNeedsKey(svc: NotificationServiceItem, key: string): boolean {
  const blob = templateBlob(svc);
  if (!blob) return false;
  return blob.includes(`{{${key}}}`) || blob.includes(key);
}

export function serviceNeedsBloodReportUrl(svc: NotificationServiceItem): boolean {
  return templateNeedsKey(svc, "blood_report_url");
}

export function serviceNeedsBioAiReportUrl(svc: NotificationServiceItem): boolean {
  return templateNeedsKey(svc, "bio_ai_report_url");
}

export function serviceNeedsOtp(svc: NotificationServiceItem): boolean {
  return templateNeedsKey(svc, "otp");
}

export function serviceNeedsParticipantDetail(svc: NotificationServiceItem): boolean {
  return (
    templateNeedsKey(svc, "participant_details") ||
    templateNeedsKey(svc, "first_name")
  );
}

export function serviceNeedsSessionDetails(svc: NotificationServiceItem): boolean {
  return templateNeedsKey(svc, "session_details");
}

export function serviceNeedsExternalLink(svc: NotificationServiceItem): boolean {
  return templateNeedsKey(svc, "external_link");
}
