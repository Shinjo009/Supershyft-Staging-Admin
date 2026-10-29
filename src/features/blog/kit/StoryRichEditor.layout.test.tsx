import { render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { StoryRichEditor } from "./StoryRichEditor";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
});

describe("StoryRichEditor layout", () => {
  it("keeps the toolbar in flow above the story pane with no bottom offset", async () => {
    const { container } = render(
      <div className="flex h-[32rem] flex-col">
        <StoryRichEditor initialContent={[]} uploadImage={async () => ""} />
      </div>,
    );

    await waitFor(() => {
      expect(container.querySelector(".simple-editor-content")).toBeTruthy();
    });

    const toolbar = container.querySelector('[role="toolbar"]');
    const storyScroll = container.querySelector(".story-scroll");

    expect(toolbar).toBeInstanceOf(HTMLElement);
    expect(storyScroll).toBeInstanceOf(Element);
    if (!(toolbar instanceof HTMLElement) || !(storyScroll instanceof Element)) return;

    expect(toolbar.style.bottom).toBe("");
    expect(toolbar.compareDocumentPosition(storyScroll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
