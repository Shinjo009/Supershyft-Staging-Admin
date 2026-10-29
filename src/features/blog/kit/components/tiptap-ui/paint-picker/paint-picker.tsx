import { useEffect, useState } from "react"

import { BanIcon } from "../../tiptap-icons/ban-icon"
import {
  buildLinearGradient,
  isGradientPaint,
  normalizeHex,
  normalizePaint,
  PALETTE,
  parseLinearGradient,
} from "../../../lib/storyBlocks"

function toColorInputValue(value: string | null | undefined): string {
  return normalizeHex(value) || "#cc203b"
}

type PaintPickerProps = {
  value: string
  onChange: (paint: string) => void
  presets?: readonly string[]
  allowClear?: boolean
  onClear?: () => void
  allowGradient?: boolean
}

type PaintMode = "solid" | "gradient"

export function PaintPicker({
  value,
  onChange,
  presets = PALETTE,
  allowClear = false,
  onClear,
  allowGradient = true,
}: PaintPickerProps) {
  const paint = normalizePaint(value) || ""
  const gradient = parseLinearGradient(paint)
  const [uiMode, setUiMode] = useState<PaintMode>(allowGradient && gradient ? "gradient" : "solid")
  const mode = allowGradient && uiMode === "gradient" ? "gradient" : "solid"
  const solidHex = normalizeHex(paint) || gradient?.stops[0] || "#cc203b"
  const stopA = gradient?.stops[0] || solidHex
  const stopB = gradient?.stops[1] || "#8fd4c8"
  const angle = gradient?.angle ?? 90
  const [hexDraft, setHexDraft] = useState(mode === "solid" ? paint || value || solidHex : solidHex)

  useEffect(() => {
    if (!allowGradient) {
      setUiMode("solid")
      return
    }
    setUiMode(parseLinearGradient(paint) ? "gradient" : "solid")
  }, [allowGradient, paint])

  useEffect(() => {
    if (mode === "gradient") {
      setHexDraft(solidHex)
      return
    }
    setHexDraft(paint || value || "")
  }, [mode, paint, solidHex, value])

  function applySolid(raw: string) {
    const next = normalizePaint(raw)
    if (!next || isGradientPaint(next)) return
    setUiMode("solid")
    setHexDraft(next)
    onChange(next)
  }

  function applyGradient(nextAngle: number, first: string, second: string) {
    const next = buildLinearGradient(nextAngle, [first, second])
    if (!next) return
    setUiMode("gradient")
    onChange(next)
  }

  function showGradientPanel() {
    setUiMode("gradient")
    applyGradient(angle, stopA, stopB)
  }

  function showSolidPanel() {
    setUiMode("solid")
    applySolid(solidHex)
  }

  return (
    <div className="space-y-2">
      {allowGradient ? (
        <div className="flex gap-1">
          <button
            type="button"
            className={`h-7 rounded-full border px-2.5 text-xs ${
              mode === "solid" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700"
            }`}
            onClick={showSolidPanel}
          >
            Solid
          </button>
          <button
            type="button"
            className={`h-7 rounded-full border px-2.5 text-xs ${
              mode === "gradient" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700"
            }`}
            onClick={showGradientPanel}
          >
            Gradient
          </button>
        </div>
      ) : null}

      {mode === "gradient" ? (
        <>
          <div
            className="h-8 rounded border border-zinc-300"
            style={{ backgroundImage: paint || buildLinearGradient(angle, [stopA, stopB]) || undefined }}
            aria-hidden
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={toColorInputValue(stopA)}
              onChange={(event) => applyGradient(angle, event.target.value, stopB)}
              aria-label="Gradient start color"
              className="h-8 w-8 cursor-pointer rounded border border-zinc-300 bg-white p-0"
            />
            <input
              type="color"
              value={toColorInputValue(stopB)}
              onChange={(event) => applyGradient(angle, stopA, event.target.value)}
              aria-label="Gradient end color"
              className="h-8 w-8 cursor-pointer rounded border border-zinc-300 bg-white p-0"
            />
            <span className="text-xs text-zinc-500">Stops</span>
          </div>
          <label className="block text-xs text-zinc-600">
            Angle {angle}°
            <input
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(event) => applyGradient(Number(event.target.value), stopA, stopB)}
              className="mt-1 w-full"
              aria-label="Gradient angle"
            />
          </label>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((color) => (
              <button
                key={color}
                type="button"
                className={`h-6 w-6 rounded border ${
                  paint.toLowerCase() === color.toLowerCase() ? "border-zinc-900" : "border-zinc-300"
                }`}
                style={{ backgroundColor: color }}
                aria-label={color}
                onClick={() => applySolid(color)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={toColorInputValue(solidHex)}
              onChange={(event) => applySolid(event.target.value)}
              aria-label="Custom color"
              className="h-8 w-8 cursor-pointer rounded border border-zinc-300 bg-white p-0"
            />
            <input
              type="text"
              value={hexDraft}
              onChange={(event) => {
                setHexDraft(event.target.value)
                applySolid(event.target.value)
              }}
              onBlur={() => applySolid(hexDraft)}
              placeholder="#rrggbb"
              className="h-8 flex-1 rounded border border-zinc-300 px-2 text-xs text-zinc-800"
              aria-label="Custom color hex"
            />
          </div>
        </>
      )}

      {allowClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 flex h-8 w-full items-center justify-start gap-2 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          <BanIcon className="h-4 w-4 shrink-0" />
          Remove color
        </button>
      ) : null}
    </div>
  )
}
