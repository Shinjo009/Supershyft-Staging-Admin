/** Local calendar dates (YYYY-MM-DD) for home-collection slot pickers. */
export function getNextLocalDates(count: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

export function formatHomeCollectionDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function isOrangeHealthProvider(provider?: string | null): boolean {
  return (provider ?? "").trim().toLowerCase() === "orange_health";
}

export function diagnosticProviderLabel(provider?: string | null): string {
  const normalized = (provider ?? "").trim().toLowerCase();
  if (normalized === "orange_health") return "Orange Health";
  if (normalized === "healthians") return "Healthians";
  if (!normalized) return "Diagnostic partner";
  return (provider ?? "").trim();
}
