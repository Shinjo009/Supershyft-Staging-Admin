import { useCallback, useEffect, useState } from "react"

import type { Editor } from "@tiptap/react"

import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"

import { TableIcon } from "../../tiptap-icons/table-icon"

import { Button } from "../../tiptap-ui-primitive/button"
import { Card, CardBody } from "../../tiptap-ui-primitive/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../tiptap-ui-primitive/popover"

const GRID_MAX = 6

type Props = {
  editor?: Editor | null
  text?: string
}

function MenuAction({
  label,
  onClick,
  danger = false,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm leading-5 ${
        danger
          ? "text-red-700 hover:bg-red-50"
          : "text-zinc-800 hover:bg-zinc-100"
      }`}
    >
      {label}
    </button>
  )
}

function TableGrid({
  onPick,
}: {
  onPick: (rows: number, cols: number) => void
}) {
  const [hover, setHover] = useState({ rows: 3, cols: 3 })
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-zinc-900">Insert a table</p>
      <p className="mb-2 text-xs text-zinc-500">
        Hover to choose size, then click.
      </p>
      <p className="mb-2 text-xs font-medium text-zinc-700">
        {hover.rows} rows × {hover.cols} columns
      </p>
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${GRID_MAX}, 1.25rem)` }}
        onMouseLeave={() => setHover({ rows: 3, cols: 3 })}
      >
        {Array.from({ length: GRID_MAX * GRID_MAX }, (_, index) => {
          const row = Math.floor(index / GRID_MAX) + 1
          const col = (index % GRID_MAX) + 1
          const active = row <= hover.rows && col <= hover.cols
          return (
            <button
              key={`${row}-${col}`}
              type="button"
              className={`h-5 w-5 rounded-sm border ${
                active ? "border-zinc-800 bg-zinc-800" : "border-zinc-300 bg-white"
              }`}
              aria-label={`${row} by ${col} table`}
              onMouseEnter={() => setHover({ rows: row, cols: col })}
              onClick={() => onPick(row, col)}
            />
          )
        })}
      </div>
    </div>
  )
}

export function TableInsertButton({ editor: providedEditor, text = "Table" }: Props) {
  const { editor } = useTiptapEditor(providedEditor)
  const [open, setOpen] = useState(false)
  const [inTable, setInTable] = useState(false)

  const sync = useCallback(() => {
    setInTable(Boolean(editor?.isActive("table")))
  }, [editor])

  useEffect(() => {
    if (!editor) return
    sync()
    editor.on("selectionUpdate", sync)
    editor.on("transaction", sync)
    return () => {
      editor.off("selectionUpdate", sync)
      editor.off("transaction", sync)
    }
  }, [editor, sync])

  const insert = useCallback(
    (rows: number, cols: number) => {
      if (!editor) return
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run()
      setOpen(false)
    },
    [editor],
  )

  const run = useCallback(
    (command: () => boolean) => {
      if (!editor) return
      command()
    },
    [editor],
  )

  if (!editor || !editor.isEditable) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="button"
          tabIndex={-1}
          aria-label={inTable ? "Edit table" : "Insert table"}
          tooltip={inTable ? "Edit table" : "Insert table"}
          data-active-state={inTable ? "on" : "off"}
        >
          <TableIcon className="tiptap-button-icon" />
          {text ? <span className="tiptap-button-text">{text}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} style={{ zIndex: 80 }}>
        <Card style={{ minWidth: 240, maxWidth: 280, alignItems: "stretch" }}>
          <CardBody>
            {inTable ? (
              <div className="flex flex-col gap-0.5">
                <p className="px-2.5 pb-1 text-sm font-semibold text-zinc-900">Edit table</p>
                <p className="px-2.5 pb-2 text-xs text-zinc-500">
                  Click inside a cell, then choose an action.
                </p>
                <p className="px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Add
                </p>
                <MenuAction label="Add row above" onClick={() => run(() => editor.chain().focus().addRowBefore().run())} />
                <MenuAction label="Add row below" onClick={() => run(() => editor.chain().focus().addRowAfter().run())} />
                <MenuAction label="Add column to the left" onClick={() => run(() => editor.chain().focus().addColumnBefore().run())} />
                <MenuAction label="Add column to the right" onClick={() => run(() => editor.chain().focus().addColumnAfter().run())} />
                <div className="my-1 border-t border-zinc-200" />
                <p className="px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Remove
                </p>
                <MenuAction label="Delete this row" onClick={() => run(() => editor.chain().focus().deleteRow().run())} />
                <MenuAction label="Delete this column" onClick={() => run(() => editor.chain().focus().deleteColumn().run())} />
                <MenuAction
                  danger
                  label="Delete the whole table"
                  onClick={() => {
                    run(() => editor.chain().focus().deleteTable().run())
                    setOpen(false)
                  }}
                />
              </div>
            ) : (
              <TableGrid onPick={insert} />
            )}
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
