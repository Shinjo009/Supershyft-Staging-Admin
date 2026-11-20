import type { EngagementNotificationSetupEventRow, NotificationServiceItem } from "./api";
import {
  channelLabel,
  formatBindingRecipientLabel,
  resolveServiceLabel,
  type BindingSummaryBinding,
} from "../features/notifications/notificationsUiShared";

export type EngagementNotificationTriggerRow = {
  key: string;
  eventCode: string;
  bindingId?: number;
  serviceKey: string;
  recipientLabel: string;
  notificationLabel: string;
  platformDefault: boolean;
  servicesOnBinding: number;
  binding: BindingSummaryBinding;
};

type BindingSource =
  | EngagementNotificationSetupEventRow["engagement_bindings"][number]
  | EngagementNotificationSetupEventRow["global_bindings"][number];

function notificationLabelForService(
  serviceKey: string,
  bindingChannel: string | null | undefined,
  servicesByKey: Map<string, NotificationServiceItem>
): string {
  const label = resolveServiceLabel(serviceKey, servicesByKey);
  const catalog = servicesByKey.get(serviceKey);
  const svcCh = catalog?.channel?.trim().toLowerCase();
  const bindCh = (bindingChannel ?? "").trim().toLowerCase();
  if (svcCh && bindCh && svcCh !== bindCh) {
    return `${label} (${channelLabel(svcCh)})`;
  }
  return label;
}

export type FlattenEngagementEventNotificationsOptions = {
  /**
   * When true, the engagement already has at least one engagement-level slot
   * somewhere. Empty engagement_bindings for this event then means "no
   * notifications" — do not fall back to platform globals (that made delete
   * look broken after removing the last slot for an event).
   */
  engagementCustomized?: boolean;
};

function coerceBindingId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    if (n > 0) return n;
  }
  return undefined;
}

/** True when any event already has engagement-level notification slots. */
export function engagementHasCustomNotificationSlots(
  events: Pick<EngagementNotificationSetupEventRow, "engagement_bindings">[]
): boolean {
  return events.some((e) => (e.engagement_bindings?.length ?? 0) > 0);
}

export function flattenEngagementEventNotifications(
  event: EngagementNotificationSetupEventRow,
  servicesByKey: Map<string, NotificationServiceItem>,
  options?: FlattenEngagementEventNotificationsOptions
): EngagementNotificationTriggerRow[] {
  const engagementCustomized = Boolean(options?.engagementCustomized);
  // Prefer engagement slots whenever this event has them, or when the engagement
  // is already customized (even if this event's list is intentionally empty).
  const useEngagement = event.engagement_bindings.length > 0 || engagementCustomized;
  const bindings: BindingSource[] = useEngagement
    ? event.engagement_bindings
    : event.global_bindings;

  const rows: EngagementNotificationTriggerRow[] = [];
  for (const binding of bindings) {
    const services = (binding.notification_services ?? []).filter((s) => (s.service_key ?? "").trim());
    const recipientLabel = formatBindingRecipientLabel(binding);
    const bindingId = "id" in binding ? coerceBindingId(binding.id) : undefined;
    for (const svc of services) {
      const serviceKey = svc.service_key.trim();
      rows.push({
        key: `${bindingId ?? "global"}-${serviceKey}-${svc.external_link ?? ""}`,
        eventCode: event.event_code,
        bindingId,
        serviceKey,
        recipientLabel,
        notificationLabel: notificationLabelForService(
          serviceKey,
          binding.delivery_channel,
          servicesByKey
        ),
        platformDefault: !useEngagement,
        servicesOnBinding: services.length,
        binding,
      });
    }
  }
  return rows;
}

export function formatEngagementEventTriggerSummary(rows: EngagementNotificationTriggerRow[]): string {
  if (rows.length === 0) {
    return "No notifications configured";
  }
  const total = rows.length;
  const byRecipient = new Map<string, number>();
  for (const row of rows) {
    byRecipient.set(row.recipientLabel, (byRecipient.get(row.recipientLabel) ?? 0) + 1);
  }
  const parts = [...byRecipient.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => `${count} for ${label}`);
  const head = total === 1 ? "1 notification triggered" : `${total} notifications triggered`;
  if (rows.every((r) => r.platformDefault)) {
    return `${head} · ${parts.join(" · ")} (platform defaults)`;
  }
  return `${head} · ${parts.join(" · ")}`;
}