import type { DiagnosticPackageBootstrapOption, DiagnosticPackageGroupListItem } from "../../lib/api";
import { diagnosticPackagesApi } from "../../lib/api";

export function groupRowKey(row: DiagnosticPackageGroupListItem): number {
  return row.package_group_id ?? row.diagnostic_package_id;
}

function providerCount(row: DiagnosticPackageGroupListItem): number {
  return Object.keys(row.package_group ?? {}).length;
}

/** Dedupe camp + public group list responses; keep the row with more lab variants. */
export function mergeGroupRows(rows: DiagnosticPackageGroupListItem[]): DiagnosticPackageGroupListItem[] {
  const byKey = new Map<number, DiagnosticPackageGroupListItem>();
  for (const row of rows) {
    const key = groupRowKey(row);
    const existing = byKey.get(key);
    if (!existing || providerCount(row) > providerCount(existing)) {
      byKey.set(key, row);
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    (a.package_name ?? "").localeCompare(b.package_name ?? "")
  );
}

export function providersForGroup(row: DiagnosticPackageGroupListItem): string[] {
  const keys = Object.keys(row.package_group ?? {});
  if (keys.length > 0) {
    return keys.sort();
  }
  const fallback = (row.diagnostic_provider ?? "").trim();
  return fallback ? [fallback] : [];
}

export function resolvePackageId(
  row: DiagnosticPackageGroupListItem,
  providerKey: string
): number | undefined {
  const fromMap = row.package_group?.[providerKey];
  if (fromMap != null && fromMap > 0) {
    return fromMap;
  }
  const rowProvider = (row.diagnostic_provider ?? "").trim();
  if (rowProvider === providerKey && row.diagnostic_package_id > 0) {
    return row.diagnostic_package_id;
  }
  return undefined;
}

export function findGroupAndProviderForPackageId(
  groups: DiagnosticPackageGroupListItem[],
  packageId: number | null | undefined
): { groupKey: number; providerKey: string } | null {
  if (packageId == null || packageId <= 0) return null;
  for (const row of groups) {
    for (const [providerKey, id] of Object.entries(row.package_group ?? {})) {
      if (Number(id) === Number(packageId)) {
        return { groupKey: groupRowKey(row), providerKey };
      }
    }
    if (Number(row.diagnostic_package_id) === Number(packageId)) {
      const providerKey = (row.diagnostic_provider ?? "").trim();
      if (providerKey) {
        return { groupKey: groupRowKey(row), providerKey };
      }
    }
  }
  return null;
}

export function rowForGroupKey(
  groups: DiagnosticPackageGroupListItem[],
  groupKey: number
): DiagnosticPackageGroupListItem | undefined {
  return groups.find((r) => groupRowKey(r) === groupKey);
}

export function filterGroupsByGender(
  groups: DiagnosticPackageGroupListItem[],
  genderFilter: "male" | "female" | null | undefined
): DiagnosticPackageGroupListItem[] {
  if (!genderFilter) return groups;
  const want = genderFilter.toLowerCase();
  return groups.filter((row) => {
    const suitability = (row.gender_suitability ?? "").trim().toLowerCase();
    if (!suitability || suitability === "both") return true;
    if (suitability === want) return true;
    if (want === "male" && (suitability === "m" || suitability.startsWith("m"))) return true;
    if (want === "female" && (suitability === "f" || suitability.startsWith("f"))) return true;
    return false;
  });
}

export function hasExternalPackageCode(
  packageId: number,
  bootstrapById: Map<number, DiagnosticPackageBootstrapOption> | undefined
): boolean {
  if (!bootstrapById) return true;
  const row = bootstrapById.get(packageId);
  if (!row) return true;
  return Boolean((row.external_package_code ?? "").trim());
}

export async function loadEngagementDiagnosticGroups(): Promise<DiagnosticPackageGroupListItem[]> {
  const [campRes, publicRes] = await Promise.all([
    diagnosticPackagesApi.listGroups({ type: "public_package", package_for: "camp" }),
    diagnosticPackagesApi.listGroups({ type: "public_package", package_for: "public" }),
  ]);
  return mergeGroupRows([...(campRes.data.data ?? []), ...(publicRes.data.data ?? [])]);
}
