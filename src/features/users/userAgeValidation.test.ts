import { describe, expect, it } from "vitest";

import { validateNewAccountAge, validateNewAccountAgeNumber } from "./userAgeValidation";

describe("validateNewAccountAge", () => {
  it("rejects under 18", () => {
    expect(validateNewAccountAge("17")).toMatch(/at least 18/i);
  });

  it("accepts 18", () => {
    expect(validateNewAccountAge("18")).toBeNull();
  });
});

describe("validateNewAccountAgeNumber", () => {
  it("requires age on create", () => {
    expect(validateNewAccountAgeNumber(null)).toBe("Age is required.");
  });
});