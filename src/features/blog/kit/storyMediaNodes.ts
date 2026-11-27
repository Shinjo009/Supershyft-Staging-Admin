/**
 * Media / CTA nodes for the TipTap story editor.
 * Display URLs through mediaUrl() (same as the public article). Stored `src` is unchanged.
 */
import { mergeAttributes, Node } from '@tiptap/core'
import type { DOMOutputSpec } from 'prosemirror-model'
import { Image } from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { InstagramNodeView } from './components/tiptap-node/instagram-node/instagram-node'
import {
  CTA_DEFAULT_STYLE,
  ctaBorderCss,
  instagramEmbedUrl,
  mediaUrl,
  normalizeInstagramUrl,
  vimeoId,
  youtubeId,
  type CtaAlignment,
  type ResolvedCtaStyle,
} from './lib/storyBlocks'

export const StoryImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const raw = String(HTMLAttributes.src || '')
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { src: mediaUrl(raw) || raw })]
  },
})

type StoryCtaAttrs = {
  text: string
  href: string
  alignment?: CtaAlignment
  target?: string
} & Partial<ResolvedCtaStyle>

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    storyVideo: {
      setStoryVideo: (options: { src: string }) => ReturnType
    }
    storyAudio: {
      setStoryAudio: (options: { src: string }) => ReturnType
    }
    storyInstagram: {
      setStoryInstagram: (options: { src: string }) => ReturnType
    }
    storyCta: {
      setStoryCta: (options: StoryCtaAttrs) => ReturnType
      updateStoryCta: (options: Partial<StoryCtaAttrs>) => ReturnType
    }
  }
}

function videoDom(rawSrc: string): DOMOutputSpec {
  const display = mediaUrl(rawSrc) || rawSrc
  const root = { class: 'story-video', 'data-story-video': '', 'data-src': rawSrc }
  const youtube = youtubeId(display)
  if (youtube) {
    return [
      'figure',
      root,
      [
        'iframe',
        {
          src: `https://www.youtube-nocookie.com/embed/${youtube}`,
          title: 'Video',
          allowfullscreen: 'true',
        },
      ],
    ]
  }
  const vimeo = vimeoId(display)
  if (vimeo) {
    return [
      'figure',
      root,
      [
        'iframe',
        {
          src: `https://player.vimeo.com/video/${vimeo}`,
          title: 'Video',
          allowfullscreen: 'true',
        },
      ],
    ]
  }
  return ['figure', root, ['video', { controls: 'true', src: display }]]
}

export const StoryVideo = Node.create({
  name: 'storyVideo',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-src') ||
          element.querySelector('video')?.getAttribute('src') ||
          element.querySelector('iframe')?.getAttribute('src') ||
          '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-story-video]' }, { tag: 'div[data-story-video]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const raw = String(HTMLAttributes.src || '')
    return videoDom(raw)
  },

  addCommands() {
    return {
      setStoryVideo:
        (options) =>
        ({ commands }) => {
          const src = String(options?.src || '').trim()
          if (!src) return false
          return commands.insertContent({ type: this.name, attrs: { src } })
        },
    }
  },
})

export const StoryAudio = Node.create({
  name: 'storyAudio',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-src') || element.querySelector('audio')?.getAttribute('src') || '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-story-audio]' }, { tag: 'audio[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const raw = String(HTMLAttributes.src || '')
    const display = mediaUrl(raw) || raw
    return [
      'figure',
      { class: 'story-audio', 'data-story-audio': '', 'data-src': raw },
      ['audio', { controls: 'true', src: display }],
    ]
  },

  addCommands() {
    return {
      setStoryAudio:
        (options) =>
        ({ commands }) => {
          const src = String(options?.src || '').trim()
          if (!src) return false
          return commands.insertContent({ type: this.name, attrs: { src } })
        },
    }
  },
})

