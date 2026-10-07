import type { DiagnosticTestStandalone } from "../../lib/api";

export function isHealthiansProvider(provider: string | null | undefined): boolean {
  return (provider ?? "").trim().toLowerCase() === "healthians";
}

export function isOrangeHealthProvider(provider: string | null | undefined): boolean {
  return (provider ?? "").trim().toLowerCase() === "orange_health";
}

/** Human-readable provider name for labels (Healthians, Orange Health, …). */
export function diagnosticProviderDisplayLabel(provider: string | null | undefined): string {
  const raw = (provider ?? "").trim();
  if (!raw) return "Provider";
  const normalized = raw.toLowerCase();
  if (normalized === "orange_health") return "Orange Health";
  if (normalized === "healthians") return "Healthians";
  if (normalized === "healthlabs") return "HealthLabs";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function providerParameterKeyForPackage(
  test: Pick<DiagnosticTestStandalone, "healthians_parameter_key" | "orangehealth_parameter_key">,
  provider: string | null | undefined
): string | null {
  const raw = isOrangeHealthProvider(provider)
    ? test.orangehealth_parameter_key
    : test.healthians_parameter_key;
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  return trimmed || null;
}

export function isProviderParameterMapped(
  test: Pick<DiagnosticTestStandalone, "healthians_parameter_key" | "orangehealth_parameter_key">,
  provider: string | null | undefined
): boolean {
  return providerParameterKeyForPackage(test, provider) != null;
}
