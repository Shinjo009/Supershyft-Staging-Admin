import { useEffect, useMemo, useState } from "react";
import type { B2cOnboardingTypeDefaults, DiagnosticPackageBootstrapOption } from "../../lib/api";
import { getTypeConfig } from "../engagements/engagementTypeConfig";
import {
  collectParameterKeysFromTests,
  diagnosticPackageIdForProGate,
  isMetsightsProAllowed,
  missingMetsightsProHormones,
  METSIGHTS_PRO_PACKAGE_CODE,
} from "../engagements/metsightsProGate";
import { diagnosticPackagesApi } from "../../lib/api";
import type { B2cDefaultsByType } from "./settingsUtils";

export { METSIGHTS_PRO_PACKAGE_CODE };

export const METSIGHTS_PRO_HORMONE_ROWS = [
  { label: "LH", keys: ["lh", "lh_value"] },
  { label: "FSH", keys: ["fsh", "fsh_value"] },
  { label: "total testosterone", keys: ["total_testosterone", "testosterone"] },
] as const;

export function hormonePresenceRows(parameterKeys: Set<string>): { label: string; present: boolean }[] {
  return METSIGHTS_PRO_HORMONE_ROWS.map((row) => ({
    label: row.label,
    present: row.keys.some((k) => parameterKeys.has(k)),
  }));
}

export function b2cDefaultsDiagnosticMode(
  defaults: Pick<B2cOnboardingTypeDefaults, "diagnostic_package_id_male" | "diagnostic_package_id_female">
): "single" | "split" {
  return (defaults.diagnostic_package_id_male ?? 0) > 0 || (defaults.diagnostic_package_id_female ?? 0) > 0
    ? "split"
    : "single";
}

export function b2cTypeNeedsProGate(typeCode: string): boolean {
  const config = getTypeConfig(typeCode);
  return config.needsMetsights && config.needsDiagnostic;
}

export type B2cTypeProGateStatus = {
  typeCode: string;
  displayName: string;
  packageMode: "single" | "split";
  proGatePackageId: number | undefined;
  diagnosticPackageLabel: string;
  isProSelected: boolean;
  loading: boolean;
  resolved: boolean;
  allowed: boolean;
  missingLabels: string[];
  blocked: boolean;
};

function diagnosticLabel(
  packageId: number | undefined,
  bootstrapById: Map<number, DiagnosticPackageBootstrapOption>
): string {
  if (!packageId) return "No diagnostic package selected";
  const row = bootstrapById.get(packageId);
  const name = row?.package_name?.trim();
  return name ? `${name} (#${packageId})` : `Diagnostic package #${packageId}`;
}

export function evaluateB2cTypeProGateStatus(options: {
  typeCode: string;
  displayName: string;
  defaults: B2cOnboardingTypeDefaults;
  metsightsProPackageId: number | null;
  keysByPackageId: Map<number, Set<string>>;
  loadingPackageIds: Set<number>;
  diagnosticBootstrapById: Map<number, DiagnosticPackageBootstrapOption>;
}): B2cTypeProGateStatus {
  const {
    typeCode,
    displayName,
    defaults,
    metsightsProPackageId,
    keysByPackageId,
    loadingPackageIds,
    diagnosticBootstrapById,
  } = options;

  const packageMode = b2cDefaultsDiagnosticMode(defaults);
  const needsGate = b2cTypeNeedsProGate(typeCode);
  const isProSelected =
    metsightsProPackageId != null && defaults.assessment_package_id === metsightsProPackageId;
  const proGatePackageId = needsGate
    ? diagnosticPackageIdForProGate(packageMode, {
        diagnostic_package_id: defaults.diagnostic_package_id ?? undefined,
        diagnostic_package_id_female: defaults.diagnostic_package_id_female ?? undefined,
      })
    : undefined;

  const loading = Boolean(proGatePackageId && loadingPackageIds.has(proGatePackageId));

  let gateResolved = true;
  if (needsGate && isProSelected && proGatePackageId) {
    gateResolved = !loading && keysByPackageId.has(proGatePackageId);
  }

  const keys =
    proGatePackageId && keysByPackageId.has(proGatePackageId)
      ? (keysByPackageId.get(proGatePackageId) ?? new Set())
      : new Set<string>();

  let allowed = true;
  if (needsGate && isProSelected) {
    if (!proGatePackageId) {
      allowed = false;
    } else if (gateResolved) {
      allowed = isMetsightsProAllowed(keys, proGatePackageId);
    } else {
      allowed = true;
    }
  }

  const missingLabels =
    needsGate && isProSelected && proGatePackageId && gateResolved
      ? missingMetsightsProHormones(keys)
      : [];

  const blocked = needsGate && isProSelected && gateResolved && !allowed;

  return {
    typeCode,
    displayName,
    packageMode,
    proGatePackageId,
    diagnosticPackageLabel: diagnosticLabel(proGatePackageId, diagnosticBootstrapById),
    isProSelected,
    loading,
    resolved: gateResolved,
    allowed,
    missingLabels,
    blocked,
  };
}

