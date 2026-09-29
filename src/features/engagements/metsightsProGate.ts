import type { EngagementCreate, PackageTestsResponse } from "../../lib/api";

export const METSIGHTS_PRO_PACKAGE_CODE = "METSIGHTS_PRO";

const HORMONE_GROUPS: { label: string; keys: string[] }[] = [
  { label: "LH", keys: ["lh", "lh_value"] },
  { label: "FSH", keys: ["fsh", "fsh_value"] },
  { label: "total testosterone", keys: ["total_testosterone", "testosterone"] },
];

export function collectParameterKeysFromTests(response: PackageTestsResponse): Set<string> {
  const keys = new Set<string>();
  for (const group of response.groups ?? []) {
    for (const test of group.tests ?? []) {
      const key = (test.parameter_key ?? "").trim().toLowerCase();
      if (key) keys.add(key);
    }
  }
  return keys;
}

export function missingMetsightsProHormones(parameterKeys: Set<string>): string[] {
  const missing: string[] = [];
  for (const group of HORMONE_GROUPS) {
    if (!group.keys.some((k) => parameterKeys.has(k))) {
      missing.push(group.label);
    }
  }
  return missing;
}

export function diagnosticPackageIdForProGate(
  packageMode: "single" | "split",
  formData: Pick<
    EngagementCreate,
    "diagnostic_package_id" | "diagnostic_package_id_female"
  >
): number | undefined {
  if (packageMode === "split") {
    const id = formData.diagnostic_package_id_female;
    return id && id > 0 ? id : undefined;
  }
  const id = formData.diagnostic_package_id;
  return id && id > 0 ? id : undefined;
}

export function isMetsightsProAllowed(
  parameterKeys: Set<string>,
  proGatePackageId: number | undefined
): boolean {
  if (!proGatePackageId || proGatePackageId <= 0) return false;
  return missingMetsightsProHormones(parameterKeys).length === 0;
}
