import { formatExpertType } from "../expertConsultationListUtils";

export { formatExpertType };

export function greetingFromHour(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function firstNameFromDisplayName(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim();
  if (!trimmed || trimmed === "—") return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}

export function formatLongDate(value: Date = new Date()): string {
  return value.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatCampDate(isoDate?: string | null): string | null {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatSlot12h(slot?: string | null): string {
  if (!slot) return "—";
  const parts = slot.trim().split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] ?? 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return slot;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

export function personName(
  firstName?: string | null,
  lastName?: string | null,
  fallbackId?: number
): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (fallbackId != null) return `User #${fallbackId}`;
  return "—";
}

export function formatWaiting(minutes?: number | null): string {
  if (minutes == null) return "Requested";
  if (minutes < 1) return "Requested just now";
  if (minutes < 60) return `Requested ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Requested ${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Requested ${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return "0 hrs";
  const rounded = Math.round(hours * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} hrs`;
}

export function engagementLabel(name?: string | null, code?: string | null, id?: number): string {
  return name || code || (id != null ? `Engagement ${id}` : "—");
}

export function consultationStatusLabel(status: string): string {
  if (status === "live_now") return "Live Now";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Upcoming";
}

export function consultationStatusClass(status: string): string {
  if (status === "live_now") return "bg-emerald-50 text-emerald-700";
  if (status === "completed") return "bg-zinc-100 text-zinc-600";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}
