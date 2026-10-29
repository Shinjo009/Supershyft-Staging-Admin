/**
 * Convert between the Tiptap editor document (ProseMirror JSON) and the story
 * block format stored in posts.content.
 *
 * Stored shape is tag-only (no `type` discriminator). TipTap JSON is editor-only.
 */
import type { JSONContent } from '@tiptap/react'
import {
  CODE_LANGUAGES,
  FONT_FAMILIES,
  fontSizeCss,
  fontWeightName,
  HIGHLIGHTS,
  normalizePaint,
  blockAlign,
  blockText,
  codeLanguage,
  emptyCell,
  headingTag,
  isTaskList,
  listTag,
  mediaAlt,
  mediaSrc,
  packCell,
  sectionBackground,
  sectionChildren,
  withAlign,
  type Mark,
  type RichCell,
  type StoryBlock,
  type TextAlign,
} from './storyBlocks'
import { normalizeSectionHex, SECTION_DEFAULT_BG } from '../components/tiptap-extension/section-node-extension'

type InlineMark = { type: string; attrs?: Record<string, unknown> }

const LANGUAGES = new Set<string>(CODE_LANGUAGES)
const FONT_FAMILY_SET = new Set<string>(FONT_FAMILIES)
const SIMPLE_MARKS = new Set(['bold', 'italic', 'code', 'underline', 'strike', 'subscript', 'superscript'])
const ALIGNS = new Set(['center', 'right', 'justify'])

function highlightVar(name: string): string {
  return `var(--tt-color-highlight-${name})`
}

function highlightName(value: unknown): string | null {
  const text = String(value || '').trim().toLowerCase()
  const match = text.match(/--tt-color-highlight-([a-z]+)/)
  const name = match ? match[1] : text
  return name in HIGHLIGHTS ? name : null
}

function alignOf(value: unknown): TextAlign | undefined {
  const text = String(value || '').toLowerCase()
  return ALIGNS.has(text) ? (text as TextAlign) : undefined
}

// ------------------------------------------------------------- story -> doc

function inlineNodes(value: RichCell | undefined, marks?: Mark[]): JSONContent[] {
  let text = ''
  let list = marks || []
  if (value && typeof value === 'object') {
    text = value.text || ''
    list = value.marks || []
  } else {
    text = String(value || '')
  }
  if (!text) return []

  const points = new Set<number>([0, text.length])
  list.forEach((mark) => {
    points.add(mark.start)
    points.add(mark.end)
  })
  const sorted = [...points].filter((point) => point >= 0 && point <= text.length).sort((a, b) => a - b)

  const out: JSONContent[] = []
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index]
    const end = sorted[index + 1]
    if (start === end) continue
    const active = list.filter((mark) => mark.start <= start && mark.end >= end)
    const tiptapMarks = collapseTextStyle(active.map(toTiptapMark).filter((mark): mark is InlineMark => mark !== null))
    text
      .slice(start, end)
      .split('\n')
      .forEach((piece, lineIndex) => {
        if (lineIndex > 0) out.push({ type: 'hardBreak' })
        if (piece) out.push(tiptapMarks.length ? { type: 'text', text: piece, marks: tiptapMarks } : { type: 'text', text: piece })
      })
  }
  return out
}

function toTiptapMark(mark: Mark): InlineMark | null {
  if (SIMPLE_MARKS.has(mark.type)) return { type: mark.type }
  if (mark.type === 'highlight') {
    const name = highlightName(mark.value)
    return name ? { type: 'highlight', attrs: { color: highlightVar(name) } } : null
  }
  if (mark.type === 'link' && mark.href) return { type: 'link', attrs: { href: mark.href } }
  if (mark.type === 'color') {
    const paint = normalizePaint(mark.value)
    return paint ? { type: 'textStyle', attrs: { color: paint } } : null
  }
  if (mark.type === 'fontFamily' && mark.value && FONT_FAMILY_SET.has(mark.value)) {
    return { type: 'textStyle', attrs: { fontFamily: mark.value } }
  }
  if (mark.type === 'fontSize' && fontSizeCss(mark.value)) {
    return { type: 'textStyle', attrs: { fontSize: fontSizeCss(mark.value) } }
  }
  if (mark.type === 'fontWeight' && fontWeightName(mark.value)) {
    return { type: 'textStyle', attrs: { fontWeight: fontWeightName(mark.value) } }
  }
  return null
}

