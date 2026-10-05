export type MonthPoint = {
  key: string;
  label: string;
  value: number;
  count?: number;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Last `months` calendar month keys ending at `now`, oldest → newest. */
export function lastMonthKeys(months: number, now = new Date()): string[] {
  const keys: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

/** Last `years` calendar years ending at `now`, oldest → newest. */
export function lastYearKeys(years: number, now = new Date()): string[] {
  const y = now.getFullYear();
  return Array.from({ length: years }, (_, i) => String(y - (years - 1) + i));
}

/**
 * Cumulative users at each year-end.
 * Starting total = overall total minus signups in the year window.
 */
export function buildYearlyCumulativeUserCounts(
  createdAts: string[],
  yearKeys: string[],
  totalUsers: number
): MonthPoint[] {
  const counts = new Map<string, number>();
  for (const key of yearKeys) counts.set(key, 0);

  for (const raw of createdAts) {
    const d = parseDate(raw);
    if (!d) continue;
    const key = String(d.getFullYear());
    if (!counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const inWindow = [...counts.values()].reduce((sum, n) => sum + n, 0);
  let running = Math.max(0, totalUsers - inWindow);

  return yearKeys.map((key) => {
    running += counts.get(key) ?? 0;
    return { key, label: key, value: running };
  });
}

export function buildMonthlyUserCounts(
  createdAts: string[],
  windowKeys: string[]
): MonthPoint[] {
  const counts = new Map<string, number>();
  for (const key of windowKeys) counts.set(key, 0);

  for (const raw of createdAts) {
    const d = parseDate(raw);
    if (!d) continue;
    const key = monthKey(d);
    if (!counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return windowKeys.map((key) => ({
    key,
    label: monthLabel(key),
    value: counts.get(key) ?? 0,
  }));
}

type DateRangeRow = { start_date?: string | null; end_date?: string | null };

/** Count engagements active in each of the last `months` months (start–end overlap). */
export function buildEngagementsActiveByMonth(
  rows: DateRangeRow[],
  months = 12,
  now = new Date()
): MonthPoint[] {
  const keys = lastMonthKeys(months, now);
  return keys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    let count = 0;
    for (const row of rows) {
      const start = parseDate(row.start_date);
      const end = parseDate(row.end_date);
      if (!start || !end) continue;
      if (start <= monthEnd && end >= monthStart) count += 1;
    }
    return { key, label: monthLabel(key), value: count };
  });
}

export function pieSlices(
  parts: { key: string; label: string; value: number; color: string }[]
): { key: string; label: string; value: number; color: string; pct: number }[] {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) {
    return parts.map((p) => ({ ...p, pct: 0 }));
  }
  return parts.map((p) => ({
    ...p,
    pct: Math.round((p.value / total) * 100),
  }));
}
