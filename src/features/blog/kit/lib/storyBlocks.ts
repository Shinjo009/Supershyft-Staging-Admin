export const PALETTE = ['#cc203b', '#8fd4c8', '#ffffff', '#f4faf8', '#ffd166', '#9ecbff'] as const

export const FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Montserrat',
  'Poppins',
  'DM Sans',
  'Lato',
  'Sora',
] as const

/** Pixel sizes the stepper can set. Stored on the story as "16px". */
export const FONT_SIZE_MIN = 8
export const FONT_SIZE_MAX = 96
export const FONT_SIZE_DEFAULT = 16

export function fontSizePx(value: string | undefined): number | null {
  const match = String(value || '')
    .trim()
    .toLowerCase()
    .match(/^(\d+)px$/)
  if (!match) return null
  const size = Number(match[1])
  if (size < FONT_SIZE_MIN || size > FONT_SIZE_MAX) return null
  return size
}

const FONT_FAMILY_CSS: Record<(typeof FONT_FAMILIES)[number], string> = {
  Arial: 'Arial, Helvetica, sans-serif',
  Georgia: 'Georgia, serif',
  'Times New Roman': '"Times New Roman", Times, serif',
  Montserrat: '"Montserrat", Arial, sans-serif',
  Poppins: '"Poppins", Arial, sans-serif',
  'DM Sans': '"DM Sans", Arial, sans-serif',
  Lato: '"Lato", Arial, sans-serif',
  Sora: '"Sora", Arial, sans-serif',
}

export function fontFamilyCss(value: string | undefined): string {
  return FONT_FAMILY_CSS[value as (typeof FONT_FAMILIES)[number]] || ''
}

export function fontSizeCss(value: string | undefined): string {
  const size = fontSizePx(value)
  return size == null ? '' : `${size}px`
}

export const FONT_WEIGHTS = ['light', 'regular', 'medium', 'semibold', 'bold'] as const
export type FontWeightName = (typeof FONT_WEIGHTS)[number]

const FONT_WEIGHT_CSS: Record<FontWeightName, string> = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

const FONT_WEIGHT_LABEL: Record<FontWeightName, string> = {
  light: 'Light',
  regular: 'Regular',
  medium: 'Medium',
  semibold: 'Semibold',
  bold: 'Bold',
}

const FONT_WEIGHT_ALIASES: Record<string, FontWeightName> = {
  light: 'light',
  '300': 'light',
  regular: 'regular',
  normal: 'regular',
  '400': 'regular',
  medium: 'medium',
  '500': 'medium',
  semibold: 'semibold',
  'semi-bold': 'semibold',
  '600': 'semibold',
  bold: 'bold',
  '700': 'bold',
}

export function fontWeightName(value: string | undefined): FontWeightName | '' {
  const key = String(value || '').trim().toLowerCase()
  return FONT_WEIGHT_ALIASES[key] || ''
}

export function fontWeightCss(value: string | undefined): string {
  const name = fontWeightName(value)
  return name ? FONT_WEIGHT_CSS[name] : ''
}

export function fontWeightLabel(value: string | undefined): string {
  const name = fontWeightName(value)
  return name ? FONT_WEIGHT_LABEL[name] : 'Weight'
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const PAINT_MAX = 300
const LINEAR_GRADIENT = /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+)\)$/i
const GRADIENT_STOP = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})(?:\s+(\d{1,3}%))?$/

