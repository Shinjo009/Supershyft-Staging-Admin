import type {
  ConsultationQuestionnaireCategory,
  ConsultationQuestionnaireQuestion,
} from "../../lib/api";
import { getAnthropometryScaleRange } from "../console/consoleQuestionnaireUtils";

const SUPERSHYFT_CATEGORY_ORDER = [
  "anthropometry",
  "health_vitals",
  "vitals",
  "family_history",
  "family-history",
  "lifestyle_habits",
  "lifestyle-habits",
  "nutrition_log",
  "nutrition-log",
];

export type FormattedAnswer =
  | { kind: "empty" }
  | { kind: "text"; text: string }
  | { kind: "chips"; labels: string[] };

function normalizeQuestionType(type?: string | null): string {
  return String(type ?? "").trim().toLowerCase();
}

function isEmptyAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const obj = value as { value?: unknown };
    if ("value" in obj) {
      const inner = obj.value;
      if (inner === null || inner === undefined) return true;
      if (typeof inner === "string" && inner.trim() === "") return true;
    }
  }
  return false;
}

export function isAnswered(question: ConsultationQuestionnaireQuestion): boolean {
  if (question.answer_state === "empty") return false;
  return !isEmptyAnswer(question.answer);
}

function optionLabel(
  question: ConsultationQuestionnaireQuestion,
  raw: unknown
): string {
  const token = String(raw ?? "").trim();
  if (!token) return "";
  const options = Array.isArray(question.options) ? question.options : [];
  const byValue = options.find((opt) => String(opt.option_value ?? "").trim() === token);
  if (byValue?.display_name) return String(byValue.display_name).trim();
  const byLabel = options.find(
    (opt) => String(opt.display_name ?? "").trim().toLowerCase() === token.toLowerCase()
  );
  if (byLabel?.display_name) return String(byLabel.display_name).trim();
  return token;
}

function scaleUnitLabel(
  question: ConsultationQuestionnaireQuestion,
  unitCode: string
): string {
  const fromOption = optionLabel(question, unitCode);
  if (fromOption && fromOption !== unitCode) return fromOption;
  const range = getAnthropometryScaleRange(question.question_key, unitCode);
  if (range?.label) return range.label;
  return unitCode;
}

export function formatQuestionnaireAnswer(
  question: ConsultationQuestionnaireQuestion
): FormattedAnswer {
  const answer = question.answer;
  if (isEmptyAnswer(answer)) return { kind: "empty" };

  const questionType = normalizeQuestionType(question.question_type);

  if (
    questionType === "multiple_choice" ||
    questionType === "multi_choice" ||
    questionType === "checkbox" ||
    questionType === "multi_select"
  ) {
    const values = (Array.isArray(answer) ? answer : [answer])
      .map((v) => optionLabel(question, v))
      .filter((label) => label.length > 0);
    if (values.length === 0) return { kind: "empty" };
    return { kind: "chips", labels: values };
  }

  if (
    questionType === "single_choice" ||
    questionType === "choice" ||
    questionType === "radio" ||
    questionType === "single_select" ||
    questionType === "select_one" ||
    questionType === "dropdown"
  ) {
    const selected = Array.isArray(answer) ? answer[0] : answer;
    const label = optionLabel(question, selected);
    return label ? { kind: "text", text: label } : { kind: "empty" };
  }

  if (questionType === "scale") {
    if (answer != null && typeof answer === "object" && !Array.isArray(answer)) {
      const obj = answer as { value?: unknown; unit?: unknown };
      const rawValue = obj.value;
      const num = Number(rawValue);
      const valueStr =
        Number.isFinite(num) ? String(num) : String(rawValue ?? "").trim();
      if (!valueStr) return { kind: "empty" };
      const unitCode = String(obj.unit ?? "").trim();
      const unit = unitCode ? scaleUnitLabel(question, unitCode) : "";
      const text = unit ? `${valueStr} ${unit}` : valueStr;
      return { kind: "text", text };
    }
  }

  if (typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") {
    return { kind: "text", text: String(answer) };
  }

  return { kind: "empty" };
}

export function shouldHideQuestionInExpertView(
  question: ConsultationQuestionnaireQuestion
): boolean {
  const key = String(question.question_key ?? "").toLowerCase();
  if (!key.endsWith("_other")) return false;
  return !isAnswered(question);
}

function categoryOrderIndex(categoryKey?: string | null): number {
  const key = String(categoryKey ?? "").toLowerCase();
  const idx = SUPERSHYFT_CATEGORY_ORDER.findIndex(
    (ordered) => key.includes(ordered) || ordered.includes(key)
  );
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export function sortSupershyftCategories<T extends { category_key?: string | null; category_id: number }>(
  categories: T[]
): T[] {
  return [...categories].sort((a, b) => {
    const orderDiff = categoryOrderIndex(a.category_key) - categoryOrderIndex(b.category_key);
    if (orderDiff !== 0) return orderDiff;
    return Number(a.category_id) - Number(b.category_id);
  });
}

function answeredCount(category: ConsultationQuestionnaireCategory): number {
  return category.questions.filter((q) => isAnswered(q)).length;
}

export function dedupeCategoriesByKey(
  categories: ConsultationQuestionnaireCategory[]
): ConsultationQuestionnaireCategory[] {
  const byKey = new Map<string, ConsultationQuestionnaireCategory>();
  for (const cat of categories) {
    const key = String(cat.category_key ?? cat.category_id).toLowerCase();
    const existing = byKey.get(key);
    if (!existing || answeredCount(cat) > answeredCount(existing)) {
      byKey.set(key, cat);
    }
  }
  return Array.from(byKey.values());
}

export function filterSupershyftCategories(
  categories: ConsultationQuestionnaireCategory[]
): ConsultationQuestionnaireCategory[] {
  return categories.filter((cat) => {
    const of = String(cat.category_of ?? "supershyft").toLowerCase();
    return of === "supershyft";
  });
}

export function prepareExpertQuestionnaireCategories(
  payloadCategories: ConsultationQuestionnaireCategory[]
): ConsultationQuestionnaireCategory[] {
  const filtered = filterSupershyftCategories(dedupeCategoriesByKey(payloadCategories));
  return sortSupershyftCategories(filtered);
}

export function categoryCompletionLabel(category: ConsultationQuestionnaireCategory): {
  answered: number;
  total: number;
  complete: boolean;
} {
  const visible = category.questions.filter((q) => !shouldHideQuestionInExpertView(q));
  const answered = visible.filter((q) => isAnswered(q)).length;
  const total = visible.length;
  return { answered, total, complete: total > 0 && answered === total };
}
