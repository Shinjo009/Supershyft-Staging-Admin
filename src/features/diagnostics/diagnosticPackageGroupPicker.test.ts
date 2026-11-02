import { describe, expect, it } from "vitest";
import type { DiagnosticPackageGroupListItem } from "../../lib/api";
import {
  findGroupAndProviderForPackageId,
  groupRowKey,
  mergeGroupRows,
  resolvePackageId,
} from "./diagnosticPackageGroupPicker";

function row(
  partial: Partial<DiagnosticPackageGroupListItem> & Pick<DiagnosticPackageGroupListItem, "diagnostic_package_id" | "package_name">
): DiagnosticPackageGroupListItem {
  return {
    package_group: {},
    ...partial,
  };
}

describe("mergeGroupRows", () => {
  it("dedupes by group id and keeps row with more providers", () => {
    const camp = row({
      diagnostic_package_id: 1,
      package_group_id: 10,
      package_name: "Core",
      package_group: { healthians: 1 },
    });
    const pub = row({
      diagnostic_package_id: 2,
      package_group_id: 10,
      package_name: "Core",
      package_group: { healthians: 1, orange_health: 2 },
    });
    const merged = mergeGroupRows([camp, pub]);
    expect(merged).toHaveLength(1);
    expect(Object.keys(merged[0].package_group ?? {})).toHaveLength(2);
  });
});

describe("resolvePackageId", () => {
  it("maps provider key to package id", () => {
    const g = row({
      diagnostic_package_id: 5,
      package_name: "X",
      package_group: { healthians: 5, orange_health: 9 },
    });
    expect(resolvePackageId(g, "orange_health")).toBe(9);
  });
});

describe("findGroupAndProviderForPackageId", () => {
  it("reverse lookup from stored diagnostic_package_id", () => {
    const groups = [
      row({
        diagnostic_package_id: 1,
        package_group_id: 99,
        package_name: "Core",
        package_group: { healthians: 1, orange_health: 2 },
      }),
    ];
    const match = findGroupAndProviderForPackageId(groups, 2);
    expect(match).toEqual({ groupKey: groupRowKey(groups[0]), providerKey: "orange_health" });
  });
});
