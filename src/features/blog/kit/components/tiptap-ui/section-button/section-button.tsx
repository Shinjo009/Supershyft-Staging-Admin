import { forwardRef, useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import { isGradientPaint, normalizePaint } from "../../../lib/storyBlocks"
import {
  SECTION_BG_PRESETS,
  SECTION_DEFAULT_BG,
  normalizeSectionHex,
} from "../../tiptap-extension/section-node-extension"
import { PaintPicker } from "../paint-picker/paint-picker"
import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button } from "../../tiptap-ui-primitive/button"
import { Card, CardBody } from "../../tiptap-ui-primitive/card"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../../tiptap-ui-primitive/popover"

function sectionBackground(editor: Editor | null): string | null {
  if (!editor) return null
  if (!editor.isActive("section")) return null
  const color = normalizeSectionHex(editor.getAttributes("section").backgroundColor)
  return color || SECTION_DEFAULT_BG
}

export interface SectionButtonProps extends Omit<ButtonProps, "type"> {
  editor?: Editor | null
}

export const SectionButton = forwardRef<HTMLButtonElement, SectionButtonProps>(
  ({ editor: providedEditor, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [open, setOpen] = useState(false)
    const [inSection, setInSection] = useState(false)
    const [activeBg, setActiveBg] = useState<string | null>(null)

    const syncSelection = useCallback(() => {
      if (!editor) {
        setInSection(false)
        setActiveBg(null)
        return
      }
      const bg = sectionBackground(editor)
      setInSection(Boolean(bg))
      setActiveBg(bg)
    }, [editor])

    useEffect(() => {
      if (!editor) return
      syncSelection()
      editor.on("selectionUpdate", syncSelection)
      editor.on("transaction", syncSelection)
      return () => {
        editor.off("selectionUpdate", syncSelection)
        editor.off("transaction", syncSelection)
      }
    }, [editor, syncSelection])

    const insert = useCallback(() => {
      if (!editor) return
      editor.chain().focus().insertSection(SECTION_DEFAULT_BG).run()
      setOpen(true)
    }, [editor])

    const applyColor = useCallback(
      (raw: string) => {
        if (!editor) return
        const color = normalizePaint(raw)
        if (!color) return
        if (editor.isActive("section")) {
          editor.chain().setSectionBackgroundColor(color).run()
        } else {
          editor.chain().insertSection(color).run()
        }
      },
      [editor],
    )

    const removeSection = useCallback(() => {
      if (!editor) return
      editor.chain().focus().removeSection().run()
      setOpen(false)
    }, [editor])

    const deleteSection = useCallback(() => {
      if (!editor) return
      editor.chain().focus().deleteSection().run()
      setOpen(false)
    }, [editor])

    if (!editor || !editor.isEditable) return null

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) syncSelection()
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            role="button"
            tabIndex={-1}
            aria-label={inSection ? "Section controls" : "Insert section"}
            tooltip={inSection ? "Section controls" : "Insert section"}
            data-active-state={inSection ? "on" : "off"}
            onClick={(event) => {
              if (!inSection) {
                event.preventDefault()
                insert()
              }
            }}
            {...buttonProps}
            ref={ref}
          >
            <span className="tiptap-button-text">Section</span>
            {inSection ? (
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  border: "1px solid #d4d4d8",
                  backgroundColor: activeBg && !isGradientPaint(activeBg) ? activeBg : undefined,
                  backgroundImage: activeBg && isGradientPaint(activeBg) ? activeBg : undefined,
                  marginLeft: 4,
                }}
              />
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          style={{ zIndex: 80 }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onFocusOutside={(event) => event.preventDefault()}
        >
          <Card style={{ minWidth: 240, maxWidth: 280, alignItems: "stretch" }}>
            <CardBody>
              {inSection ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-zinc-900">Section background</p>
                  <PaintPicker
                    value={activeBg || SECTION_DEFAULT_BG}
                    onChange={applyColor}
                    presets={SECTION_BG_PRESETS}
                  />
                  <div className="border-t border-zinc-200 pt-2">
                    <button
                      type="button"
                      onClick={removeSection}
                      className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm text-zinc-800 hover:bg-zinc-100"
                    >
                      Remove section, keep the text
                    </button>
                    <button
                      type="button"
                      onClick={deleteSection}
                      className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete the whole section
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600">Click inside a section to change its color or delete it.</p>
              )}
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>
    )
  },
)

SectionButton.displayName = "SectionButton"
