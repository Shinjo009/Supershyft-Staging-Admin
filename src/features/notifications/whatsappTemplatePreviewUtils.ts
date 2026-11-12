/** Meta WhatsApp template name + positional body preview helpers. */

export function canonicalTemplateNameForLookup(name: string): string {
  return (name || "").trim().replace(/\s+/g, "_");
}

export function renderPositionalTemplateBody(
  bodyText: string,
  values: (string | null | undefined)[]
): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_, raw: string) => {
    const index = Number.parseInt(raw, 10) - 1;
    if (!Number.isFinite(index) || index < 0) return `{{${raw}}}`;
    const val = values[index];
    if (val != null && String(val).trim() !== "") {
      return String(val);
    }
    return `{{${raw}}}`;
  });
}
