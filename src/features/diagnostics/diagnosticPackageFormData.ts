import type { DiagnosticPackageCreate, DiagnosticPackageDetail, DiagnosticPackageListItem } from "../../lib/api";

export type PackageLinkMode = "own" | "linked";

export type PackageFormState = DiagnosticPackageCreate & {
  linkMode: PackageLinkMode;
  same_as_package_id: number | null;
};

export const EMPTY_PACKAGE_FORM: PackageFormState = {
  package_name: "",
  package_image: null,
  diagnostic_provider: "",
  external_package_code: null,
  collection_type: "",
  gender_suitability: "",
  package_for: "public",
  report_duration_hours: null,
  price: null,
  original_price: null,
  min_price: null,
  is_most_popular: false,
  complementary_consultation: {},
  health_areas_covered: "",
  about_text: "",
  bookings_count: null,
  linkMode: "own",
  same_as_package_id: null,
};

export function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function packageLinkOptionLabel(row: DiagnosticPackageListItem): string {
  const provider = row.diagnostic_provider?.trim() || "—";
  return `${row.package_name} — ${provider}`;
}

export function listItemToForm(row: DiagnosticPackageListItem): PackageFormState {
  return {
    package_name: row.package_name,
    package_image: row.package_image ?? null,
    diagnostic_provider: row.diagnostic_provider ?? "",
    external_package_code: row.external_package_code ?? null,
    collection_type: row.collection_type ?? "",
    gender_suitability: row.gender_suitability ?? "",
    package_for: row.package_for ?? "public",
    report_duration_hours: row.report_duration_hours ?? null,
    price: row.price ?? null,
    original_price: row.original_price ?? null,
    min_price: row.min_price ?? null,
    is_most_popular: !!row.is_most_popular,
    complementary_consultation: row.complementary_consultation ?? {},
    health_areas_covered: "",
    about_text: "",
    bookings_count: null,
    linkMode: (row.same_packages?.length ?? 0) > 0 ? "linked" : "own",
    same_as_package_id: row.same_packages?.[0]?.diagnostic_package_id ?? null,
  };
}

export function detailToForm(detail: DiagnosticPackageDetail, base: PackageFormState): PackageFormState {
  return {
    ...base,
    package_image: detail.package_image ?? base.package_image ?? null,
    min_price: detail.min_price ?? base.min_price ?? null,
    health_areas_covered: detail.health_areas_covered ?? "",
    about_text: detail.about_text ?? "",
    bookings_count: detail.bookings_count ?? base.bookings_count ?? null,
    linkMode: (detail.same_packages?.length ?? 0) > 0 ? "linked" : "own",
    same_as_package_id: detail.same_packages?.[0]?.diagnostic_package_id ?? null,
  };
}

export function buildPackagePayload(form: PackageFormState): DiagnosticPackageCreate {
  return {
    package_name: form.package_name.trim(),
    package_image: form.package_image?.trim() || null,
    diagnostic_provider: form.diagnostic_provider?.trim() || null,
    external_package_code: form.external_package_code?.trim() || null,
    collection_type: form.collection_type?.trim() || null,
    gender_suitability: form.gender_suitability?.trim() || null,
    package_for: (form.package_for as "public" | "camp") || "public",
    report_duration_hours: form.report_duration_hours ?? null,
    price: form.price ?? null,
    original_price: form.original_price ?? null,
    min_price: form.min_price ?? null,
    is_most_popular: !!form.is_most_popular,
    complementary_consultation: form.complementary_consultation ?? {},
    health_areas_covered: form.health_areas_covered?.trim() || null,
    about_text: form.about_text?.trim() || null,
    bookings_count: form.bookings_count ?? null,
  };
}

export function validatePackageForm(form: PackageFormState): string | null {
  if (!form.package_name.trim()) return "Package name is required.";
  if (form.linkMode === "linked" && !form.same_as_package_id) {
    return "Select which existing package this is the same as.";
  }
  return null;
}