export function normalizeHex(value: string | null | undefined): string | null {
  const text = String(value || '').trim()
  if (!HEX_COLOR.test(text)) return null
  if (text.length === 4) {
    const [, r, g, b] = text
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return text.toLowerCase()
}

export function isGradientPaint(value: string | null | undefined): boolean {
  return /^linear-gradient\(/i.test(String(value || '').trim())
}

function clampAngle(value: number): number | null {
  if (!Number.isFinite(value)) return null
  const angle = Math.round(value)
  if (angle < 0 || angle > 360) return null
  return angle
}

function normalizeLinearGradient(value: string): string | null {
  const text = value.trim().replace(/\s+/g, ' ')
  if (text.length > PAINT_MAX) return null
  if (/url\s*\(|javascript:|expression\s*\(/i.test(text)) return null
  const match = text.match(LINEAR_GRADIENT)
  if (!match) return null
  const angle = clampAngle(Number(match[1]))
  if (angle == null) return null
  const stops = match[2].split(',').map((part) => part.trim()).filter(Boolean)
  if (stops.length < 2 || stops.length > 4) return null
  const cleaned: string[] = []
  for (const stop of stops) {
    const stopMatch = stop.match(GRADIENT_STOP)
    if (!stopMatch) return null
    const hex = normalizeHex(stopMatch[1])
    if (!hex) return null
    cleaned.push(stopMatch[2] ? `${hex} ${stopMatch[2]}` : hex)
  }
  return `linear-gradient(${angle}deg, ${cleaned.join(', ')})`
}

function hexFromRgb(value: string): string | null {
  const rgb = value.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
  if (!rgb) return null
  const parts = [rgb[1], rgb[2], rgb[3]].map((part) => Number(part))
  if (parts.some((part) => part < 0 || part > 255)) return null
  return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

/** Hex or sanitized linear-gradient. Unknown / unsafe CSS is dropped. */
export function normalizePaint(value: string | null | undefined): string | null {
  const text = String(value || '').trim()
  if (!text || text.length > PAINT_MAX) return null
  return normalizeHex(text) || hexFromRgb(text) || normalizeLinearGradient(text)
}

export function parseLinearGradient(value: string | null | undefined): { angle: number; stops: string[] } | null {
  const paint = normalizePaint(value)
  if (!paint || !isGradientPaint(paint)) return null
  const match = paint.match(LINEAR_GRADIENT)
  if (!match) return null
  return {
    angle: Number(match[1]),
    stops: match[2].split(',').map((part) => part.trim().split(/\s+/)[0]),
  }
}

export function buildLinearGradient(angle: number, stops: string[]): string | null {
  const hexes = stops.map((stop) => normalizeHex(stop)).filter((stop): stop is string => Boolean(stop))
  if (hexes.length < 2) return null
  return normalizeLinearGradient(`linear-gradient(${Math.round(angle)}deg, ${hexes.join(', ')})`)
}

export function paintFillStyle(value: string | null | undefined): { backgroundColor?: string; backgroundImage?: string } {
  const paint = normalizePaint(value)
  if (!paint) return {}
  if (isGradientPaint(paint)) return { backgroundImage: paint }
  return { backgroundColor: paint }
}

export function paintTextStyle(value: string | null | undefined): Record<string, string> {
  const paint = normalizePaint(value)
  if (!paint) return {}
  if (isGradientPaint(paint)) {
    return {
      backgroundImage: paint,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    }
  }
  return { color: paint }
}

export function paintTextCss(value: string | null | undefined): string {
  const paint = normalizePaint(value)
  if (!paint) return ''
  if (isGradientPaint(paint)) {
    return `background-image: ${paint}; -webkit-background-clip: text; background-clip: text; color: transparent`
  }
  return `color: ${paint}`
}

export const CODE_LANGUAGES = ['text', 'python', 'javascript', 'html', 'css', 'sql', 'bash', 'json'] as const

/** Highlight colour names (Tiptap template) -> light background used on the public site. */
export const HIGHLIGHTS: Record<string, string> = {
  gray: '#f8f8f7',
  brown: '#f4eeee',
  orange: '#fbecdd',
  yellow: '#fef9c3',
  green: '#dcfce7',
  blue: '#e0f2fe',
  purple: '#f3e8ff',
  pink: '#fcf1f6',
  red: '#ffe4e6',
}

export type TextAlign = 'center' | 'right' | 'justify'

export type Mark = {
  type:
    | 'bold'
    | 'italic'
    | 'link'
    | 'color'
    | 'code'
    | 'underline'
    | 'strike'
    | 'subscript'
    | 'superscript'
    | 'highlight'
    | 'fontFamily'
    | 'fontSize'
    | 'fontWeight'
  start: number
  end: number
  href?: string
  value?: string
}

/** Always an object so list/table cells stay uniform in the database. */
export type RichCell = { text: string; marks: Mark[]; /** Task list items only */ checked?: boolean }

export type StoryAttributes = {
  style?: {
    textAlign?: TextAlign
    backgroundColor?: string
  }
  src?: string
  alt?: string
  language?: string
  listType?: 'task'
}

/**
 * Tag-only story block stored in posts.content.
 * Discriminator is `tag` (HTML tags + section/video/audio). No `type` field.
 */
export type StoryBlock = {
  tag: string
  /** Text body for p / heading / blockquote / pre. */
  text?: string
  /** Nested blocks for section only. Legacy posts may still store a string here. */
  content?: string | StoryBlock[]
  /** Always present on text blocks; empty array when unmarked. */
  marks?: Mark[]
  attributes?: StoryAttributes
  /** @deprecated Prefer `checked` on each task item. Kept for reading legacy posts. */
  checked?: boolean[]
  items?: RichCell[]
  headers?: RichCell[]
  rows?: RichCell[][]
}

export function emptyCell(text = ''): RichCell {
  return { text, marks: [] }
}

export function packCell(text: string, marks: Mark[] = []): RichCell {
  return { text, marks }
}

export function cellText(value: RichCell | string | null | undefined): string {
  if (value && typeof value === 'object') return value.text || ''
  return String(value || '')
}

export function cellMarks(value: RichCell | string | null | undefined): Mark[] {
  if (value && typeof value === 'object') return value.marks || []
  return []
}

/** Plain text content for text/code blocks (empty for sections). */
export function blockText(block: StoryBlock | null | undefined): string {
  if (typeof block?.text === 'string') return block.text
  return typeof block?.content === 'string' ? block.content : ''
}

/** Nested blocks for a section (empty for other tags). */
export function sectionChildren(block: StoryBlock | null | undefined): StoryBlock[] {
  return Array.isArray(block?.content) ? block.content : []
}

export function blockAlign(block: StoryBlock | null | undefined): TextAlign | undefined {
  const align = block?.attributes?.style?.textAlign
  return align === 'center' || align === 'right' || align === 'justify' ? align : undefined
}

export function sectionBackground(block: StoryBlock | null | undefined): string | undefined {
  return block?.attributes?.style?.backgroundColor
}

export function mediaSrc(block: StoryBlock | null | undefined): string {
  return String(block?.attributes?.src || '').trim()
}

export function mediaAlt(block: StoryBlock | null | undefined): string {
  return String(block?.attributes?.alt || '')
}

export function codeLanguage(block: StoryBlock | null | undefined): string {
  return String(block?.attributes?.language || 'text').trim().toLowerCase() || 'text'
}

export function withAlign(align: TextAlign | undefined): StoryAttributes | undefined {
  if (!align) return undefined
  return { style: { textAlign: align } }
}

export type EditorBlock =
  | { id: string; type: 'text'; html: string }
  | { id: string; type: 'divider' }
  | { id: string; type: 'code'; language: string; code: string }
  | { id: string; type: 'image'; url: string; alt: string }
  | { id: string; type: 'audio'; url: string }
  | { id: string; type: 'video'; url: string }

const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'table'])

export function newId(): string {
  return crypto.randomUUID()
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

export function richToHtml(value: RichCell | string | undefined, marks?: Mark[]): string {
  let text = ''
  let list = marks || []
  if (value && typeof value === 'object') {
    text = value.text || ''
    list = value.marks || []
  } else {
    text = String(value || '')
  }
  if (!list.length) return textToHtml(text)
  const points = new Set<number>([0, text.length])
  list.forEach((mark) => {
    points.add(mark.start)
    points.add(mark.end)
  })
  const sorted = [...points].filter((point) => point >= 0 && point <= text.length).sort((a, b) => a - b)
  let html = ''
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index]
    const end = sorted[index + 1]
    if (start === end) continue
    const active = list.filter((mark) => mark.start <= start && mark.end >= end)
    html += wrapMarks(text.slice(start, end), active)
  }
  return html
}

function wrapMarks(chunk: string, marks: Mark[]): string {
  let piece = textToHtml(chunk)
  ;(['code', 'subscript', 'superscript', 'strike', 'underline', 'highlight', 'fontSize', 'fontFamily', 'fontWeight', 'color', 'italic', 'bold', 'link'] as const).forEach((kind) => {
    const mark = marks.find((item) => item.type === kind)
    if (!mark) return
    if (kind === 'code') piece = `<code>${piece}</code>`
    else if (kind === 'subscript') piece = `<sub>${piece}</sub>`
    else if (kind === 'superscript') piece = `<sup>${piece}</sup>`
    else if (kind === 'strike') piece = `<s>${piece}</s>`
    else if (kind === 'underline') piece = `<u>${piece}</u>`
    else if (kind === 'highlight') piece = `<mark style="background:${HIGHLIGHTS[mark.value || ''] || HIGHLIGHTS.yellow}">${piece}</mark>`
    else if (kind === 'fontSize') {
      const size = fontSizeCss(mark.value)
      if (size) piece = `<span style="font-size:${size}">${piece}</span>`
    } else if (kind === 'fontFamily') {
      const family = fontFamilyCss(mark.value)
      if (family) piece = `<span style="font-family:${family}">${piece}</span>`
    } else if (kind === 'fontWeight') {
      const weight = fontWeightCss(mark.value)
      if (weight) piece = `<span style="font-weight:${weight}">${piece}</span>`
    } else if (kind === 'color') {
      const paint = normalizePaint(mark.value)
      if (paint && isGradientPaint(paint)) {
        piece = `<span data-text-paint="${paint}" style="${paintTextCss(paint)}">${piece}</span>`
      } else if (paint) {
        piece = `<span style="color:${paint}">${piece}</span>`
      }
    }
    else if (kind === 'italic') piece = `<em>${piece}</em>`
    else if (kind === 'bold') piece = `<strong>${piece}</strong>`
    else piece = `<a href="${escapeHtml(mark.href || '')}">${piece}</a>`
  })
  return piece
}

export function cleanMap(value: string): [string, Array<number | null>] {
  const chars: Array<[string, number]> = []
  const source = String(value || '')
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === '\u00a0') chars.push([' ', index])
    else if (char === '\r') {
      if (source[index + 1] === '\n') {
        chars.push(['\n', index + 1])
        index += 1
      } else chars.push(['\n', index])
    } else chars.push([char, index])
  }
  const keep = chars.map(() => true)
  const hspace = (char: string) => char === ' ' || char === '\t'
  chars.forEach(([char], cursor) => {
    if (char !== '\n') return
    for (let previous = cursor - 1; previous >= 0 && keep[previous] && hspace(chars[previous][0]); previous -= 1) {
      keep[previous] = false
    }
    for (let next = cursor + 1; next < chars.length && hspace(chars[next][0]); next += 1) keep[next] = false
  })
  for (let cursor = 0; cursor < chars.length; cursor += 1) {
    if (!(keep[cursor] && hspace(chars[cursor][0]))) continue
    for (let next = cursor + 1; next < chars.length && keep[next] && hspace(chars[next][0]); next += 1) {
      keep[next] = false
    }
  }
  for (let cursor = 0; cursor < chars.length; cursor += 1) {
    if (!(keep[cursor] && chars[cursor][0] === '\n')) continue
    const run = [cursor]
    let next = cursor + 1
    while (next < chars.length) {
      if (!keep[next]) {
        next += 1
        continue
      }
      if (chars[next][0] !== '\n') break
      run.push(next)
      next += 1
    }
    run.slice(2).forEach((extra) => {
      keep[extra] = false
    })
    cursor = next - 1
  }
  let start = 0
  while (start < chars.length && (!keep[start] || ' \t\n'.includes(chars[start][0]))) {
    keep[start] = false
    start += 1
  }
  let end = chars.length - 1
  while (end >= 0 && (!keep[end] || ' \t\n'.includes(chars[end][0]))) {
    keep[end] = false
    end -= 1
  }
  const mapping: Array<number | null> = Array(source.length).fill(null)
  let out = ''
  chars.forEach(([char, src], cursor) => {
    if (!keep[cursor]) return
    mapping[src] = out.length
    out += char
  })
  return [out, mapping]
}

