import type { EngagementNotificationItem, NotificationBindingItem } from "./api";

export function pickEngagementBindingById(
  items: EngagementNotificationItem[],
  bindingId: number
): EngagementNotificationItem | undefined {
  return items.find((row) => row.id === bindingId);
}

/** Map an engagement notification slot to the shape used by the binding wizard hydrate path. */
export function engagementNotificationToBindingItem(
  slot: EngagementNotificationItem
): NotificationBindingItem {
  const services = slot.notification_services ?? [];
  const serviceKey = services[0]?.service_key?.trim() || null;
  const channel = (slot.delivery_channel ?? "whatsapp").trim().toLowerCase();
  return {
    id: slot.id,
    event_code: slot.event_code,
    event_name: slot.event_display_name?.trim() || slot.event_code,
    recipient_type: slot.recipient_type?.trim() || "user",
    delivery_channel: channel === "email" ? "email" : "whatsapp",
    notification_services: services,
    engagement_type_id: null,
    recipient_config: slot.recipient_config ?? null,
    service_key: serviceKey,
    condition_key: slot.condition_key,
    emit_condition: slot.emit_condition ?? null,
  };
}