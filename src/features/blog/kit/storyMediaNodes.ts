/**
 * Media nodes for the TipTap story editor.
 * Display URLs through mediaUrl() (same as the public article). Stored `src` is unchanged.
 */
import { mergeAttributes, Node } from '@tiptap/core'
import type { DOMOutputSpec } from 'prosemirror-model'
import { Image } from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { InstagramNodeView } from './components/tiptap-node/instagram-node/instagram-node'
import { instagramEmbedUrl, mediaUrl, normalizeInstagramUrl, vimeoId, youtubeId } from './lib/storyBlocks'

export const StoryImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const raw = String(HTMLAttributes.src || '')
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { src: mediaUrl(raw) || raw })]
  },
})

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