function cleanText(value: string): string {
  return cleanMap(value)[0]
}

function mapSpan(start: number, end: number, mapping: Array<number | null>): [number | null, number | null] {
  let newStart: number | null = null
  let newEnd: number | null = null
  for (let index = Math.max(0, start); index < Math.min(end, mapping.length); index += 1) {
    if (mapping[index] == null) continue
    if (newStart == null) newStart = mapping[index]
    newEnd = (mapping[index] as number) + 1
  }
  return [newStart, newEnd]
}

function plainText(node: Node): string {
  let text = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) text += child.textContent
    else if (child.nodeType === Node.ELEMENT_NODE) {
      text += (child as Element).tagName.toLowerCase() === 'br' ? '\n' : plainText(child)
    }
  })
  return cleanText(text)
}

function paletteColor(value: string): string {
  return normalizePaint(value) || ''
}

function firstFontName(value: string): string {
  return value
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

function fontFamilyFromStyle(style: string): string {
  const raw = (style.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i) || [])[1] || ''
  const name = firstFontName(raw)
  return (FONT_FAMILIES as readonly string[]).includes(name) ? name : ''
}

function fontSizeFromStyle(style: string): string {
  const raw = ((style.match(/(?:^|;)\s*font-size\s*:\s*([^;]+)/i) || [])[1] || '').trim().toLowerCase()
  return fontSizeCss(raw)
}