export const StoryInstagram = Node.create({
  name: 'storyInstagram',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          normalizeInstagramUrl(element.getAttribute('data-src') || '') ||
          normalizeInstagramUrl(element.getAttribute('data-instgrm-permalink') || '') ||
          '',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-story-instagram]' }, { tag: 'blockquote.instagram-media' }]
  },

  renderHTML({ HTMLAttributes }) {
    const raw = normalizeInstagramUrl(String(HTMLAttributes.src || '')) || String(HTMLAttributes.src || '')
    const embed = instagramEmbedUrl(raw) || raw
    return [
      'figure',
      { class: 'story-instagram', 'data-story-instagram': '', 'data-src': raw },
      [
        'iframe',
        {
          src: embed,
          title: 'Instagram post',
          class: 'story-instagram-iframe',
          allowfullscreen: 'true',
        },
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InstagramNodeView)
  },

  addCommands() {
    return {
      setStoryInstagram:
        (options) =>
        ({ commands }) => {
          const src = normalizeInstagramUrl(String(options?.src || '').trim())
          if (!src) return false
          return commands.insertContent({ type: this.name, attrs: { src } })
        },
    }
  },
})

function ctaAlign(value: unknown): CtaAlignment {
  const text = String(value || '').trim().toLowerCase()
  return text === 'center' || text === 'right' ? text : 'left'
}

function ctaButtonInlineStyle(attrs: Record<string, unknown>): string {
  const backgroundColor = String(attrs.backgroundColor || CTA_DEFAULT_STYLE.backgroundColor)
  const color = String(attrs.color || CTA_DEFAULT_STYLE.color)
  const fontSize = String(attrs.fontSize || CTA_DEFAULT_STYLE.fontSize)
  const fontWeight = String(attrs.fontWeight || CTA_DEFAULT_STYLE.fontWeight)
  const borderRadius = String(attrs.borderRadius || CTA_DEFAULT_STYLE.borderRadius)
  const padding = String(attrs.padding || CTA_DEFAULT_STYLE.padding)
  const border = ctaBorderCss({
    borderWidth: String(attrs.borderWidth || CTA_DEFAULT_STYLE.borderWidth),
    borderColor: String(attrs.borderColor || CTA_DEFAULT_STYLE.borderColor),
  })
  const parts = [
    'display:inline-block',
    `background-color:${backgroundColor}`,
    `color:${color}`,
    `font-size:${fontSize}`,
    `font-weight:${fontWeight}`,
    `border-radius:${borderRadius}`,
    `padding:${padding}`,
    'text-decoration:none',
    'line-height:1.2',
    'cursor:pointer',
    'user-select:none',
    'border:none',
  ]
  if (border) parts.push(`border:${border}`)
  else parts.push('border:0 solid transparent')
  return parts.join(';')
}

