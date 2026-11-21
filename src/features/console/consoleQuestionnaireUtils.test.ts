import { describe, expect, it } from "vitest";

import type { ConsoleQuestionnaireQuestion } from "../../lib/api";
import {
  carriedForwardLabelForQuestion,
  computeWizardLandingStepIndex,
  isQuestionCarriedForward,
} from "./consoleQuestionnaireUtils";

function q(
  id: number,
  extra: Partial<ConsoleQuestionnaireQuestion> = {}
): ConsoleQuestionnaireQuestion {
  return {
    question_id: id,
    question_type: "text",
    is_required: true,
  ...extra,
  };
}

describe("isQuestionCarriedForward", () => {
  it("detects flag and answer_source", () => {
    expect(isQuestionCarriedForward(q(1, { is_carried_forward: true }))).toBe(true);
    expect(isQuestionCarriedForward(q(1, { answer_source: "carried_forward", answer: "x" }))).toBe(
      true
    );
    expect(isQuestionCarriedForward(q(1, { answer_source: "draft", answer: "x" }))).toBe(false);
  });
});

describe("carriedForwardLabelForQuestion", () => {
  it("returns generic label only when carried forward", () => {
    expect(carriedForwardLabelForQuestion(q(1, { is_carried_forward: true }))).toBe(
      "Carried forward from last camp"
    );
    expect(carriedForwardLabelForQuestion(q(1, { answer: "ok" }))).toBeNull();
  });
});

describe("computeWizardLandingStepIndex", () => {
  it("lands on first carried-forward question", () => {
    const questions = [
      q(1, { is_carried_forward: true, answer: "prior" }),
      q(2, { answer: "" }),
    ];
    expect(computeWizardLandingStepIndex(questions, {})).toBe(0);
  });

  it("lands on first carried-forward when earlier questions are committed", () => {
    const questions = [
      q(1, { answer: "saved", answer_source: "draft" }),
      q(2, { is_carried_forward: true, answer: "prior" }),
      q(3, { answer: "" }),
    ];
    expect(computeWizardLandingStepIndex(questions, { 1: "saved" })).toBe(1);
  });

  it("lands on first unanswered when no carried-forward", () => {
    const questions = [
      q(1, { answer: "a" }),
      q(2, { answer: "b" }),
      q(3, { answer: "" }),
    ];
    const answers = { 1: "a", 2: "b" };
    expect(computeWizardLandingStepIndex(questions, answers)).toBe(2);
  });

  it("lands on first question when fully reviewed", () => {
    const questions = [
      q(1, { answer: "a" }),
      q(2, { answer: "b" }),
    ];
    expect(computeWizardLandingStepIndex(questions, { 1: "a", 2: "b" })).toBe(0);
  });
});