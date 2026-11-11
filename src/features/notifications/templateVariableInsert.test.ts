import { describe, expect, it } from "vitest";

import { insertAtSelection, selectionAfterInsert, templateToken } from "./templateVariableInsert";

describe("templateVariableInsert", () => {
  it("inserts at selection midpoint", () => {
    const el = document.createElement("input");
    el.value = "Hello world";
    el.selectionStart = 5;
    el.selectionEnd = 5;
    expect(insertAtSelection(el, "{{user.name}}")).toBe("Hello{{user.name}} world");
    expect(selectionAfterInsert(el, "{{user.name}}")).toEqual([18, 18]);
  });

  it("replaces selected range", () => {
    const el = document.createElement("input");
    el.value = "Hello world";
    el.selectionStart = 0;
    el.selectionEnd = 5;
    expect(insertAtSelection(el, "Hi")).toBe("Hi world");
  });

  it("wraps template token", () => {
    expect(templateToken("booking.collection_date")).toBe("{{booking.collection_date}}");
  });
});
