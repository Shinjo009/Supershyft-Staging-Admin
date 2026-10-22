import { describe, expect, it } from 'vitest'
import { docToStory, storyToDoc } from './tiptapStory'
import type { StoryBlock } from './storyBlocks'

function assertUniformCells(blocks: StoryBlock[]) {
  for (const block of blocks) {
    expect(block).not.toHaveProperty('type')
    expect(typeof block.tag).toBe('string')
    if (block.items) {
      for (const item of block.items) {
        expect(item).toEqual(expect.objectContaining({ text: expect.any(String), marks: expect.any(Array) }))
        expect(typeof item).toBe('object')
      }
    }
    if (block.headers) {
      for (const cell of block.headers) {
        expect(cell).toEqual(expect.objectContaining({ text: expect.any(String), marks: expect.any(Array) }))
      }
    }
    if (block.rows) {
      for (const row of block.rows) {
        for (const cell of row) {
          expect(cell).toEqual(expect.objectContaining({ text: expect.any(String), marks: expect.any(Array) }))
        }
      }
    }
    if (Array.isArray(block.content)) assertUniformCells(block.content)
  }
}

describe('tiptapStory tag-only roundtrip', () => {
  it('emits tag-only blocks with uniform list cells', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Introduction' }] },
        {
          type: 'paragraph',
          attrs: { textAlign: 'justify' },
          content: [{ type: 'text', text: 'Hello world' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Second', marks: [{ type: 'bold' }] }],
                },
              ],
            },
          ],
        },
        {
          type: 'section',
          attrs: { backgroundColor: '#e1902d' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Inside' }] }],
        },
        { type: 'storyVideo', attrs: { src: 'https://www.youtube.com/watch?v=xdA0pGDiUPE' } },
        { type: 'horizontalRule' },
        {
          type: 'codeBlock',
          attrs: { language: 'python' },
          content: [{ type: 'text', text: 'print(1)' }],
        },
      ],
    }

    const story = docToStory(doc)
    assertUniformCells(story)

    expect(story.map((b) => b.tag)).toEqual(['h2', 'p', 'ul', 'section', 'video', 'hr', 'pre'])
    expect(story[1].attributes?.style?.textAlign).toBe('justify')
    expect(story[2].items?.[0]).toEqual({ text: 'First', marks: [] })
    expect(story[2].items?.[1].marks?.some((m) => m.type === 'bold')).toBe(true)
    expect(story[3].attributes?.style?.backgroundColor).toBeTruthy()
    expect(story[4].attributes?.src).toContain('youtube')
    expect(story[6].attributes?.language).toBe('python')

    const again = docToStory(storyToDoc(story))
    assertUniformCells(again)
    expect(again.map((b) => b.tag)).toEqual(story.map((b) => b.tag))
    expect(again[0].text).toBe('Introduction')
    expect(again[0]).not.toHaveProperty('content')
    expect(again[6].text).toBe('print(1)')
    expect(again[2].items?.[0]).toEqual({ text: 'First', marks: [] })
  })

  it('roundtrips task lists with per-item checked', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'task1' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'task 2' }] }],
            },
          ],
        },
      ],
    }
    const story = docToStory(doc)
    expect(story[0].tag).toBe('ul')
    expect(story[0].attributes?.listType).toBe('task')
    expect(story[0].checked).toBeUndefined()
    expect(story[0].items?.[0]).toEqual({ text: 'task1', marks: [], checked: false })
    expect(story[0].items?.[1]).toEqual({ text: 'task 2', marks: [], checked: true })

    const back = docToStory(storyToDoc(story))
    expect(back[0].attributes?.listType).toBe('task')
    expect(back[0].checked).toBeUndefined()
    expect(back[0].items?.[0]).toEqual({ text: 'task1', marks: [], checked: false })
    expect(back[0].items?.[1]).toEqual({ text: 'task 2', marks: [], checked: true })
  })

  it('reads legacy parallel checked array when loading into the editor', () => {
    const legacy: StoryBlock[] = [
      {
        tag: 'ul',
        attributes: { listType: 'task' },
        items: [
          { text: 'Old one', marks: [] },
          { text: 'Old two', marks: [] },
        ],
        checked: [false, true],
      },
    ]
    const doc = storyToDoc(legacy)
    const taskItem = doc.content?.[0]?.content?.[1]
    expect(taskItem?.type).toBe('taskItem')
    expect(taskItem?.attrs?.checked).toBe(true)

    const again = docToStory(doc)
    expect(again[0].items?.[1]).toEqual({ text: 'Old two', marks: [], checked: true })
    expect(again[0].checked).toBeUndefined()
  })

  it('roundtrips highlight marks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello',
              marks: [{ type: 'highlight', attrs: { color: 'var(--tt-color-highlight-yellow)' } }],
            },
          ],
        },
      ],
    }
    const story = docToStory(doc)
    expect(story[0].marks).toEqual([{ type: 'highlight', start: 0, end: 5, value: 'yellow' }])

    const again = docToStory(storyToDoc(story))
    expect(again[0].marks).toEqual([{ type: 'highlight', start: 0, end: 5, value: 'yellow' }])
  })

  it('reads legacy string content and writes text', () => {
    const legacy: StoryBlock[] = [
      { tag: 'h2', content: 'Introduction', marks: [] },
      { tag: 'p', content: 'Hello world', marks: [] },
    ]
    const again = docToStory(storyToDoc(legacy))
    expect(again[0]).toEqual({ tag: 'h2', text: 'Introduction', marks: [] })
    expect(again[1]).toEqual({ tag: 'p', text: 'Hello world', marks: [] })
    expect(again[0]).not.toHaveProperty('content')
  })
})
