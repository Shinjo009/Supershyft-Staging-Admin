import { describe, expect, it } from "vitest";
import {
  buildEngagementsActiveByMonth,
  buildMonthlyUserCounts,
  buildYearlyCumulativeUserCounts,
  lastMonthKeys,
  lastYearKeys,
  pieSlices,
} from "./overviewChartUtils";

describe("overviewChartUtils", () => {
  it("builds last N month keys ending at now", () => {
    const keys = lastMonthKeys(3, new Date(2026, 9, 3));
    expect(keys).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("builds last N year keys ending at now", () => {
    const keys = lastYearKeys(3, new Date(2026, 9, 3));
    expect(keys).toEqual(["2024", "2025", "2026"]);
  });

  it("builds yearly cumulative user totals", () => {
    const points = buildYearlyCumulativeUserCounts(
      ["2025-03-01T00:00:00Z", "2026-01-01T00:00:00Z", "2026-06-01T00:00:00Z"],
      ["2025", "2026"],
      10
    );
    expect(points.map((p) => p.value)).toEqual([8, 10]);
  });

  it("builds monthly new-user counts from created_at", () => {
    const points = buildMonthlyUserCounts(
      ["2026-09-10T00:00:00Z", "2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z"],
      ["2026-09", "2026-10"]
    );
    expect(points.map((p) => p.value)).toEqual([1, 2]);
  });

  it("counts engagements active per month from start/end", () => {
    const points = buildEngagementsActiveByMonth(
      [
        { start_date: "2026-09-01", end_date: "2026-10-15" },
        { start_date: "2026-10-01", end_date: "2026-10-20" },
      ],
      2,
      new Date(2026, 9, 3)
    );
    expect(points.map((p) => p.value)).toEqual([1, 2]);
  });

  it("computes pie percents", () => {
    const slices = pieSlices([
      { key: "a", label: "A", value: 1, color: "#000" },
      { key: "b", label: "B", value: 3, color: "#111" },
    ]);
    expect(slices.map((s) => s.pct)).toEqual([25, 75]);
  });
});
