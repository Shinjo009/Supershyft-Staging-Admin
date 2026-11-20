import { describe, expect, it } from "vitest";
import { METSIGHTS_BLOOD_PACKAGE_CODES } from "./engagementOperationsUtils";

describe("METSIGHTS_BLOOD_PACKAGE_CODES", () => {
  it("includes Essentials for camp engagements using METSIGHTS_ESSENTIALS", () => {
    expect(METSIGHTS_BLOOD_PACKAGE_CODES.has("METSIGHTS_ESSENTIALS")).toBe(true);
    expect(METSIGHTS_BLOOD_PACKAGE_CODES.has("METSIGHTS_BASIC")).toBe(true);
    expect(METSIGHTS_BLOOD_PACKAGE_CODES.has("METSIGHTS_PRO")).toBe(true);
  });
});