/** Build positional preview values from wizard slots or saved template_variables JSON. */

const SOURCE_PLACEHOLDERS: Record<string, string> = {
  "user.first_name": "[First name]",
  "user.last_name": "[Last name]",
  "user.name": "[Name]",
  "user.phone": "[Phone]",
  "user.email": "[Email]",
  "staff.name": "[Staff name]",
  "staff.first_name": "[Staff first name]",
  "staff.phone": "[Staff phone]",
  "participant.name": "[Participant]",
  "participant.first_name": "[Participant first name]",
  "otp.otp": "[OTP]",
  "otp": "[OTP]",
};

function placeholderForSource(source: string): string {
  const key = source.trim();
  if (SOURCE_PLACEHOLDERS[key]) return SOURCE_PLACEHOLDERS[key];
  const leaf = key.split(".").pop() ?? key;
  const label = leaf.replace(/_/g, " ");
  return `[${label.charAt(0).toUpperCase()}${label.slice(1)}]`;
}

type SlotConfig = { index?: number; source?: string; value?: string };

function parseTemplateVariablesJson(raw: string): { slots?: SlotConfig[] } | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as { slots?: SlotConfig[] };
  } catch {
    return null;
  }
}

export function previewValuesForWizardSlots(
  slotValues: string[],
  exampleValues: string[] | null | undefined,
  bodyCount: number
): string[] {
  const count = Math.max(bodyCount, slotValues.length, exampleValues?.length ?? 0);
  return Array.from({ length: count }, (_, i) => {
    const typed = slotValues[i]?.trim();
    if (typed) {
      const varMatch = /^\{\{(.+)\}\}$/.exec(typed);
      if (varMatch) return placeholderForSource(varMatch[1]);
      return typed;
    }
    return exampleValues?.[i] ?? "";
  });
}

export function previewValuesFromTemplateVariablesJson(
  templateVariablesJson: string,
  exampleValues: string[] | null | undefined
): string[] {
  const parsed = parseTemplateVariablesJson(templateVariablesJson);
  const slots = parsed?.slots;
  if (!Array.isArray(slots) || slots.length === 0) {
    return [...(exampleValues ?? [])];
  }
  const byIndex = new Map<number, string>();
  let maxIndex = 0;
  for (const slot of slots) {
    const idx = typeof slot.index === "number" ? slot.index : 0;
    maxIndex = Math.max(maxIndex, idx);
    const source = String(slot.source ?? "").trim();
    if (source === "literal") {
      byIndex.set(idx, String(slot.value ?? ""));
    } else if (source) {
      byIndex.set(idx, placeholderForSource(source));
    }
  }
  const count = Math.max(maxIndex, exampleValues?.length ?? 0);
  return Array.from({ length: count }, (_, i) => {
    const oneBased = i + 1;
    if (byIndex.has(oneBased)) return byIndex.get(oneBased) ?? "";
    return exampleValues?.[i] ?? "";
  });
}
