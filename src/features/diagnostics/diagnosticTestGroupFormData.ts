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

export type TestGroupFormState = {
  group_name: string;
  group_key: string;
  healthians_group_code: string;
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
  healthians_group_code: "",
  display_order: "",
  price: "",
  original_price: "",
  is_most_popular: false,
  has_allergy_screening: false,
  has_cancer_screening: false,
  gender_suitability: "",
  package_for: "public",
};

export function testGroupToForm(row: {
  group_name: string;
  group_key?: string | null;
  healthians_group_code?: string | null;
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
    healthians_group_code: row.healthians_group_code ?? "",
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
  healthians_group_code?: string | null;
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
  mode: "add" | "edit" = "add"
): TestGroupWritePayload {
  const groupKey = slugifyGroupKey(form.group_key || form.group_name);
  const healthiansCode = form.healthians_group_code.trim();
  const payload: TestGroupWritePayload = {
    group_name: form.group_name.trim(),
    group_key: groupKey,
    display_order: form.display_order.trim() ? Number(form.display_order) : undefined,
    price: toNumberOrNull(form.price),
    original_price: toNumberOrNull(form.original_price),
    is_most_popular: form.is_most_popular,
    has_allergy_screening: form.has_allergy_screening,
    has_cancer_screening: form.has_cancer_screening,
    gender_suitability: form.gender_suitability.trim() || undefined,
    package_for: form.package_for || "public",
  };
  if (healthiansCode) {
    payload.healthians_group_code = healthiansCode;
  } else if (mode === "edit") {
    payload.healthians_group_code = null;
  }
  return payload;
}
