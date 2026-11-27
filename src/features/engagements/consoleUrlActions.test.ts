import { describe, expect, it } from "vitest";
import {
  consoleSubpathForEngagement,
  consoleUrlForEngagement,
  consoleUrlForEngagementCode,
} from "./consoleUrlActions";

describe("consoleSubpathForEngagement", () => {
  it("uses code path when code is non-empty after trim", () => {
    expect(
      consoleSubpathForEngagement({ engagementId: 1, engagementCode: "ABC-1" }),
    ).toBe("/engagements/code/ABC-1/console");
  });

  it("encodes characters in engagement code", () => {
    expect(
      consoleSubpathForEngagement({ engagementId: 1, engagementCode: "A B" }),
    ).toBe("/engagements/code/A%20B/console");
  });

  it("falls back to id path when code is missing or blank", () => {
    expect(consoleSubpathForEngagement({ engagementId: 42 })).toBe("/engagements/42/console");
    expect(consoleSubpathForEngagement({ engagementId: 42, engagementCode: "   " })).toBe(
      "/engagements/42/console",
    );
  });
});

describe("consoleUrlForEngagementCode", () => {
  it("builds absolute URL with encoded code", () => {
    const prev = window.location.origin;
    Object.defineProperty(window, "location", {
      value: { ...window.location, origin: "https://app.example" },
      configurable: true,
    });
    expect(consoleUrlForEngagementCode("X/Y")).toBe(
      "https://app.example/engagements/code/X%2FY/console",
    );
    Object.defineProperty(window, "location", {
      value: { ...window.location, origin: prev },
      configurable: true,
    });
  });
});

describe("consoleUrlForEngagement", () => {
  it("builds id-based absolute URL", () => {
    const prev = window.location.origin;
    Object.defineProperty(window, "location", {
      value: { ...window.location, origin: "https://app.example" },
      configurable: true,
    });
    expect(consoleUrlForEngagement(99)).toBe("https://app.example/engagements/99/console");
    Object.defineProperty(window, "location", {
      value: { ...window.location, origin: prev },
      configurable: true,
    });
  });
});