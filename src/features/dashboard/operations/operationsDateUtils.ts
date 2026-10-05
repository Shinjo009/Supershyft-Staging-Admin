const PENDING_THRESHOLD_MINUTES = 15;

export function todayISO(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday–Sunday of the local calendar week containing `now`. */
export function weekRangeLocal(now = new Date()): { start: string; end: string } {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: todayISO(start), end: todayISO(end) };
}

export function datePart(value?: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function rangesOverlap(
  start?: string | null,
  end?: string | null,
  rangeStart?: string,
  rangeEnd?: string
): boolean {
  const startDate = datePart(start);
  const endDate = datePart(end);
  if (!startDate || !endDate || !rangeStart || !rangeEnd) return false;
  return startDate <= rangeEnd && endDate >= rangeStart;
}

export function isDueToday(due?: string | null, now = new Date()): boolean {
  const dueDate = datePart(due);
  if (!dueDate) return false;
  return dueDate === todayISO(now);
}

export function pendingMinutes(bookedAt: string, now = Date.now()): number | null {
  const timestamp = new Date(bookedAt).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.floor((now - timestamp) / 60_000);
}

export function isPendingOverThreshold(bookedAt: string, now = Date.now()): boolean {
  const minutes = pendingMinutes(bookedAt, now);
  return minutes != null && minutes > PENDING_THRESHOLD_MINUTES;
}

export function formatPendingFor(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (remainder === 0) return `${hours}h`;
    return `${hours}h ${remainder}m`;
  }
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  if (hours === 0) return `${days}d`;
  return `${days}d ${hours}h`;
}

export function formatShortDate(value?: string | null): string {
  const raw = datePart(value);
  if (!raw) return "—";
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatClockTime(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  const date = parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = parsed.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}`;
}

export function formatAmountPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