export const StoryCta = Node.create({
  name: 'storyCta',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: 'Learn more',
        parseHTML: (element) =>
          element.getAttribute('data-text') || element.querySelector('[data-cta-label]')?.textContent || 'Learn more',
      },
      href: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-href') || '',
      },
      target: {
        default: '_blank',
        parseHTML: (element) => element.getAttribute('data-target') || '_blank',
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => ctaAlign(element.getAttribute('data-alignment')),
      },
      backgroundColor: {
        default: CTA_DEFAULT_STYLE.backgroundColor,
        parseHTML: (element) => element.getAttribute('data-bg') || CTA_DEFAULT_STYLE.backgroundColor,
      },
      color: {
        default: CTA_DEFAULT_STYLE.color,
        parseHTML: (element) => element.getAttribute('data-color') || CTA_DEFAULT_STYLE.color,
      },
      fontSize: {
        default: CTA_DEFAULT_STYLE.fontSize,
        parseHTML: (element) => element.getAttribute('data-font-size') || CTA_DEFAULT_STYLE.fontSize,
      },
      fontWeight: {
        default: CTA_DEFAULT_STYLE.fontWeight,
        parseHTML: (element) => element.getAttribute('data-font-weight') || CTA_DEFAULT_STYLE.fontWeight,
      },
      borderRadius: {
        default: CTA_DEFAULT_STYLE.borderRadius,
        parseHTML: (element) => element.getAttribute('data-radius') || CTA_DEFAULT_STYLE.borderRadius,
      },
      padding: {
        default: CTA_DEFAULT_STYLE.padding,
        parseHTML: (element) => element.getAttribute('data-padding') || CTA_DEFAULT_STYLE.padding,
      },
      borderWidth: {
        default: CTA_DEFAULT_STYLE.borderWidth,
        parseHTML: (element) => element.getAttribute('data-border-width') || CTA_DEFAULT_STYLE.borderWidth,
      },
      borderColor: {
        default: CTA_DEFAULT_STYLE.borderColor,
        parseHTML: (element) => element.getAttribute('data-border-color') || CTA_DEFAULT_STYLE.borderColor,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-story-cta]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const text = String(HTMLAttributes.text || 'Learn more')
    const alignment = ctaAlign(HTMLAttributes.alignment)
    const target = String(HTMLAttributes.target || '_blank')
    const backgroundColor = String(HTMLAttributes.backgroundColor || CTA_DEFAULT_STYLE.backgroundColor)
    const color = String(HTMLAttributes.color || CTA_DEFAULT_STYLE.color)
    const fontSize = String(HTMLAttributes.fontSize || CTA_DEFAULT_STYLE.fontSize)
    const fontWeight = String(HTMLAttributes.fontWeight || CTA_DEFAULT_STYLE.fontWeight)
    const borderRadius = String(HTMLAttributes.borderRadius || CTA_DEFAULT_STYLE.borderRadius)
    const padding = String(HTMLAttributes.padding || CTA_DEFAULT_STYLE.padding)
    const borderWidth = String(HTMLAttributes.borderWidth || CTA_DEFAULT_STYLE.borderWidth)
    const borderColor = String(HTMLAttributes.borderColor || CTA_DEFAULT_STYLE.borderColor)
    return [
      'div',
      {
        class: 'story-cta',
        'data-story-cta': '',
        'data-text': text,
        'data-href': String(HTMLAttributes.href || ''),
        'data-target': target,
        'data-alignment': alignment,
        'data-bg': backgroundColor,
        'data-color': color,
        'data-font-size': fontSize,
        'data-font-weight': fontWeight,
        'data-radius': borderRadius,
        'data-padding': padding,
        'data-border-width': borderWidth,
        'data-border-color': borderColor,
        style: `text-align:${alignment}`,
      },
      // Non-navigating control in the editor — real link is only in preview/API HTML.
      [
        'span',
        {
          'data-cta-label': '',
          role: 'link',
          style: ctaButtonInlineStyle({
            backgroundColor,
            color,
            fontSize,
            fontWeight,
            borderRadius,
            padding,
            borderWidth,
            borderColor,
          }),
        },
        text,
      ],
    ]
  },

  addCommands() {
    return {
      setStoryCta:
        (options) =>
        ({ commands }) => {
          const text = String(options?.text || '').trim()
          const href = String(options?.href || '').trim()
          if (!text || !href) return false
          return commands.insertContent({
            type: this.name,
            attrs: {
              text,
              href,
              target: options?.target || '_blank',
              alignment: ctaAlign(options?.alignment ?? 'center'),
              backgroundColor: options?.backgroundColor || CTA_DEFAULT_STYLE.backgroundColor,
              color: options?.color || CTA_DEFAULT_STYLE.color,
              fontSize: options?.fontSize || CTA_DEFAULT_STYLE.fontSize,
              fontWeight: options?.fontWeight || CTA_DEFAULT_STYLE.fontWeight,
              borderRadius: options?.borderRadius || CTA_DEFAULT_STYLE.borderRadius,
              padding: options?.padding || CTA_DEFAULT_STYLE.padding,
              borderWidth: options?.borderWidth || CTA_DEFAULT_STYLE.borderWidth,
              borderColor: options?.borderColor || CTA_DEFAULT_STYLE.borderColor,
            },
          })
        },
      updateStoryCta:
        (options) =>
        ({ commands }) => {
          const attrs: Record<string, string> = {}
          const assign = (key: keyof StoryCtaAttrs, value: unknown) => {
            if (value !== undefined) attrs[key] = String(value)
          }
          if (options?.text !== undefined) {
            const text = String(options.text).trim()
            if (!text) return false
            attrs.text = text
          }
          if (options?.href !== undefined) {
            const href = String(options.href).trim()
            if (!href) return false
            attrs.href = href
          }
          assign('target', options?.target)
          if (options?.alignment !== undefined) attrs.alignment = ctaAlign(options.alignment)
          assign('backgroundColor', options?.backgroundColor)
          assign('color', options?.color)
          assign('fontSize', options?.fontSize)
          assign('fontWeight', options?.fontWeight)
          assign('borderRadius', options?.borderRadius)
          assign('padding', options?.padding)
          assign('borderWidth', options?.borderWidth)
          assign('borderColor', options?.borderColor)
          return commands.updateAttributes(this.name, attrs)
        },
    }
  },
})
