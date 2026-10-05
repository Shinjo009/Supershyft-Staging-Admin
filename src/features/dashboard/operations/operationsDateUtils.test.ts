import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatPendingFor,
  isDueToday,
  isPendingOverThreshold,
  pendingMinutes,
  rangesOverlap,
  todayISO,
  weekRangeLocal,
} from "./operationsDateUtils";

describe("operationsDateUtils", () => {
  it("uses the local calendar date", () => {
    expect(todayISO(new Date(2026, 9, 2, 23, 30))).toBe("2026-10-02");
  });

  it("treats Monday as the start of the week", () => {
    expect(weekRangeLocal(new Date(2026, 9, 2))).toEqual({
      start: "2026-09-28",
      end: "2026-10-04",
    });
  });

  it("treats Sunday as the end of the current week", () => {
    expect(weekRangeLocal(new Date(2026, 9, 4))).toEqual({
      start: "2026-09-28",
      end: "2026-10-04",
    });
  });

  it("matches overlapping engagement dates", () => {
    expect(rangesOverlap("2026-09-01", "2026-10-02", "2026-09-28", "2026-10-04")).toBe(true);
    expect(rangesOverlap("2026-10-10", "2026-10-12", "2026-09-28", "2026-10-04")).toBe(false);
  });

  it("marks a checklist due date as today only on the same calendar day", () => {
    const now = new Date(2026, 9, 2, 18, 0);
    expect(isDueToday("2026-10-02", now)).toBe(true);
    expect(isDueToday("2026-10-02T23:00:00Z", now)).toBe(true);
    expect(isDueToday("2026-10-03", now)).toBe(false);
    expect(isDueToday(null, now)).toBe(false);
  });

  it("flags payments pending for more than 15 minutes", () => {
    const now = Date.parse("2026-10-02T10:45:00Z");
    expect(isPendingOverThreshold("2026-10-02T10:20:00Z", now)).toBe(true);
    expect(pendingMinutes("2026-10-02T10:20:00Z", now)).toBe(25);
    expect(isPendingOverThreshold("2026-10-02T10:30:00Z", now)).toBe(false);
    expect(isPendingOverThreshold("2026-10-02T10:40:00Z", now)).toBe(false);
  });

  it("formats pending duration with minutes, hours, and days", () => {
    expect(formatPendingFor(25)).toBe("25 min");
    expect(formatPendingFor(60)).toBe("1h");
    expect(formatPendingFor(200)).toBe("3h 20m");
    expect(formatPendingFor(24 * 60)).toBe("1d");
    expect(formatPendingFor(1729 * 60 + 23)).toBe("72d 1h");
  });

  it("formats date and time together", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
    const formatted = formatDateTime("2026-10-02T07:00:00.000Z");
    expect(formatted).toMatch(/Oct/);
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/,/);
  });
});
