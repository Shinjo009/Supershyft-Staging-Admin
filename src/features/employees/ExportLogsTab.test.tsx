import { describe, expect, it } from "vitest";
import { formatExportLogSource } from "./ExportLogsTab";

describe("formatExportLogSource", () => {
  it("shows the engagement name instead of only the id", () => {
    expect(
      formatExportLogSource({
        source_kind: "engagement",
        source_id: "42",
        details: { source_name: "Wellness Camp 2026", engagement_name: "Wellness Camp 2026" },
      })
    ).toEqual({
      title: "Wellness Camp 2026",
      subtitle: "Engagement · #42",
    });
  });

  it("shows the organization name instead of only the id", () => {
    expect(
      formatExportLogSource({
        source_kind: "organization",
        source_id: "88",
        details: {
          source_name: "Acme Health Pvt Ltd",
          organization_name: "Acme Health Pvt Ltd",
        },
      })
    ).toEqual({
      title: "Acme Health Pvt Ltd",
      subtitle: "Organization · #88",
    });
  });

  it("shows organization under an engagement export", () => {
    expect(
      formatExportLogSource({
        source_kind: "engagement",
        source_id: "42",
        details: {
          source_name: "Wellness Camp 2026",
          engagement_name: "Wellness Camp 2026",
          organization_name: "Acme Health Pvt Ltd",
        },
      })
    ).toEqual({
      title: "Wellness Camp 2026",
      subtitle: "Engagement · Acme Health Pvt Ltd",
    });
  });

  it("falls back to kind and id when no name was stored", () => {
    expect(
      formatExportLogSource({
        source_kind: "engagement",
        source_id: "42",
        details: null,
      })
    ).toEqual({
      title: "#42",
      subtitle: "Engagement",
    });
  });
});
