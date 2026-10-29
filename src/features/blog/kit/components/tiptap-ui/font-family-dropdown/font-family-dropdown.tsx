import { forwardRef, useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"

import { ChevronDownIcon } from "../../tiptap-icons/chevron-down-icon"
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import { FONT_FAMILIES, fontFamilyCss } from "../../../lib/storyBlocks"
import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button } from "../../tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "../../tiptap-ui-primitive/dropdown-menu"

function currentFontFamily(editor: Editor | null): string {
  if (!editor) return ""
  const value = editor.getAttributes("textStyle").fontFamily
  return typeof value === "string" ? value : ""
}

/** Short labels so the toolbar button stays on one line. */
const FONT_LABELS: Record<(typeof FONT_FAMILIES)[number], string> = {
  Arial: "Arial",
  Georgia: "Georgia",
  "Times New Roman": "Times",
  Montserrat: "Montserrat",
  Poppins: "Poppins",
  "DM Sans": "DM Sans",
  Lato: "Lato",
  Sora: "Sora",
}

export interface FontFamilyDropdownProps extends Omit<ButtonProps, "type"> {
  editor?: Editor | null
  modal?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export const FontFamilyDropdown = forwardRef<HTMLButtonElement, FontFamilyDropdownProps>(
  ({ editor: providedEditor, modal = false, onOpenChange, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = useState(false)
    const active = currentFontFamily(editor)
    const label =
      (FONT_FAMILIES as readonly string[]).includes(active)
        ? FONT_LABELS[active as (typeof FONT_FAMILIES)[number]]
        : "Font"

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!editor) return
        setIsOpen(open)
        onOpenChange?.(open)
      },
      [editor, onOpenChange],
    )

    const apply = useCallback(
      (family: string) => {
        if (!editor) return
        if (family === active) {
          editor.chain().focus().unsetFontFamily().run()
        } else {
          editor.chain().focus().setFontFamily(family).run()
        }
        setIsOpen(false)
      },
      [active, editor],
    )

    if (!editor || !editor.isEditable) return null

    return (
      <DropdownMenu modal={modal} open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            role="button"
            tabIndex={-1}
            aria-label="Font family"
            tooltip="Font family"
            {...buttonProps}
            ref={ref}
          >
            {children ?? (
              <>
                <span
                  className="tiptap-button-text"
                  style={{
                    fontFamily: fontFamilyCss(active) || undefined,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 88,
                  }}
                >
                  {label}
                </span>
                <ChevronDownIcon className="tiptap-button-dropdown-small" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {FONT_FAMILIES.map((family) => (
              <DropdownMenuItem key={family} asChild>
                <Button
                  type="button"
                  variant="ghost"
                  data-active-state={active === family ? "on" : "off"}
                  onClick={() => apply(family)}
                  style={{ fontFamily: fontFamilyCss(family), justifyContent: "flex-start", width: "100%" }}
                >
                  {family}
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
)

FontFamilyDropdown.displayName = "FontFamilyDropdown"
