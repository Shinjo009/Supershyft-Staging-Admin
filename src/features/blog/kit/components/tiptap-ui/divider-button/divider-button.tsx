import { useCallback } from "react"

import type { Editor } from "@tiptap/react"



import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"

import { HorizontalRuleIcon } from "../../tiptap-icons/horizontal-rule-icon"

import { Button } from "../../tiptap-ui-primitive/button"



type Props = {

  editor?: Editor | null

  text?: string

}



export function DividerButton({ editor: providedEditor, text = "Line" }: Props) {

  const { editor } = useTiptapEditor(providedEditor)



  const insert = useCallback(() => {

    if (!editor) return

    editor.chain().focus().setHorizontalRule().run()

  }, [editor])



  if (!editor || !editor.isEditable) return null



  return (

    <Button

      type="button"

      variant="ghost"

      role="button"

      tabIndex={-1}

      aria-label="Insert horizontal line"

      tooltip="Insert line"

      onClick={insert}

    >

      <HorizontalRuleIcon className="tiptap-button-icon" />

      {text ? <span className="tiptap-button-text">{text}</span> : null}

    </Button>

  )

}

