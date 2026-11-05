export type PeriodPreset =
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "six_months"
  | "one_year"
  | "all_years"
  | "custom";

export interface DateRange {
  from: string;
  to: string;
}

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "this_quarter", label: "This quarter" },
  { id: "six_months", label: "6-months" },
  { id: "one_year", label: "1 year" },
  { id: "all_years", label: "All years" },
  { id: "custom", label: "Custom" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return toKey(new Date());
}

/** 81763 → "81.763k". Counts under 1000 stay as-is. */
export function compactCount(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return `${sign}${Math.round(abs)}`;
  const scaled = abs >= 1_000_000 ? abs / 1_000_000 : abs / 1000;
  const suffix = abs >= 1_000_000 ? "m" : "k";
  const text = scaled.toFixed(3).replace(/\.?0+$/, "");
  return `${sign}${text}${suffix}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  return x;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q + 3, 0);
}

export function presetRange(preset: PeriodPreset, today = todayKey()): DateRange {
  const t = new Date(`${today}T12:00:00`);
  switch (preset) {
    case "this_week":
      return { from: toKey(startOfWeek(t)), to: toKey(endOfWeek(t)) };
    case "this_quarter":
      return { from: toKey(startOfQuarter(t)), to: toKey(endOfQuarter(t)) };
    case "six_months": {
      const from = new Date(t);
      from.setMonth(from.getMonth() - 6);
      return { from: toKey(from), to: today };
    }
    case "one_year": {
      const from = new Date(t);
      from.setFullYear(from.getFullYear() - 1);
      return { from: toKey(from), to: today };
    }
    case "all_years":
      return { from: "2020-01-01", to: today };
    case "this_month":
    default:
      return { from: toKey(startOfMonth(t)), to: toKey(endOfMonth(t)) };
  }
}

export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function fmtDay(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function inr(paise: number): string {
  const rupees = Math.round(paise / 100);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}