function fontWeightFromStyle(style: string): string {
  const raw = ((style.match(/(?:^|;)\s*font-weight\s*:\s*([^;]+)/i) || [])[1] || '').trim()
  return fontWeightName(raw)
}

function openMark(node: Element): Array<Partial<Mark> & { type: Mark['type'] }> {
  const tag = node.tagName.toLowerCase()
  if (tag === 'strong' || tag === 'b') return [{ type: 'bold' }]
  if (tag === 'em' || tag === 'i') return [{ type: 'italic' }]
  if (tag === 'code') return [{ type: 'code' }]
  if (tag === 'a') {
    const href = node.getAttribute('href') || ''
    return /^https?:\/\//i.test(href) && !/\s/.test(href) ? [{ type: 'link', href }] : []
  }
  if (tag === 'span' || tag === 'font') {
    const found: Array<Partial<Mark> & { type: Mark['type'] }> = []
    const style = node.getAttribute('style') || ''
    const source =
      tag === 'font'
        ? node.getAttribute('color') || ''
        : node.getAttribute('data-text-paint') ||
          ((style.match(/(?:^|;)\s*background-image\s*:\s*([^;]+)/i) || [])[1] || '') ||
          ((style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i) || [])[1] || '')
    const color = paletteColor(source || '')
    if (color) found.push({ type: 'color', value: color })
    if (tag === 'span') {
      const family = fontFamilyFromStyle(style)
      const size = fontSizeFromStyle(style)
      const weight = fontWeightFromStyle(style)
      if (family) found.push({ type: 'fontFamily', value: family })
      if (size) found.push({ type: 'fontSize', value: size })
      if (weight) found.push({ type: 'fontWeight', value: weight })
    }
    return found
  }
  return []
}