export function useB2cOnboardingProGateStatuses(options: {
  engagementTypes: { code: string; display_name: string }[];
  defaultsByType: B2cDefaultsByType;
  metsightsProPackageId: number | null;
  diagnosticBootstrapById: Map<number, DiagnosticPackageBootstrapOption>;
}) {
  const { engagementTypes, defaultsByType, metsightsProPackageId, diagnosticBootstrapById } = options;

  const packageIdsToLoad = useMemo(() => {
    const ids = new Set<number>();
    for (const t of engagementTypes) {
      if (!b2cTypeNeedsProGate(t.code)) continue;
      const defaults = defaultsByType[t.code];
      if (!defaults || metsightsProPackageId == null) continue;
      if (defaults.assessment_package_id !== metsightsProPackageId) continue;
      const mode = b2cDefaultsDiagnosticMode(defaults);
      const id = diagnosticPackageIdForProGate(mode, {
        diagnostic_package_id: defaults.diagnostic_package_id ?? undefined,
        diagnostic_package_id_female: defaults.diagnostic_package_id_female ?? undefined,
      });
      if (id) ids.add(id);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [engagementTypes, defaultsByType, metsightsProPackageId]);

  const packageIdsKey = packageIdsToLoad.join(",");

  const [keysByPackageId, setKeysByPackageId] = useState<Map<number, Set<string>>>(() => new Map());
  const [loadingPackageIds, setLoadingPackageIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (packageIdsToLoad.length === 0) {
      setKeysByPackageId(new Map());
      setLoadingPackageIds(new Set());
      return;
    }
    let cancelled = false;
    setLoadingPackageIds(new Set(packageIdsToLoad));
    void (async () => {
      const next = new Map<number, Set<string>>();
      await Promise.all(
        packageIdsToLoad.map(async (packageId) => {
          try {
            const res = await diagnosticPackagesApi.getTests(packageId);
            if (cancelled) return;
            next.set(packageId, collectParameterKeysFromTests(res.data.data));
          } catch {
            if (!cancelled) next.set(packageId, new Set());
          }
        })
      );
      if (cancelled) return;
      setKeysByPackageId(next);
      setLoadingPackageIds(new Set());
    })();
    return () => {
      cancelled = true;
    };
  }, [packageIdsKey, packageIdsToLoad]);

  const statuses = useMemo(() => {
    return engagementTypes
      .filter((t) => b2cTypeNeedsProGate(t.code))
      .map((t) =>
        evaluateB2cTypeProGateStatus({
          typeCode: t.code,
          displayName: t.display_name,
          defaults: defaultsByType[t.code] ?? ({} as B2cOnboardingTypeDefaults),
          metsightsProPackageId,
          keysByPackageId,
          loadingPackageIds,
          diagnosticBootstrapById,
        })
      );
  }, [
    engagementTypes,
    defaultsByType,
    metsightsProPackageId,
    keysByPackageId,
    loadingPackageIds,
    diagnosticBootstrapById,
  ]);

  const blockedTypes = statuses.filter((s) => s.blocked);
  const firstBlockedTypeCode = blockedTypes[0]?.typeCode ?? null;
  const anyBlocked = blockedTypes.length > 0;
  const anyLoading = statuses.some((s) => s.loading);

  const activeStatus = (typeCode: string) => statuses.find((s) => s.typeCode === typeCode);

  return {
    statuses,
    blockedTypes,
    firstBlockedTypeCode,
    anyBlocked,
    anyLoading,
    activeStatus,
    keysByPackageId,
  };
}
