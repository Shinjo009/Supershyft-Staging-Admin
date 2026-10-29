import { forwardRef, useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"

import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import { isGradientPaint, normalizePaint, PALETTE } from "../../../lib/storyBlocks"
import { PaintPicker } from "../paint-picker/paint-picker"

import type { ButtonProps } from "../../tiptap-ui-primitive/button"
import { Button } from "../../tiptap-ui-primitive/button"
import { Card, CardBody } from "../../tiptap-ui-primitive/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../tiptap-ui-primitive/popover"

const TEXT_PRESETS = PALETTE.filter((color) => color.toLowerCase() !== "#ffffff")

function currentColor(editor: Editor | null): string {
  if (!editor) return ""
  const value = editor.getAttributes("textStyle").color
  return typeof value === "string" ? normalizePaint(value) || "" : ""
}

export function TextColorPopoverContent({ editor: providedEditor }: { editor?: Editor | null }) {
  const { editor } = useTiptapEditor(providedEditor)
  const active = currentColor(editor)

  const apply = useCallback(
    (color: string) => {
      if (!editor) return
      editor.chain().setColor(color).run()
    },
    [editor],
  )

  if (!editor) return null

  return (
    <Card style={{ minWidth: 228, maxWidth: 260, alignItems: "stretch" }}>
      <CardBody>
        <p className="mb-2 text-sm font-semibold text-zinc-900">Text color</p>
        <PaintPicker
          value={active}
          onChange={apply}
          presets={TEXT_PRESETS}
          allowClear
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
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
              color: active && !isGradientPaint(active) ? active : undefined,
              backgroundImage: active && isGradientPaint(active) ? active : undefined,
              WebkitBackgroundClip: active && isGradientPaint(active) ? "text" : undefined,
              backgroundClip: active && isGradientPaint(active) ? "text" : undefined,
              borderBottom: `2px solid ${active && !isGradientPaint(active) ? active : "currentColor"}`,
              lineHeight: 1.1,
            }}
          >
            A
          </span>
        </TextColorPopoverButton>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Text colors"
        sideOffset={8}
        style={{ zIndex: 80 }}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <TextColorPopoverContent editor={editor} />
      </PopoverContent>
    </Popover>
  )
}
