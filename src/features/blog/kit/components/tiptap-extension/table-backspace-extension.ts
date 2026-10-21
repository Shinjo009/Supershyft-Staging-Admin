import { Extension, findParentNodeClosestToPos } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'

function tableHasText(table: PMNode): boolean {
  let has = false
  table.descendants((node) => {
    if (node.isText && node.text?.trim()) {
      has = true
      return false
    }
  })
  return has
}

function tableContext($from: ResolvedPos) {
  const table = findParentNodeClosestToPos($from, (node) => node.type.name === 'table')
  if (!table) return null

  const cell = findParentNodeClosestToPos($from, (node) =>
    ['tableCell', 'tableHeader'].includes(node.type.name),
  )
  if (!cell) return null

  let firstCellPos = -1
  let lastCellPos = -1
  table.node.descendants((node, pos) => {
    if (node.type.name === 'table') return false
    if (['tableCell', 'tableHeader'].includes(node.type.name)) {
      const absolute = table.start + pos
      if (firstCellPos < 0) firstCellPos = absolute
      lastCellPos = absolute
    }
  })

  return {
    table,
    cell,
    isFirstCell: cell.pos === firstCellPos,
    isLastCell: cell.pos === lastCellPos,
  }
}

function deleteTableInEditor(editor: Editor): boolean {
  return editor.commands.deleteTable()
}

/**
 * Delete the whole table with Backspace/Delete when:
 * - the table node itself is selected
 * - Mod+Backspace / Mod+Delete while the caret is inside a table
 * - Backspace at the start of the first cell of an empty table
 * - Delete at the end of the last cell of an empty table
 *
 * TipTap already deletes when every cell is cell-selected.
 */
export const TableBackspace = Extension.create({
  name: 'tableBackspace',

  addKeyboardShortcuts() {
    const deleteWhileInTable = ({ editor }: { editor: Editor }) => {
      if (!editor.isActive('table')) return false
      return deleteTableInEditor(editor)
    }

    return {
      'Mod-Backspace': deleteWhileInTable,
      'Mod-Delete': deleteWhileInTable,
      Backspace: ({ editor }) => {
        const { selection } = editor.state
        if (selection instanceof NodeSelection && selection.node.type.name === 'table') {
          return deleteTableInEditor(editor)
        }
        if (!selection.empty) return false
        const ctx = tableContext(selection.$from)
        if (!ctx?.isFirstCell) return false
        if (selection.$from.parentOffset !== 0) return false
        if (tableHasText(ctx.table.node)) return false
        return deleteTableInEditor(editor)
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state
        if (selection instanceof NodeSelection && selection.node.type.name === 'table') {
          return deleteTableInEditor(editor)
        }
        if (!selection.empty) return false
        const ctx = tableContext(selection.$from)
        if (!ctx?.isLastCell) return false
        if (selection.$from.parentOffset < selection.$from.parent.content.size) return false
        if (tableHasText(ctx.table.node)) return false
        return deleteTableInEditor(editor)
      },
    }
  },
})