function gatherRich(node: Element, marks: Array<Partial<Mark>>, chunks: Array<[string, Array<Partial<Mark>>]>) {
  const active = marks.concat(openMark(node))
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) chunks.push([child.textContent || '', active])
    else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase()
      if (tag === 'br') chunks.push(['\n', active])
      else if (tag !== 'img') gatherRich(child as Element, active, chunks)
    }
  })
}

function mergeMarks(marks: Mark[]): Mark[] {
  const ordered = marks
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end || a.type.localeCompare(b.type))
  const merged: Mark[] = []
  ordered.forEach((mark) => {
    const prev = merged[merged.length - 1]
    const same =
      prev &&
      prev.type === mark.type &&
      prev.href === mark.href &&
      prev.value === mark.value &&
      mark.start <= prev.end
    if (same && prev) prev.end = Math.max(prev.end, mark.end)
    else merged.push({ ...mark })
  })
  return merged
}

function finishRich(chunks: Array<[string, Array<Partial<Mark>>]>): [string, Mark[]] {
  let raw = ''
  const marks: Mark[] = []
  chunks.forEach(([text, active]) => {
    if (!text) return
    active.forEach((mark) => {
      marks.push({ ...(mark as Mark), start: raw.length, end: raw.length + text.length })
    })
    raw += text
  })
  const [text, mapping] = cleanMap(raw)
  const moved: Mark[] = []
  marks.forEach((mark) => {
    const [start, end] = mapSpan(mark.start, mark.end, mapping)
    if (start == null || end == null) return
    moved.push({ ...mark, start, end })
  })
  return [text, mergeMarks(moved)]
}

