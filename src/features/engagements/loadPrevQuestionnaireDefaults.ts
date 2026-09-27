/** Default category keys when load-prev is enabled and none are configured (matches API). */
export const DEFAULT_LOAD_PREV_QUESTIONNAIRE_CATEGORY_KEYS: string[] = [
  "physical-measurement",
  "diet-lifestyle-parameters",
  "anthropometry",
  "nutrition_log",
  "family_history",
];

export function effectiveLoadPrevCategoryKeys(keys: string[] | null | undefined): string[] {
  const cleaned = (keys ?? []).map((k) => k.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [...DEFAULT_LOAD_PREV_QUESTIONNAIRE_CATEGORY_KEYS];
}

/** Shared questionnaire content across Metsights vs Supershyft category keys. */
const PHYSICAL_MEASUREMENT_PAIR = {
  metsights: "physical-measurement",
  supershyft: "anthropometry",
} as const;

const DIET_LIFESTYLE_METSIGHTS = "diet-lifestyle-parameters";
const DIET_LIFESTYLE_LINKED_SUPERSHYFT = ["nutrition_log", "family_history"] as const;

/**
 * After toggling one category, apply linked keys (admin load-prev picker only).
 * - Anthropometry ↔ physical-measurement stay in sync (check and uncheck).
 * - Unchecking diet-lifestyle-parameters also unchecks nutrition_log and family_history.
 */
export function applyLinkedLoadPrevCategoryKeys(
  keys: Iterable<string>,
  toggledKey: string,
  nowChecked: boolean,
): string[] {
  const next = new Set(keys);

  if (
    toggledKey === PHYSICAL_MEASUREMENT_PAIR.supershyft ||
    toggledKey === PHYSICAL_MEASUREMENT_PAIR.metsights
  ) {
    const linked =
      toggledKey === PHYSICAL_MEASUREMENT_PAIR.supershyft
        ? PHYSICAL_MEASUREMENT_PAIR.metsights
        : PHYSICAL_MEASUREMENT_PAIR.supershyft;
    if (nowChecked) {
      next.add(linked);
    } else {
      next.delete(linked);
    }
  }

  if (toggledKey === DIET_LIFESTYLE_METSIGHTS && !nowChecked) {
    for (const key of DIET_LIFESTYLE_LINKED_SUPERSHYFT) {
      next.delete(key);
    }
  }

  return Array.from(next).sort();
}
