import { describe, expect, it, vi } from "vitest";
import type { EditorView } from "@tiptap/pm/view";
import { scrollSelectionIntoStoryPane } from "./scrollSelectionIntoStoryPane";

function fakeView(dom: HTMLElement, coords: { top: number; bottom: number }): EditorView {
  return {
    dom,
    state: { selection: { from: 1 } },
    coordsAtPos: () => coords,
  } as unknown as EditorView;
}

describe("scrollSelectionIntoStoryPane", () => {
  it("scrolls only .story-scroll when the caret is below the pane", () => {
    const scroller = document.createElement("div");
    scroller.className = "story-scroll";
    scroller.scrollTop = 40;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 400,
      left: 0,
      right: 800,
      width: 800,
      height: 300,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });

    const editor = document.createElement("div");
    scroller.appendChild(editor);
    document.body.appendChild(scroller);

    const windowY = window.scrollY;
    const handled = scrollSelectionIntoStoryPane(fakeView(editor, { top: 380, bottom: 430 }));

    expect(handled).toBe(true);
    expect(scroller.scrollTop).toBe(94);
    expect(window.scrollY).toBe(windowY);

    scroller.remove();
  });

  it("scrolls the pane up when the caret is above the visible area", () => {
    const scroller = document.createElement("div");
    scroller.className = "story-scroll";
    scroller.scrollTop = 200;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 400,
      left: 0,
      right: 800,
      width: 800,
      height: 300,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });

    const editor = document.createElement("div");
    scroller.appendChild(editor);
    document.body.appendChild(scroller);

    scrollSelectionIntoStoryPane(fakeView(editor, { top: 60, bottom: 80 }));

    expect(scroller.scrollTop).toBe(136);
    scroller.remove();
  });

  it("does not throw or scroll the window when there is no story pane", () => {
    const editor = document.createElement("div");
    document.body.appendChild(editor);
    const windowY = window.scrollY;

    expect(scrollSelectionIntoStoryPane(fakeView(editor, { top: 900, bottom: 920 }))).toBe(true);
    expect(window.scrollY).toBe(windowY);

    editor.remove();
  });
});