function richText(node: Node): [string, Mark[]] {
  const chunks: Array<[string, Array<Partial<Mark>>]> = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) chunks.push([child.textContent || '', []])
    else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase()
      if (tag === 'br') chunks.push(['\n', []])
      else if (tag !== 'img') gatherRich(child as Element, [], chunks)
    }
  })
  return finishRich(chunks)
}

function richValue(node: Node): RichCell {
  const [text, marks] = richText(node)
  return packCell(text, marks)
}

export function headingTag(block: StoryBlock): string {
  const tag = (block.tag || '').trim().toLowerCase()
  if (/^h[1-6]$/.test(tag)) return tag
  return 'h2'
}

export function listTag(block: StoryBlock): 'ul' | 'ol' {
  const tag = (block.tag || '').trim().toLowerCase()
  return tag === 'ol' ? 'ol' : 'ul'
}

export function isTaskList(block: StoryBlock): boolean {
  return block.attributes?.listType === 'task' || (block.tag || '').trim().toLowerCase() === 'task'
}

function pushRich(out: StoryBlock[], tag: string, node: Node) {
  const [content, marks] = richText(node)
  if (!content) return
  out.push({ tag, text: content, marks })
}

function tableBlock(table: Element): StoryBlock | null {
  const rows = [...table.querySelectorAll('tr')]
  let headers: RichCell[] = []
  const body: RichCell[][] = []
  rows.forEach((row, index) => {
    const cells = [...row.children].filter((cell) => ['th', 'td'].includes(cell.tagName.toLowerCase()))
    const values = cells.map((cell) => richValue(cell))
    const header = cells.some((cell) => cell.tagName.toLowerCase() === 'th')
    if (header && index === 0) headers = values
    else if (values.length) body.push(values)
  })
  const hasText = [...headers, ...body.flat()].some((cell) => cellText(cell).trim())
  if (!hasText) return null
  return { tag: 'table', headers, rows: body }
}

function walkFlow(node: Node, out: StoryBlock[]) {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = cleanText(child.textContent || '')
      if (text) out.push({ tag: 'p', text, marks: [] })
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const element = child as Element
    const tag = element.tagName.toLowerCase()
    if (tag === 'p') pushRich(out, 'p', element)
    else if (/^h[1-6]$/.test(tag)) pushRich(out, tag, element)
    else if (tag === 'ul' || tag === 'ol') {
      const items = [...element.children]
        .filter((el) => el.tagName.toLowerCase() === 'li')
        .map((li) => richValue(li))
        .filter((item) => cellText(item).trim())
      if (items.length) out.push({ tag: tag === 'ol' ? 'ol' : 'ul', items })
    } else if (tag === 'blockquote') pushRich(out, 'blockquote', element)
    else if (tag === 'table') {
      const table = tableBlock(element)
      if (table) out.push(table)
    } else if (tag === 'hr') out.push({ tag: 'hr' })
    else if (tag === 'img') {
      const src = element.getAttribute('src') || ''
      if (src) out.push({ tag: 'img', attributes: { src, alt: element.getAttribute('alt') || '' } })
    } else if (tag === 'pre') {
      const content = plainText(element)
      if (content) out.push({ tag: 'pre', attributes: { language: 'text' }, text: content })
    } else if (tag !== 'br') walkFlow(element, out)
  })
}

export function htmlToBlocks(html: string): StoryBlock[] {
  const parsed = new DOMParser().parseFromString(`<div id="story-root">${html || ''}</div>`, 'text/html')
  const root = parsed.getElementById('story-root')
  const out: StoryBlock[] = []
  if (root) walkFlow(root, out)
  return out
}

export function blockToHtml(block: StoryBlock): string {
  const tag = (block.tag || '').trim().toLowerCase()
  if (tag === 'section') {
    const bg = normalizePaint(sectionBackground(block)) || '#EFF6FF'
    const inner = sectionChildren(block).map((child) => blockToHtml(child)).join('')
    const style = isGradientPaint(bg) ? `background-image:${bg}` : `background-color:${bg}`
    return `<div data-type="section" data-background-color="${bg}" style="${style}">${inner}</div>`
  }
  if (tag === 'p') return `<p>${richToHtml(blockText(block), block.marks)}</p>`
  if (/^h[1-6]$/.test(tag)) {
    return `<${tag}>${richToHtml(blockText(block), block.marks)}</${tag}>`
  }
  if (tag === 'ul' || tag === 'ol') {
    const list = listTag(block)
    const items = (block.items || []).map((item) => `<li>${richToHtml(item)}</li>`).join('')
    return `<${list}>${items}</${list}>`
  }
  if (tag === 'blockquote') return `<blockquote><p>${richToHtml(blockText(block), block.marks)}</p></blockquote>`
  if (tag === 'table') {
    const headers = (block.headers || []).map((cell) => `<th>${richToHtml(cell)}</th>`).join('')
    const head = headers ? `<thead><tr>${headers}</tr></thead>` : ''
    const rows = (block.rows || [])
      .map((row) => `<tr>${(row || []).map((cell) => `<td>${richToHtml(cell)}</td>`).join('')}</tr>`)
      .join('')
    return `<table>${head}<tbody>${rows}</tbody></table>`
  }
  return ''
}