function collapseTextStyle(marks: InlineMark[]): InlineMark[] {
  const attrs: Record<string, unknown> = {}
  const rest: InlineMark[] = []
  marks.forEach((mark) => {
    if (mark.type === 'textStyle') Object.assign(attrs, mark.attrs || {})
    else rest.push(mark)
  })
  if (Object.keys(attrs).length) rest.push({ type: 'textStyle', attrs })
  return rest
}

function paragraph(value: RichCell | undefined, marks?: Mark[], align?: TextAlign): JSONContent {
  const content = inlineNodes(value, marks)
  const node: JSONContent = { type: 'paragraph' }
  if (align) node.attrs = { textAlign: align }
  if (content.length) node.content = content
  return node
}

function blockToNodes(block: StoryBlock): JSONContent[] {
  const tag = (block.tag || '').trim().toLowerCase()
  switch (tag) {
    case 'section': {
      const children = sectionChildren(block).flatMap((child) =>
        child?.tag === 'section' ? [] : blockToNodes(child),
      )
      const backgroundColor = normalizeSectionHex(sectionBackground(block)) || SECTION_DEFAULT_BG
      return [
        {
          type: 'section',
          attrs: { backgroundColor },
          content: children.length ? children : [{ type: 'paragraph' }],
        },
      ]
    }
    case 'p':
      return [paragraph(packCell(blockText(block), block.marks || []), undefined, blockAlign(block))]
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(headingTag(block).slice(1))
      const attrs: Record<string, unknown> = { level }
      const align = blockAlign(block)
      if (align) attrs.textAlign = align
      return [{ type: 'heading', attrs, content: inlineNodes(packCell(blockText(block), block.marks || [])) }]
    }
    case 'blockquote':
      return [{ type: 'blockquote', content: [paragraph(packCell(blockText(block), block.marks || []), undefined, blockAlign(block))] }]
    case 'ul':
    case 'ol':
      if (isTaskList(block)) {
        const legacyChecked = block.checked || []
        return [
          {
            type: 'taskList',
            content: (block.items || []).map((item, index) => {
              const done =
                typeof item?.checked === 'boolean'
                  ? item.checked
                  : Boolean(legacyChecked[index])
              return {
                type: 'taskItem',
                attrs: { checked: done },
                content: [paragraph(item)],
              }
            }),
          },
        ]
      }
      return [
        {
          type: listTag(block) === 'ol' ? 'orderedList' : 'bulletList',
          content: (block.items || []).map((item) => ({ type: 'listItem', content: [paragraph(item)] })),
        },
      ]
    case 'table': {
      const rows: JSONContent[] = []
      if ((block.headers || []).length) {
        rows.push({
          type: 'tableRow',
          content: (block.headers || []).map((cell) => ({ type: 'tableHeader', content: [paragraph(cell)] })),
        })
      }
      ;(block.rows || []).forEach((row) => {
        rows.push({
          type: 'tableRow',
          content: (row || []).map((cell) => ({ type: 'tableCell', content: [paragraph(cell)] })),
        })
      })
      return rows.length ? [{ type: 'table', content: rows }] : []
    }
    case 'hr':
      return [{ type: 'horizontalRule' }]
    case 'img': {
      const src = mediaSrc(block)
      return src ? [{ type: 'image', attrs: { src, alt: mediaAlt(block) } }] : []
    }
    case 'pre': {
      const code = blockText(block)
      return [
        {
          type: 'codeBlock',
          attrs: { language: codeLanguage(block) },
          content: code ? [{ type: 'text', text: code }] : [],
        },
      ]
    }
    case 'audio': {
      const src = mediaSrc(block)
      return src ? [{ type: 'storyAudio', attrs: { src } }] : []
    }
    case 'video': {
      const src = mediaSrc(block)
      return src ? [{ type: 'storyVideo', attrs: { src } }] : []
    }
    default:
      return []
  }
}

