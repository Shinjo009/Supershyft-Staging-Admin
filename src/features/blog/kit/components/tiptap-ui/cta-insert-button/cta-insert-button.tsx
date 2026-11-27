import { useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"

import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import {
  CTA_DEFAULT_STYLE,
  CTA_FONT_WEIGHTS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  formatCtaPadding,
  normalizeCtaUrl,
  normalizeHex,
  parseCtaPadding,
  safeHref,
  type CtaAlignment,
  type ResolvedCtaStyle,
} from "../../../lib/storyBlocks"
import { CtaButtonIcon } from "../../tiptap-icons/cta-button-icon"
import { PaintPicker } from "../paint-picker/paint-picker"
import { Button } from "../../tiptap-ui-primitive/button"
import { Card, CardBody, CardItemGroup } from "../../tiptap-ui-primitive/card"
import { Input } from "../../tiptap-ui-primitive/input"
import { Popover, PopoverContent, PopoverTrigger } from "../../tiptap-ui-primitive/popover"

const ALIGNMENTS: { value: CtaAlignment; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
]

type CtaForm = {
  text: string
  href: string
  alignment: CtaAlignment
} & ResolvedCtaStyle

function emptyForm(): CtaForm {
  return {
    text: "",
    href: "",
    alignment: "center",
    ...CTA_DEFAULT_STYLE,
  }
}

function activeCta(editor: Editor | null): CtaForm | null {
  if (!editor || !editor.isActive("storyCta")) return null
  const attrs = editor.getAttributes("storyCta")
  return {
    text: String(attrs.text || ""),
    href: String(attrs.href || ""),
    alignment: (attrs.alignment === "left" || attrs.alignment === "right" ? attrs.alignment : "center") as CtaAlignment,
    backgroundColor: normalizeHex(String(attrs.backgroundColor || "")) || CTA_DEFAULT_STYLE.backgroundColor,
    color: normalizeHex(String(attrs.color || "")) || CTA_DEFAULT_STYLE.color,
    fontSize: String(attrs.fontSize || CTA_DEFAULT_STYLE.fontSize),
    fontWeight: String(attrs.fontWeight || CTA_DEFAULT_STYLE.fontWeight),
    borderRadius: String(attrs.borderRadius || CTA_DEFAULT_STYLE.borderRadius),
    padding: String(attrs.padding || CTA_DEFAULT_STYLE.padding),
    borderWidth: String(attrs.borderWidth || CTA_DEFAULT_STYLE.borderWidth),
    borderColor: normalizeHex(String(attrs.borderColor || "")) || CTA_DEFAULT_STYLE.borderColor,
  }
}

function pxNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(String(value || ""))
  return Number.isFinite(parsed) ? parsed : fallback
}

type Props = {
  editor?: Editor | null
  text?: string
}

