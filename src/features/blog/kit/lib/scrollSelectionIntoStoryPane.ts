import type { EditorView } from "@tiptap/pm/view";

const STORY_SELECTION_SCROLL_PADDING = 24;

/** Keep the caret in `.story-scroll` without scrolling the window or admin shell. */
export function scrollSelectionIntoStoryPane(view: EditorView): boolean {
  const scroller = view.dom.closest(".story-scroll");
  if (!(scroller instanceof HTMLElement)) return true;

  const { from } = view.state.selection;
  let coords: { top: number; bottom: number };
  try {
    coords = view.coordsAtPos(from);
  } catch {
    return true;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  if (coords.bottom > scrollerRect.bottom) {
    scroller.scrollTop += coords.bottom - scrollerRect.bottom + STORY_SELECTION_SCROLL_PADDING;
  } else if (coords.top < scrollerRect.top) {
    scroller.scrollTop -= scrollerRect.top - coords.top + STORY_SELECTION_SCROLL_PADDING;
  }
  return true;
}
