import { mergeAttributes, Node } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"

export const SECTION_DEFAULT_BG = "#EFF6FF"

export const SECTION_BG_PRESETS = [
  "#EFF6FF",
  "#FEF3C7",
  "#DCFCE7",
  "#F3E8FF",
  "#FCE7F3",
  "#E0F2FE",
  "#FFF7ED",
  "#F3F4F6",
] as const

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function normalizeSectionHex(value: string | null | undefined): string | null {
  const text = String(value || "").trim()
  if (!HEX_COLOR.test(text)) return null
  if (text.length === 4) {
    const [, r, g, b] = text
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return text.toLowerCase()
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    storySection: {
      insertSection: (backgroundColor?: string) => ReturnType
      setSectionBackgroundColor: (backgroundColor: string) => ReturnType
      unsetSectionBackgroundColor: () => ReturnType
      /** Unwrap the section around the cursor; keep the inner blocks. */
      removeSection: () => ReturnType
      /** Delete the section around the cursor, including its content. */
      deleteSection: () => ReturnType
    }
  }
}

function sectionDepth($from: { depth: number; node: (depth: number) => { type: { name: string } } }): number {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "section") return depth
  }
  return -1
}

/**
 * Colored content section that wraps leaf story blocks (no nested sections).
 */
export const StorySection = Node.create({
  name: "section",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      backgroundColor: {
        default: SECTION_DEFAULT_BG,
        parseHTML: (element) =>
          normalizeSectionHex(element.getAttribute("data-background-color") || element.style.backgroundColor) ||
          SECTION_DEFAULT_BG,
        renderHTML: (attributes) => {
          const color = normalizeSectionHex(attributes.backgroundColor) || SECTION_DEFAULT_BG
          return {
            "data-background-color": color,
            style: `background-color: ${color}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "section",
        class: "story-section",
      }),
      0,
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("storySectionNoNest"),
        filterTransaction(transaction) {
          if (!transaction.docChanged) return true
          let ok = true
          transaction.doc.descendants((node) => {
            if (!ok || node.type.name !== "section") return
            node.forEach((child) => {
              if (child.type.name === "section") ok = false
            })
          })
          return ok
        },
      }),
    ]
  },

  addCommands() {
    return {
      insertSection:
        (backgroundColor = SECTION_DEFAULT_BG) =>
        ({ editor, chain, state }) => {
          const color = normalizeSectionHex(backgroundColor) || SECTION_DEFAULT_BG
          if (sectionDepth(state.selection.$from) >= 0) {
            return chain().focus().setSectionBackgroundColor(color).run()
          }
          const { from, to, empty } = state.selection
          if (!empty && from !== to) {
            return chain().focus().wrapIn(this.name, { backgroundColor: color }).run()
          }
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { backgroundColor: color },
              content: [{ type: "paragraph" }],
            })
            .run()
        },

      setSectionBackgroundColor:
        (backgroundColor) =>
        ({ state, dispatch }) => {
          const color = normalizeSectionHex(backgroundColor)
          if (!color) return false
          const depth = sectionDepth(state.selection.$from)
          if (depth < 0) return false
          const pos = state.selection.$from.before(depth)
          const node = state.selection.$from.node(depth)
          if (dispatch) {
            dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, backgroundColor: color }))
          }
          return true
        },

      unsetSectionBackgroundColor:
        () =>
        ({ state, dispatch }) => {
          const depth = sectionDepth(state.selection.$from)
          if (depth < 0) return false
          const pos = state.selection.$from.before(depth)
          const node = state.selection.$from.node(depth)
          if (dispatch) {
            dispatch(
              state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                backgroundColor: SECTION_DEFAULT_BG,
              }),
            )
          }
          return true
        },

      removeSection:
        () =>
        ({ state, dispatch }) => {
          const depth = sectionDepth(state.selection.$from)
          if (depth < 0) return false
          const pos = state.selection.$from.before(depth)
          const node = state.selection.$from.node(depth)
          if (dispatch) {
            dispatch(state.tr.replaceWith(pos, pos + node.nodeSize, node.content))
          }
          return true
        },

      deleteSection:
        () =>
        ({ state, dispatch }) => {
          const depth = sectionDepth(state.selection.$from)
          if (depth < 0) return false
          const pos = state.selection.$from.before(depth)
          const node = state.selection.$from.node(depth)
          if (dispatch) {
            dispatch(state.tr.delete(pos, pos + node.nodeSize))
          }
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor
        const { $from, empty } = state.selection
        if (!empty) return false
        const depth = sectionDepth($from)
        if (depth < 0) return false
        const section = $from.node(depth)
        const atStart = $from.parentOffset === 0 && $from.index(depth) === 0
        if (!atStart) return false
        // Only auto-delete when the section is an empty paragraph shell.
        const emptyShell =
          section.childCount === 1 &&
          Boolean(section.firstChild?.isTextblock) &&
          section.firstChild!.content.size === 0
        if (!emptyShell) return false
        return editor.commands.deleteSection()
      },
    }
  },
})
