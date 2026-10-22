import { forwardRef, useCallback, useMemo, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"

import { useMenuNavigation } from "../../../hooks/use-menu-navigation"
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import { PALETTE } from "../../../lib/storyBlocks"

import { BanIcon } from "../../tiptap-icons/ban-icon"
import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button } from "../../tiptap-ui-primitive/button"
import { ButtonGroup } from "../../tiptap-ui-primitive/button-group"
import {
  Card,
  CardBody,
  CardItemGroup,
} from "../../tiptap-ui-primitive/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../tiptap-ui-primitive/popover"
import { Separator } from "../../tiptap-ui-primitive/separator"
import "../color-highlight-button/color-highlight-button.scss"

const TEXT_COLORS = PALETTE.filter((color) => color.toLowerCase() !== "#ffffff")

function currentColor(editor: Editor | null): string {
  if (!editor) return ""
  const value = editor.getAttributes("textStyle").color
  return typeof value === "string" ? value.toLowerCase() : ""
}

function TextColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="tiptap-button-highlight"
      style={{ ["--highlight-color" as string]: color, backgroundColor: color }}
      aria-hidden="true"
    />
  )
}

export function TextColorPopoverContent({ editor: providedEditor }: { editor?: Editor | null }) {
  const { editor } = useTiptapEditor(providedEditor)
  const containerRef = useRef<HTMLDivElement>(null)
  const active = currentColor(editor)

  const menuItems = useMemo(
    () => [...TEXT_COLORS.map((color) => ({ value: color })), { value: "none" }],
    [],
  )

  const apply = useCallback(
    (color: string) => {
      if (!editor) return
      if (color === "none") {
        editor.chain().focus().unsetColor().run()
      } else {
        editor.chain().focus().setColor(color).run()
      }
    },
    [editor],
  )

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: menuItems,
    orientation: "both",
    onSelect: (item) => {
      apply(item.value)
      return true
    },
    autoSelectFirstItem: false,
  })

  if (!editor) return null

  return (
    <Card ref={containerRef} tabIndex={0}>
      <CardBody>
        <CardItemGroup orientation="horizontal">
          <ButtonGroup>
            {TEXT_COLORS.map((color, index) => (
              <Button
                key={color}
                type="button"
                variant="ghost"
                role="menuitem"
                aria-label={`Text color ${color}`}
                tooltip={color}
                tabIndex={index === selectedIndex ? 0 : -1}
                data-highlighted={selectedIndex === index}
                data-active-state={active === color.toLowerCase() ? "on" : "off"}
                onClick={() => apply(color)}
              >
                <TextColorSwatch color={color} />
              </Button>
            ))}
          </ButtonGroup>
          <Separator />
          <ButtonGroup>
            <Button
              type="button"
              variant="ghost"
              role="menuitem"
              aria-label="Remove text color"
              tooltip="Remove text color"
              tabIndex={selectedIndex === TEXT_COLORS.length ? 0 : -1}
              data-highlighted={selectedIndex === TEXT_COLORS.length}
              onClick={() => apply("none")}
            >
              <BanIcon className="tiptap-button-icon" />
            </Button>
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </Card>
  )
}

export const TextColorPopoverButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <Button
      type="button"
      className={className}
      variant="ghost"
      role="button"
      tabIndex={-1}
      aria-label="Text color"
      tooltip="Text color"
      ref={ref}
      {...props}
    >
      {children ?? (
        <span className="tiptap-button-text" style={{ fontWeight: 700 }}>
          A
        </span>
      )}
    </Button>
  ),
)

TextColorPopoverButton.displayName = "TextColorPopoverButton"

export function TextColorPopover({
  editor: providedEditor,
  ...props
}: Omit<ButtonProps, "type"> & { editor?: Editor | null }) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)
  const active = currentColor(editor)

  if (!editor || !editor.isEditable) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <TextColorPopoverButton
          data-active-state={active ? "on" : "off"}
          aria-pressed={Boolean(active)}
          {...props}
        >
          <span
            className="tiptap-button-text"
            style={{
              fontWeight: 700,
              color: active || undefined,
              borderBottom: `2px solid ${active || "currentColor"}`,
              lineHeight: 1.1,
            }}
          >
            A
          </span>
        </TextColorPopoverButton>
      </PopoverTrigger>
      <PopoverContent aria-label="Text colors">
        <TextColorPopoverContent editor={editor} />
      </PopoverContent>
    </Popover>
  )
}
