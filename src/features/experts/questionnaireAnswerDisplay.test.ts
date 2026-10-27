import { describe, expect, it } from "vitest";
import type { ConsultationQuestionnaireQuestion } from "../../lib/api";
import {
  dedupeCategoriesByKey,
  formatQuestionnaireAnswer,
  isAnswered,
  prepareExpertQuestionnaireCategories,
} from "./questionnaireAnswerDisplay";

function q(partial: Partial<ConsultationQuestionnaireQuestion>): ConsultationQuestionnaireQuestion {
  return {
    question_id: 1,
    ...partial,
  };
}

describe("formatQuestionnaireAnswer", () => {
  it("formats scale answers with unit labels", () => {
    const formatted = formatQuestionnaireAnswer(
      q({
        question_key: "height",
        question_type: "scale",
        options: [
          { option_value: "0", display_name: "cm" },
          { option_value: "2", display_name: "ft/in" },
        ],
        answer: { value: "173", unit: "0" },
      })
    );
    expect(formatted).toEqual({ kind: "text", text: "173 cm" });
  });

  it("formats single choice by display name", () => {
    const formatted = formatQuestionnaireAnswer(
      q({
        question_type: "single_choice",
        options: [{ option_value: "2", display_name: "Between 7 to 9 hours" }],
        answer: "2",
      })
    );
    expect(formatted).toEqual({ kind: "text", text: "Between 7 to 9 hours" });
  });

  it("formats multiple choice as chips", () => {
    const formatted = formatQuestionnaireAnswer(
      q({
        question_type: "multiple_choice",
        options: [
          { option_value: "0", display_name: "Diabetes" },
          { option_value: "3", display_name: "Hypertension" },
        ],
        answer: ["0", "3"],
      })
    );
    expect(formatted).toEqual({ kind: "chips", labels: ["Diabetes", "Hypertension"] });
  });

  it("returns empty for missing answers", () => {
    expect(formatQuestionnaireAnswer(q({ answer: null }))).toEqual({ kind: "empty" });
  });
});

describe("isAnswered", () => {
  it("treats answer_state empty as unanswered", () => {
    expect(isAnswered(q({ answer: "x", answer_state: "empty" }))).toBe(false);
  });
});

describe("prepareExpertQuestionnaireCategories", () => {
  it("drops metsights and dedupes by category_key", () => {
    const out = prepareExpertQuestionnaireCategories([
      {
        category_id: 1,
        category_key: "anthropometry",
        category_of: "supershyft",
        questions: [{ question_id: 1, answer_state: "submitted", answer: "1" }],
      },
      {
        category_id: 2,
        category_key: "anthropometry",
        category_of: "supershyft",
        questions: [
          { question_id: 1, answer_state: "submitted", answer: "1" },
          { question_id: 2, answer_state: "submitted", answer: "2" },
        ],
      },
      {
        category_id: 3,
        category_key: "physical-measurement",
        category_of: "metsights",
        questions: [],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].category_id).toBe(2);
  });
});

describe("dedupeCategoriesByKey", () => {
  it("keeps category with more answers", () => {
    const out = dedupeCategoriesByKey([
      {
        category_id: 10,
        category_key: "nutrition_log",
        questions: [{ question_id: 1, answer_state: "empty" }],
      },
      {
        category_id: 11,
        category_key: "nutrition_log",
        questions: [{ question_id: 1, answer_state: "submitted", answer: "yes" }],
      },
    ]);
    expect(out[0].category_id).toBe(11);
  });
});
