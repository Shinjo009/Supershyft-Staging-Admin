import type { EngagementCreate, PackageTestsResponse } from "../../lib/api";
import { useEffect, useMemo, useState } from "react";
import { diagnosticPackagesApi } from "../../lib/api";

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

/** True once the hormone lookup for the current diagnostic package has finished. */
export function isMetsightsProGateResolved(
  enabled: boolean,
  proGatePackageId: number | undefined,
  checkedPackageId: number | null
): boolean {
  if (!enabled) return true;
  if (!proGatePackageId) return true;
  return checkedPackageId === proGatePackageId;
}

/**
 * Drop a saved Metsights Pro selection only after the diagnostic hormone check
 * has finished and the package is still missing required hormones.
 * While the check is in flight, an empty key set looks disallowed and would
 * wipe a value that was already saved on the engagement.
 */
export function shouldResetDisallowedMetsightsPro(options: {
  applyGate: boolean;
  gateResolved: boolean;
  selectedPackageId: number | null | undefined;
  metsightsProPackageId: number | null;
  allowed: boolean;
}): boolean {
  if (!options.applyGate || !options.gateResolved) return false;
  if (options.metsightsProPackageId == null) return false;
  if (options.selectedPackageId !== options.metsightsProPackageId) return false;
  return !options.allowed;
}

export function useMetsightsProGateState(options: {
  enabled: boolean;
  packageMode: "single" | "split";
  diagnosticPackageId: number | null | undefined;
  diagnosticPackageIdFemale: number | null | undefined;
}) {
  const { enabled, packageMode, diagnosticPackageId, diagnosticPackageIdFemale } = options;

  const proGatePackageId = useMemo(() => {
    if (!enabled) return undefined;
    return diagnosticPackageIdForProGate(packageMode, {
      diagnostic_package_id: diagnosticPackageId ?? undefined,
      diagnostic_package_id_female: diagnosticPackageIdFemale ?? undefined,
    });
  }, [enabled, packageMode, diagnosticPackageId, diagnosticPackageIdFemale]);

  const [proGateParameterKeys, setProGateParameterKeys] = useState<Set<string>>(() => new Set());
  const [proGateLoading, setProGateLoading] = useState(false);
  const [proGateCheckedPackageId, setProGateCheckedPackageId] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !proGatePackageId) {
      setProGateParameterKeys(new Set());
      setProGateCheckedPackageId(null);
      setProGateLoading(false);
      return;
    }
    let cancelled = false;
    setProGateLoading(true);
    setProGateCheckedPackageId(null);
    diagnosticPackagesApi
      .getTests(proGatePackageId)
      .then((res) => {
        if (cancelled) return;
        setProGateParameterKeys(collectParameterKeysFromTests(res.data.data));
      })
      .catch(() => {
        if (!cancelled) setProGateParameterKeys(new Set());
      })
      .finally(() => {
        if (!cancelled) {
          setProGateLoading(false);
          setProGateCheckedPackageId(proGatePackageId);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, proGatePackageId]);

  const proGateResolved = isMetsightsProGateResolved(
    enabled,
    proGatePackageId,
    proGateCheckedPackageId
  );

  const metsightsProAllowed = useMemo(() => {
    if (!enabled) return true;
    return isMetsightsProAllowed(proGateParameterKeys, proGatePackageId);
  }, [enabled, proGateParameterKeys, proGatePackageId]);

  const metsightsProMissingLabels = useMemo(() => {
    if (!enabled || !proGatePackageId) return [];
    return missingMetsightsProHormones(proGateParameterKeys);
  }, [enabled, proGateParameterKeys, proGatePackageId]);

  return {
    proGatePackageId,
    proGateLoading,
    proGateResolved,
    metsightsProAllowed,
    metsightsProMissingLabels,
  };
}
