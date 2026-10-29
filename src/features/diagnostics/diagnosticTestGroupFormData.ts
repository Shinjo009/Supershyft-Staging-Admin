import type {
  DiagnosticTestGroupProfileListItem,
  DiagnosticTestGroupStandalone,
} from "../../lib/api";
import { diagnosticProviderDisplayLabel } from "./providerParameterKeys";

export function slugifyGroupKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return slug;
}

export function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Map API enum values to form select option values (matches package form). */
export function normalizeDiagnosticProviderForForm(provider: string | null | undefined): string {
  const raw = (provider ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "healthians") return "Healthians";
  if (lower === "orange_health") return "orange_health";
  if (lower === "healthlabs") return "HealthLabs";
  return raw;
}

export type TestGroupFormState = {
  group_name: string;
  group_key: string;
  test_group_image: string;
  diagnostic_provider: string;
  external_test_group_code: string;
  display_order: string;
  price: string;
  original_price: string;
  is_most_popular: boolean;
  has_allergy_screening: boolean;
  has_cancer_screening: boolean;
  gender_suitability: string;
  package_for: "public" | "camp";
};

export const EMPTY_TEST_GROUP_FORM: TestGroupFormState = {
  group_name: "",
  group_key: "",
  test_group_image: "",
  diagnostic_provider: "",
  external_test_group_code: "",
  display_order: "",
  price: "",
  original_price: "",
  is_most_popular: false,
  has_allergy_screening: false,
  has_cancer_screening: false,
  gender_suitability: "",
  package_for: "public",
};

export function resolveGroupDefaultTestGroupId(
  detail: Pick<
    DiagnosticTestGroupStandalone,
    "group_id" | "is_default_for_group" | "same_test_groups"
  >
): number {
  if (detail.is_default_for_group) return detail.group_id;
  const peerDefault = detail.same_test_groups?.find((p) => p.is_default_for_group);
  if (peerDefault) return peerDefault.group_id;
  return detail.same_test_groups?.[0]?.group_id ?? detail.group_id;
}

export function resolveGroupDefaultTestGroupIdFromListRow(
  row: DiagnosticTestGroupProfileListItem
): number {
  return row.group_id;
}

export function testGroupToForm(row: {
  group_name: string;
  group_key?: string | null;
  test_group_image?: string | null;
  diagnostic_provider?: string | null;
  external_test_group_code?: string | null;
  display_order?: number | null;
  price?: number | null;
  original_price?: number | null;
  is_most_popular?: boolean | null;
  has_allergy_screening?: boolean | null;
  has_cancer_screening?: boolean | null;
  gender_suitability?: string | null;
  package_for?: "public" | "camp" | null;
}): TestGroupFormState {
  return {
    group_name: row.group_name,
    group_key: row.group_key ?? "",
    test_group_image: row.test_group_image ?? "",
    diagnostic_provider: normalizeDiagnosticProviderForForm(row.diagnostic_provider),
    external_test_group_code: row.external_test_group_code ?? "",
    display_order: row.display_order != null ? String(row.display_order) : "",
    price: row.price != null ? String(row.price) : "",
    original_price: row.original_price != null ? String(row.original_price) : "",
    is_most_popular: !!row.is_most_popular,
    has_allergy_screening: !!row.has_allergy_screening,
    has_cancer_screening: !!row.has_cancer_screening,
    gender_suitability: row.gender_suitability ?? "",
    package_for: row.package_for ?? "public",
  };
}

export type TestGroupWritePayload = {
  group_name: string;
  group_key: string;
  test_group_image?: string | null;
  diagnostic_provider?: string | null;
  external_test_group_code?: string | null;
  same_as_group_id?: number;
  copy_tests_from_group_id?: number;
  display_order?: number;
  price?: number | null;
  original_price?: number | null;
  is_most_popular?: boolean;
  has_allergy_screening?: boolean;
  has_cancer_screening?: boolean;
  gender_suitability?: string;
  package_for?: "public" | "camp";
};

export function buildTestGroupPayload(
  form: TestGroupFormState,
  mode: "add" | "edit" = "add",
  options?: { sameAsGroupId?: number | null; copyTestsFromGroupId?: number | null }
): TestGroupWritePayload {
  const groupKey = slugifyGroupKey(form.group_key || form.group_name);
  const externalCode = form.external_test_group_code.trim();
  const payload: TestGroupWritePayload = {
    group_name: form.group_name.trim(),
    group_key: groupKey,
    test_group_image: form.test_group_image.trim() || null,
    diagnostic_provider: form.diagnostic_provider.trim() || null,
    display_order: form.display_order.trim() ? Number(form.display_order) : undefined,
    price: toNumberOrNull(form.price),
    original_price: toNumberOrNull(form.original_price),
    is_most_popular: form.is_most_popular,
    has_allergy_screening: form.has_allergy_screening,
    has_cancer_screening: form.has_cancer_screening,
    gender_suitability: form.gender_suitability.trim() || undefined,
    package_for: form.package_for || "public",
  };
  if (externalCode) {
    payload.external_test_group_code = externalCode;
  } else if (mode === "edit") {
    payload.external_test_group_code = null;
  }
  if (options?.sameAsGroupId) {
    payload.same_as_group_id = options.sameAsGroupId;
  }
  if (options?.copyTestsFromGroupId) {
    payload.copy_tests_from_group_id = options.copyTestsFromGroupId;
  }
  return payload;
}

export function buildJoinGroupMemberLines(detail: DiagnosticTestGroupStandalone): {
  group_id: number;
  group_name: string;
  diagnostic_provider?: string | null;
}[] {
  const lines = [
    {
      group_id: detail.group_id,
      group_name: detail.group_name,
      diagnostic_provider: detail.diagnostic_provider,
    },
  ];
  for (const peer of detail.same_test_groups ?? []) {
    if (lines.some((row) => row.group_id === peer.group_id)) continue;
    lines.push({
      group_id: peer.group_id,
      group_name: peer.group_name,
      diagnostic_provider: peer.diagnostic_provider,
    });
  }
  return lines.sort((a, b) =>
    diagnosticProviderDisplayLabel(a.diagnostic_provider).localeCompare(
      diagnosticProviderDisplayLabel(b.diagnostic_provider)
    )
  );
}
