import { forwardRef, useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import {
  SECTION_BG_PRESETS,
  SECTION_DEFAULT_BG,
  normalizeSectionHex,
} from "../../tiptap-extension/section-node-extension"
import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button } from "../../tiptap-ui-primitive/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../../tiptap-ui-primitive/popover"
import { Separator } from "../../tiptap-ui-primitive/separator"

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
    const [draft, setDraft] = useState(SECTION_DEFAULT_BG)
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
      if (bg) setDraft(bg)
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
      setDraft(SECTION_DEFAULT_BG)
      setOpen(true)
    }, [editor])

    const applyColor = useCallback(
      (raw: string) => {
        if (!editor) return
        const color = normalizeSectionHex(raw)
        if (!color) return
        setDraft(color)
        if (editor.isActive("section")) {
          editor.chain().focus().setSectionBackgroundColor(color).run()
        } else {
          editor.chain().focus().insertSection(color).run()
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
          if (next) {
            syncSelection()
            setDraft(sectionBackground(editor) || SECTION_DEFAULT_BG)
          }
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
                  backgroundColor: activeBg || SECTION_DEFAULT_BG,
                  marginLeft: 4,
                }}
              />
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-3" style={{ width: 240 }}>
          {inSection ? (
            <>
              <p className="mb-2 text-xs font-medium text-zinc-600">Section background</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SECTION_BG_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-6 w-6 rounded border border-zinc-300"
                    style={{ backgroundColor: color }}
                    aria-label={color}
                    data-active-state={(activeBg || draft).toLowerCase() === color.toLowerCase() ? "on" : "off"}
                    onClick={() => applyColor(color)}
                  />
                ))}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="color"
                  value={normalizeSectionHex(draft) || SECTION_DEFAULT_BG}
                  onChange={(event) => applyColor(event.target.value)}
                  aria-label="Custom section color"
                  className="h-8 w-8 cursor-pointer rounded border border-zinc-300 bg-white p-0"
                />
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => applyColor(draft)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      applyColor(draft)
                    }
                  }}
                  placeholder="#rrggbb"
                  className="h-8 flex-1 rounded border border-zinc-300 px-2 text-xs text-zinc-800"
                />
              </div>
              <Separator />
              <div className="mt-2 flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={removeSection}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  Remove section (keep text)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={deleteSection}
                  style={{ justifyContent: "flex-start", width: "100%", color: "#b42318" }}
                >
                  Delete section
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">Place the cursor in a section to edit or delete it.</p>
          )}
        </PopoverContent>
      </Popover>
    )
  },
)

SectionButton.displayName = "SectionButton"
