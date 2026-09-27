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