export function storyToDoc(blocks: StoryBlock[] | null | undefined): JSONContent {
  const content = (blocks || []).flatMap((block) => (block && typeof block === 'object' ? blockToNodes(block) : []))
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

// ------------------------------------------------------------- doc -> story

type Rich = { text: string; marks: Mark[] }

function readInline(nodes: JSONContent[] | undefined): Rich {
  let text = ''
  const marks: Mark[] = []
  ;(nodes || []).forEach((node) => {
    if (node.type === 'hardBreak') {
      text += '\n'
      return
    }
    if (node.type !== 'text' || !node.text) return
    const start = text.length
    text += node.text
    const end = text.length
    ;(node.marks || []).forEach((mark) => {
      marks.push(...fromTiptapMarks(mark as InlineMark, start, end))
    })
  })
  return { text, marks: mergeMarks(marks) }
}

function fromTiptapMark(mark: InlineMark, start: number, end: number): Mark | null {
  if (SIMPLE_MARKS.has(mark.type)) return { type: mark.type as Mark['type'], start, end }
  if (mark.type === 'highlight') {
    const name = highlightName(mark.attrs?.color) || 'yellow'
    return { type: 'highlight', start, end, value: name }
  }
  if (mark.type === 'link') {
    const href = String(mark.attrs?.href || '')
    return /^https?:\/\/\S+$/i.test(href) ? { type: 'link', start, end, href } : null
  }
  return null
}

function fromTiptapMarks(mark: InlineMark, start: number, end: number): Mark[] {
  if (mark.type !== 'textStyle') {
    const one = fromTiptapMark(mark, start, end)
    return one ? [one] : []
  }
  const out: Mark[] = []
  const color = normalizePaint(String(mark.attrs?.color || ''))
  if (color) out.push({ type: 'color', start, end, value: color })
  const family = String(mark.attrs?.fontFamily || '')
  if (FONT_FAMILY_SET.has(family)) out.push({ type: 'fontFamily', start, end, value: family })
  const size = fontSizeCss(String(mark.attrs?.fontSize || ''))
  if (size) out.push({ type: 'fontSize', start, end, value: size })
  const weight = fontWeightName(String(mark.attrs?.fontWeight || ''))
  if (weight) out.push({ type: 'fontWeight', start, end, value: weight })
  return out
}

function mergeMarks(marks: Mark[]): Mark[] {
  const ordered = marks.slice().sort((a, b) => a.start - b.start || a.end - b.end || a.type.localeCompare(b.type))
  const merged: Mark[] = []
  ordered.forEach((mark) => {
    const prev = [...merged].reverse().find((item) => item.type === mark.type && item.href === mark.href && item.value === mark.value)
    if (prev && mark.start <= prev.end) prev.end = Math.max(prev.end, mark.end)
    else merged.push({ ...mark })
  })
  return merged
}

function joinRich(parts: Rich[]): Rich {
  let text = ''
  const marks: Mark[] = []
  parts.forEach((part, index) => {
    if (index > 0) text += '\n'
    const offset = text.length
    text += part.text
    part.marks.forEach((mark) => marks.push({ ...mark, start: mark.start + offset, end: mark.end + offset }))
  })
  return { text, marks }
}

function readContainer(node: JSONContent): Rich {
  const parts: Rich[] = []
  ;(node.content || []).forEach((child) => {
    if (child.type === 'paragraph' || child.type === 'heading') parts.push(readInline(child.content))
    else if (child.type === 'blockquote') parts.push(readContainer(child))
  })
  return joinRich(parts.filter((part) => part.text.trim()))
}

function cell(rich: Rich): RichCell {
  return packCell(rich.text, rich.marks)
}

function textBlock(tag: string, rich: Rich, align?: TextAlign): StoryBlock | null {
  if (!rich.text.trim()) return null
  const block: StoryBlock = { tag, text: rich.text, marks: rich.marks }
  const attributes = withAlign(align)
  if (attributes) block.attributes = attributes
  return block
}

function listItems(list: JSONContent, out: RichCell[]): void {
  ;(list.content || []).forEach((item) => {
    const own = readContainer(item)
    if (own.text.trim()) out.push(cell(own))
    ;(item.content || []).forEach((child) => {
      if (child.type === 'bulletList' || child.type === 'orderedList') listItems(child, out)
    })
  })
}

function nodeToBlocks(node: JSONContent): StoryBlock[] {
  switch (node.type) {
    case 'section': {
      const children = (node.content || []).flatMap((child) =>
        child.type === 'section' ? [] : nodeToBlocks(child),
      )
      if (!children.length) return []
      const backgroundColor = normalizeSectionHex(String(node.attrs?.backgroundColor || '')) || SECTION_DEFAULT_BG
      return [{ tag: 'section', attributes: { style: { backgroundColor } }, content: children }]
    }
    case 'paragraph': {
      const block = textBlock('p', readInline(node.content), alignOf(node.attrs?.textAlign))
      return block ? [block] : []
    }
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2))
      const block = textBlock(`h${level}`, readInline(node.content), alignOf(node.attrs?.textAlign))
      return block ? [block] : []
    }
    case 'blockquote': {
      const first = (node.content || [])[0]
      const block = textBlock('blockquote', readContainer(node), alignOf(first?.attrs?.textAlign))
      return block ? [block] : []
    }
    case 'taskList': {
      const items: RichCell[] = []
      ;(node.content || []).forEach((item) => {
        const own = readContainer(item)
        if (!own.text.trim()) return
        items.push({ ...cell(own), checked: Boolean(item.attrs?.checked) })
      })
      return items.length ? [{ tag: 'ul', attributes: { listType: 'task' }, items }] : []
    }
    case 'bulletList':
    case 'orderedList': {
      const items: RichCell[] = []
      listItems(node, items)
      return items.length ? [{ tag: node.type === 'orderedList' ? 'ol' : 'ul', items }] : []
    }
    case 'table': {
      let headers: RichCell[] = []
      const rows: RichCell[][] = []
      ;(node.content || []).forEach((row, index) => {
        const cells = row.content || []
        const values = cells.map((item) => cell(readContainer(item)))
        if (index === 0 && cells.length && cells.every((item) => item.type === 'tableHeader')) headers = values
        else if (values.length) rows.push(values)
      })
      const width = Math.max(headers.length, ...rows.map((row) => row.length), 0)
      if (width > 0) {
        while (headers.length && headers.length < width) headers.push(emptyCell())
        for (const row of rows) {
          while (row.length < width) row.push(emptyCell())
        }
      }
      const hasText = [...headers, ...rows.flat()].some((value) => value.text.trim())
      return hasText ? [{ tag: 'table', headers, rows }] : []
    }
    case 'horizontalRule':
      return [{ tag: 'hr' }]
    case 'image': {
      const src = String(node.attrs?.src || '').trim()
      return src ? [{ tag: 'img', attributes: { src, alt: String(node.attrs?.alt || '').slice(0, 300) } }] : []
    }
    case 'codeBlock': {
      const content = (node.content || []).map((child) => child.text || '').join('')
      if (!content.trim()) return []
      const language = String(node.attrs?.language || 'text').toLowerCase()
      return [{ tag: 'pre', attributes: { language: LANGUAGES.has(language) ? language : 'text' }, text: content }]
    }
    case 'storyAudio':
    case 'storyVideo': {
      const src = String(node.attrs?.src || '').trim()
      return src ? [{ tag: node.type === 'storyAudio' ? 'audio' : 'video', attributes: { src } }] : []
    }
    default:
      return []
  }
}

export function docToStory(doc: JSONContent | null | undefined): StoryBlock[] {
  return (doc?.content || []).flatMap(nodeToBlocks)
}
