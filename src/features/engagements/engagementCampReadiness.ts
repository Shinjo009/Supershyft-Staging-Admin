import type { Engagement, EngagementNotificationItem } from "../../lib/api";
import { normalizeNotificationServiceConfigs } from "../../shared/ui/NotificationEventServicesInput";

export type CampReadinessInput = {
  engagement: Engagement;
  onboardingAssistantCount: number;
  configuredNotifications: EngagementNotificationItem[];
};

function hasSlotDetail(slotDetail: unknown): boolean {
  if (slotDetail == null) return false;
  if (typeof slotDetail === "object" && Object.keys(slotDetail as object).length === 0) return false;
  return true;
}

function serviceKeysForEventCode(
  configured: EngagementNotificationItem[],
  eventCode: string,
): string[] {
  const rows = configured.filter((n) => (n.event_code ?? "").toLowerCase() === eventCode.toLowerCase());
  const keys: string[] = [];
  for (const row of rows) {
    for (const s of normalizeNotificationServiceConfigs(row.notification_services)) {
      const k = s.service_key.trim();
      if (k) keys.push(k);
    }
  }
  return keys;
}

/** Mirrors backend camp setup checks (packages, schedule, assistants, onboarding event). */
export function isCampSetupComplete(input: CampReadinessInput): boolean {
  const { engagement, onboardingAssistantCount, configuredNotifications } = input;
  const hasPkg =
    Boolean(engagement.assessment_package_id) ||
    Boolean(engagement.diagnostic_package_id) ||
    Boolean(engagement.diagnostic_package_id_male) ||
    Boolean(engagement.diagnostic_package_id_female);
  const hasSchedule =
    Boolean(engagement.start_date && engagement.end_date) || hasSlotDetail(engagement.slot_detail);
  const hasAssistants = onboardingAssistantCount > 0;
  const onboardingKeys = serviceKeysForEventCode(configuredNotifications, "onboarding");
  return hasPkg && hasSchedule && hasAssistants && onboardingKeys.length > 0;
}

/** Booking guide event has at least one notification service configured. */
export function isPhleboGuideConfigured(input: CampReadinessInput): boolean {
  return serviceKeysForEventCode(input.configuredNotifications, "booking_guide").length > 0;
}
