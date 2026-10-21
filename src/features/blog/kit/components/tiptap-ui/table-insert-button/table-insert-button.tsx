import { useCallback } from "react"

import type { Editor } from "@tiptap/react"

import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"

import { TableIcon } from "../../tiptap-icons/table-icon"

import { Button } from "../../tiptap-ui-primitive/button"

type Props = {
  editor?: Editor | null
  text?: string
}

export function TableInsertButton({ editor: providedEditor, text = "Table" }: Props) {
  const { editor } = useTiptapEditor(providedEditor)

  const insert = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor || !editor.isEditable) return null

  return (
    <Button
      type="button"
      variant="ghost"
      role="button"
      tabIndex={-1}
      aria-label="Insert table"
      tooltip="Insert table"
      onClick={insert}
    >
      <TableIcon className="tiptap-button-icon" />
      {text ? <span className="tiptap-button-text">{text}</span> : null}
    </Button>
  )
}
