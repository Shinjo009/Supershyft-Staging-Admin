import { forwardRef, useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"

import { ChevronDownIcon } from "../../tiptap-icons/chevron-down-icon"
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import { FONT_WEIGHTS, fontWeightCss, fontWeightLabel, fontWeightName } from "../../../lib/storyBlocks"
import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button } from "../../tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "../../tiptap-ui-primitive/dropdown-menu"

function currentFontWeight(editor: Editor | null): string {
  if (!editor) return ""
  return fontWeightName(String(editor.getAttributes("textStyle").fontWeight || ""))
}

export interface FontWeightDropdownProps extends Omit<ButtonProps, "type"> {
  editor?: Editor | null
  modal?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export const FontWeightDropdown = forwardRef<HTMLButtonElement, FontWeightDropdownProps>(
  ({ editor: providedEditor, modal = false, onOpenChange, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = useState(false)
    const active = currentFontWeight(editor)
    const label = active ? fontWeightLabel(active) : "Weight"

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!editor) return
        setIsOpen(open)
        onOpenChange?.(open)
      },
      [editor, onOpenChange],
    )

    const apply = useCallback(
      (weight: string) => {
        if (!editor) return
        if (weight === active) {
          editor.chain().focus().unsetFontWeight().run()
        } else {
          editor.chain().focus().setFontWeight(weight).run()
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
            aria-label="Font weight"
            tooltip="Font weight"
            {...buttonProps}
            ref={ref}
          >
            {children ?? (
              <>
                <span className="tiptap-button-text">{label}</span>
                <ChevronDownIcon className="tiptap-button-dropdown-small" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {FONT_WEIGHTS.map((weight) => (
              <DropdownMenuItem key={weight} asChild>
                <Button
                  type="button"
                  variant="ghost"
                  data-active-state={active === weight ? "on" : "off"}
                  onClick={() => apply(weight)}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <span style={{ fontWeight: Number(fontWeightCss(weight)) || 400 }}>
                    {fontWeightLabel(weight)}
                  </span>
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
)

FontWeightDropdown.displayName = "FontWeightDropdown"