function toEditorBlock(block: StoryBlock): EditorBlock | null {
  const tag = (block.tag || '').trim().toLowerCase()
  if (tag === 'hr') return { id: newId(), type: 'divider' }
  if (tag === 'pre') {
    return { id: newId(), type: 'code', language: codeLanguage(block), code: blockText(block) }
  }
  if (tag === 'img') return { id: newId(), type: 'image', url: mediaSrc(block), alt: mediaAlt(block) }
  if (tag === 'audio' || tag === 'video') {
    return { id: newId(), type: tag, url: mediaSrc(block) }
  }
  return null
}

export function blocksToContent(items: EditorBlock[]): StoryBlock[] {
  const content: StoryBlock[] = []
  items.forEach((block) => {
    if (block.type === 'text') content.push(...htmlToBlocks(block.html || ''))
    else if (block.type === 'divider') content.push({ tag: 'hr' })
    else if (block.type === 'code' && (block.code || '').trim()) {
      content.push({ tag: 'pre', attributes: { language: block.language || 'text' }, text: block.code })
    } else if (block.type === 'image' && block.url) {
      content.push({ tag: 'img', attributes: { src: block.url, alt: block.alt || '' } })
    } else if ((block.type === 'audio' || block.type === 'video') && block.url) {
      content.push({ tag: block.type, attributes: { src: block.url } })
    }
  })
  return content
}

export function loadEditorBlocks(source: StoryBlock[]): EditorBlock[] {
  const editor: EditorBlock[] = []
  let html = ''
  function flush() {
    if (!html) return
    editor.push({ id: newId(), type: 'text', html })
    html = ''
  }
  source.forEach((block) => {
    if (!block || typeof block !== 'object') return
    if (TEXT_TAGS.has((block.tag || '').trim().toLowerCase())) {
      html += blockToHtml(block)
      return
    }
    flush()
    const editorBlock = toEditorBlock(block)
    if (editorBlock) editor.push(editorBlock)
  })
  flush()
  return editor.length ? editor : [{ id: newId(), type: 'text', html: '<p><br></p>' }]
}

export function safeHref(href: string | undefined): string | null {
  if (!href || /\s/.test(href)) return null
  if (!/^https?:\/\//i.test(href)) return null
  return href
}

export function paletteHex(value: string | undefined): string | null {
  return normalizePaint(value) || null
}

export function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const piece = parsed.pathname.split('/').filter(Boolean)[0]?.slice(0, 11) || ''
      return /^[\w-]{11}$/.test(piece) ? piece : null
    }
    if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (parsed.pathname === '/watch') {
        const piece = parsed.searchParams.get('v') || ''
        return /^[\w-]{11}$/.test(piece) ? piece : null
      }
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] && ['embed', 'shorts'].includes(parts[0]) && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
        return parts[1]
      }
    }
  } catch {
    return null
  }
  return null
}

export function vimeoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (host === 'vimeo.com' && parts[0] && /^\d+$/.test(parts[0])) return parts[0]
    if (host === 'player.vimeo.com' && parts[0] === 'video' && parts[1] && /^\d+$/.test(parts[1])) return parts[1]
  } catch {
    return null
  }
  return null
}

export function mediaUrl(url: string | undefined): string | null {
  const raw = (url || '').trim()
  if (!raw) return null
  if (raw.startsWith('/')) return raw
  try {
    const parsed = new URL(raw)
    if (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      parsed.pathname.startsWith('/blog/')
    ) {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    return null
  }
  return safeHref(raw)
}
