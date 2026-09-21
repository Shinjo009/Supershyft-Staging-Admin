/** Detect contact values that were redacted for admin display. */
export function isMaskedContact(value: string | null | undefined): boolean {
  if (value == null) return false;
  return String(value).includes("*");
}
