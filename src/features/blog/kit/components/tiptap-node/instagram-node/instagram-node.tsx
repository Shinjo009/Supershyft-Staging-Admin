"use client"

import { useCallback, useState } from "react"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"
import { normalizeInstagramUrl } from "../../../lib/storyBlocks"
import { InstagramEmbed } from "./InstagramEmbed"

export function InstagramNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const src = String(node.attrs.src || "")
  const [draft, setDraft] = useState(src)
  const [editing, setEditing] = useState(false)

  const applyUrl = useCallback(() => {
    const next = normalizeInstagramUrl(draft)
    if (!next) return
    updateAttributes({ src: next })
    setDraft(next)
    setEditing(false)
  }, [draft, updateAttributes])

  return (
    <NodeViewWrapper
      as="figure"
      className={`story-instagram${selected ? " is-selected" : ""}`}
      data-story-instagram=""
      data-src={src}
      data-testid="blog-instagram-node"
      contentEditable={false}
    >
      <div className="story-instagram-toolbar" contentEditable={false}>
        {editing ? (
          <div className="story-instagram-edit-row">
            <input
              type="url"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://www.instagram.com/p/…"
              data-testid="blog-instagram-url-input"
              className="story-instagram-url-input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  applyUrl()
                }
                if (e.key === "Escape") {
                  setDraft(src)
                  setEditing(false)
                }
              }}
            />
            <button type="button" data-testid="blog-instagram-apply" onClick={applyUrl}>
              Apply
            </button>
            <button
              type="button"
              data-testid="blog-instagram-cancel"
              onClick={() => {
                setDraft(src)
                setEditing(false)
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="story-instagram-actions">
            <button
              type="button"
              data-testid="blog-instagram-edit"
              onClick={() => {
                setDraft(src)
                setEditing(true)
              }}
            >
              Edit URL
            </button>
            <button type="button" data-testid="blog-instagram-remove" onClick={() => deleteNode()}>
              Remove
            </button>
          </div>
        )}
      </div>
      {src ? (
        <InstagramEmbed src={src} variant="editor" />
      ) : (
        <p className="story-instagram-empty">Paste an Instagram post or Reel URL</p>
      )}
    </NodeViewWrapper>
  )
}
