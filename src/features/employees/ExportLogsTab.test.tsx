import { describe, expect, it } from "vitest";
import { formatExportLogSource } from "./ExportLogsTab";

describe("formatExportLogSource", () => {
  it("shows the engagement name instead of only the id", () => {
    expect(
      formatExportLogSource({
        details: {
          source_kind: "engagement",
          source_id: "42",
          source_name: "Wellness Camp 2026",
          engagement_name: "Wellness Camp 2026",
        },
      })
    ).toEqual({
      title: "Wellness Camp 2026",
      subtitle: "Engagement · #42",
    });
  });

  it("shows the organization name instead of only the id", () => {
    expect(
      formatExportLogSource({
        details: {
          source_kind: "organization",
          source_id: "88",
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
        details: {
          source_kind: "engagement",
          source_id: "42",
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
        details: {
          source_kind: "engagement",
          source_id: "42",
        },
      })
    ).toEqual({
      title: "#42",
      subtitle: "Engagement",
    });
  });

  it("shows user source for contact reveal", () => {
    expect(
      formatExportLogSource({
        details: {
          source_kind: "user",
          source_id: "12345",
          export_format: null,
          exported_participants: [12345],
        },
      })
    ).toEqual({
      title: "#12345",
      subtitle: "User",
    });
  });
});
