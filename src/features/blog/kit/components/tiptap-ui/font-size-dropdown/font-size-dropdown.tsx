import { forwardRef, useCallback, useMemo, useState } from "react"
import type { Editor } from "@tiptap/react"

import { ChevronDownIcon } from "../../tiptap-icons/chevron-down-icon"
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import {
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  fontSizeCss,
} from "../../../lib/storyBlocks"
import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button } from "../../tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "../../tiptap-ui-primitive/dropdown-menu"

const FONT_SIZE_OPTIONS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 64, 72, 96] as const

function currentFontSize(editor: Editor | null): string {
  if (!editor) return ""
  return fontSizeCss(String(editor.getAttributes("textStyle").fontSize || ""))
}

export interface FontSizeDropdownProps extends Omit<ButtonProps, "type"> {
  editor?: Editor | null
  modal?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export const FontSizeDropdown = forwardRef<HTMLButtonElement, FontSizeDropdownProps>(
  ({ editor: providedEditor, modal = false, onOpenChange, children, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = useState(false)
    const active = currentFontSize(editor)
    const label = active || `${FONT_SIZE_DEFAULT}px`

    const options = useMemo(
      () =>
        FONT_SIZE_OPTIONS.filter((size) => size >= FONT_SIZE_MIN && size <= FONT_SIZE_MAX).map(
          (size) => `${size}px`,
        ),
      [],
    )

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!editor) return
        setIsOpen(open)
        onOpenChange?.(open)
      },
      [editor, onOpenChange],
    )

    const apply = useCallback(
      (size: string) => {
        if (!editor) return
        if (size === active) {
          editor.chain().focus().unsetFontSize().run()
        } else {
          editor.chain().focus().setFontSize(size).run()
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
            aria-label="Font size"
            tooltip="Font size"
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
        <DropdownMenuContent align="start" style={{ maxHeight: 280, overflowY: "auto" }}>
          <DropdownMenuGroup>
            {options.map((size) => (
              <DropdownMenuItem key={size} asChild>
                <Button
                  type="button"
                  variant="ghost"
                  data-active-state={active === size ? "on" : "off"}
                  onClick={() => apply(size)}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  {size}
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
)

FontSizeDropdown.displayName = "FontSizeDropdown"
