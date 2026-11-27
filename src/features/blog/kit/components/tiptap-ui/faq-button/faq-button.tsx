"use client"

import { useCallback } from "react"
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import { FAQ_DEFAULT_HEADING } from "../../../lib/storyBlocks"
import { defaultFaqItems, serializeFaqItems } from "../../tiptap-extension/faq-types"

export function FaqButton() {
  const { editor } = useTiptapEditor()

  const insert = useCallback(() => {
    if (!editor || !editor.isEditable) return
    const attrs = {
      heading: FAQ_DEFAULT_HEADING,
      itemsJson: serializeFaqItems(defaultFaqItems()),
    }
    if (!editor.chain().focus().insertFaq().run()) {
      editor.chain().focus().insertContent({ type: "storyFaq", attrs }).run()
    }
  }, [editor])

  return (
    <button
      type="button"
      className="tiptap-button"
      data-style="ghost"
      data-testid="blog-faq-insert"
      aria-label="FAQ / Accordion"
      title="FAQ / Accordion"
      disabled={!editor || !editor.isEditable}
      onClick={insert}
    >
      <span className="tiptap-button-text" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
        FAQ
      </span>
    </button>
  )
}