export function CtaInsertButton({ editor: providedEditor, text = "CTA" }: Props) {
  const { editor } = useTiptapEditor(providedEditor)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CtaForm>(emptyForm)
  const [localError, setLocalError] = useState("")
  const [editing, setEditing] = useState(false)

  const syncFromSelection = useCallback(() => {
    const current = activeCta(editor)
    if (current) {
      setEditing(true)
      setForm(current)
      return
    }
    setEditing(false)
    setForm(emptyForm())
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const onSelection = () => {
      const selected = editor.isActive("storyCta")
      if (selected) {
        syncFromSelection()
        setOpen(true)
        setLocalError("")
        return
      }
      if (open) syncFromSelection()
    }
    editor.on("selectionUpdate", onSelection)
    return () => {
      editor.off("selectionUpdate", onSelection)
    }
  }, [editor, open, syncFromSelection])

  const patchForm = useCallback((patch: Partial<CtaForm>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setLocalError("")
  }, [])

  const onSubmit = useCallback(() => {
    if (!editor) return
    const nextLabel = form.text.trim()
    const nextHref = normalizeCtaUrl(form.href)
    if (!nextLabel) {
      setLocalError("Enter a button name")
      return
    }
    if (!safeHref(nextHref)) {
      setLocalError("Enter a valid http or https link")
      return
    }
    const fontSizePx = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(pxNumber(form.fontSize, 16))))
    const radiusPx = Math.max(0, Math.min(64, Math.round(pxNumber(form.borderRadius, 8))))
    const borderWidthPx = Math.max(0, Math.min(12, Math.round(pxNumber(form.borderWidth, 0))))
    const padding = parseCtaPadding(form.padding)
    const styleAttrs = {
      backgroundColor: normalizeHex(form.backgroundColor) || CTA_DEFAULT_STYLE.backgroundColor,
      color: normalizeHex(form.color) || CTA_DEFAULT_STYLE.color,
      fontSize: `${fontSizePx}px`,
      fontWeight: CTA_FONT_WEIGHTS.includes(form.fontWeight as (typeof CTA_FONT_WEIGHTS)[number])
        ? form.fontWeight
        : CTA_DEFAULT_STYLE.fontWeight,
      borderRadius: `${radiusPx}px`,
      padding: formatCtaPadding(padding.vertical, padding.horizontal),
      borderWidth: `${borderWidthPx}px`,
      borderColor: normalizeHex(form.borderColor) || CTA_DEFAULT_STYLE.borderColor,
    }
    if (editing && editor.isActive("storyCta")) {
      editor
        .chain()
        .focus()
        .updateStoryCta({
          text: nextLabel,
          href: nextHref,
          alignment: form.alignment,
          ...styleAttrs,
        })
        .run()
    } else {
      editor
        .chain()
        .focus()
        .setStoryCta({
          text: nextLabel,
          href: nextHref,
          alignment: form.alignment,
          ...styleAttrs,
        })
        .run()
    }
    setLocalError("")
    setOpen(false)
  }, [editing, editor, form])

  if (!editor || !editor.isEditable) return null

  const padding = parseCtaPadding(form.padding)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          syncFromSelection()
          setLocalError("")
        } else {
          setLocalError("")
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="button"
          tabIndex={-1}
          aria-label={editing ? "Edit CTA button" : "Insert CTA button"}
          tooltip={editing ? "Edit CTA" : "Insert CTA"}
          data-active-state={editing || open ? "on" : "off"}
        >
          <CtaButtonIcon className="tiptap-button-icon" />
          {text ? <span className="tiptap-button-text">{text}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="tiptap-popover" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <Card>
          <CardBody>
            <CardItemGroup orientation="vertical">
              <label className="text-xs font-medium text-zinc-600">
                Button name
                <Input
                  type="text"
                  value={form.text}
                  onChange={(event) => patchForm({ text: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      onSubmit()
                    }
                  }}
                />
              </label>
              <label className="text-xs font-medium text-zinc-600">
                Link
                <Input
                  type="url"
                  value={form.href}
                  onChange={(event) => patchForm({ href: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      onSubmit()
                    }
                  }}
                />
              </label>

              <fieldset className="space-y-1.5">
                <legend className="text-xs font-medium text-zinc-600">Alignment</legend>
                <div className="flex gap-1">
                  {ALIGNMENTS.map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      variant={form.alignment === item.value ? "secondary" : "ghost"}
                      data-active-state={form.alignment === item.value ? "on" : "off"}
                      onClick={() => patchForm({ alignment: item.value })}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-600">Background</p>
                <PaintPicker
                  value={form.backgroundColor}
                  onChange={(paint) => patchForm({ backgroundColor: normalizeHex(paint) || form.backgroundColor })}
                  allowGradient={false}
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-600">Text color</p>
                <PaintPicker
                  value={form.color}
                  onChange={(paint) => patchForm({ color: normalizeHex(paint) || form.color })}
                  allowGradient={false}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-zinc-600">
                  Font size (px)
                  <Input
                    type="number"
                    min={FONT_SIZE_MIN}
                    max={FONT_SIZE_MAX}
                    value={pxNumber(form.fontSize, 16)}
                    onChange={(event) => patchForm({ fontSize: `${event.target.value}px` })}
                  />
                </label>
                <label className="text-xs font-medium text-zinc-600">
                  Font weight
                  <select
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
                    value={form.fontWeight}
                    onChange={(event) => patchForm({ fontWeight: event.target.value })}
                  >
                    {CTA_FONT_WEIGHTS.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-zinc-600">
                  Radius (px)
                  <Input
                    type="number"
                    min={0}
                    max={64}
                    value={pxNumber(form.borderRadius, 8)}
                    onChange={(event) => patchForm({ borderRadius: `${event.target.value}px` })}
                  />
                </label>
                <label className="text-xs font-medium text-zinc-600">
                  Border width (px)
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={pxNumber(form.borderWidth, 0)}
                    onChange={(event) => patchForm({ borderWidth: `${event.target.value}px` })}
                  />
                </label>
                <label className="text-xs font-medium text-zinc-600">
                  Padding Y (px)
                  <Input
                    type="number"
                    min={0}
                    max={96}
                    value={padding.vertical}
                    onChange={(event) =>
                      patchForm({
                        padding: formatCtaPadding(Number(event.target.value) || 0, padding.horizontal),
                      })
                    }
                  />
                </label>
                <label className="text-xs font-medium text-zinc-600">
                  Padding X (px)
                  <Input
                    type="number"
                    min={0}
                    max={96}
                    value={padding.horizontal}
                    onChange={(event) =>
                      patchForm({
                        padding: formatCtaPadding(padding.vertical, Number(event.target.value) || 0),
                      })
                    }
                  />
                </label>
              </div>

              {pxNumber(form.borderWidth, 0) > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-600">Border color</p>
                  <PaintPicker
                    value={form.borderColor}
                    onChange={(paint) => patchForm({ borderColor: normalizeHex(paint) || form.borderColor })}
                    allowGradient={false}
                  />
                </div>
              ) : null}

              <Button type="button" disabled={!form.text.trim() || !form.href.trim()} onClick={onSubmit}>
                {editing ? "Update CTA" : "Insert CTA"}
              </Button>
              {localError ? <p className="text-xs text-red-600">{localError}</p> : null}
            </CardItemGroup>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
