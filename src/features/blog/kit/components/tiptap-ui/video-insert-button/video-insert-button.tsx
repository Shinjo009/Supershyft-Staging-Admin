import { useCallback, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"

import { getApiError } from "../../../../../../lib/api"
import { useTiptapEditor } from "../../../hooks/use-tiptap-editor"
import { vimeoId, youtubeId } from "../../../lib/storyBlocks"
import { VideoIcon } from "../../tiptap-icons/video-icon"
import { Button } from "../../tiptap-ui-primitive/button"
import { Card, CardBody, CardItemGroup } from "../../tiptap-ui-primitive/card"
import { Input } from "../../tiptap-ui-primitive/input"
import { Popover, PopoverContent, PopoverTrigger } from "../../tiptap-ui-primitive/popover"
import { Separator } from "../../tiptap-ui-primitive/separator"

const VIDEO_ACCEPT = "video/mp4,video/webm"
const PLAYLIST_ERROR =
  "Paste a single YouTube video link (not a playlist), like youtube.com/watch?v=…"
const GENERIC_LINK_ERROR = "Use a YouTube, Vimeo, or https video link (.mp4, .webm, .ogv)"

export function normalizeVideoUrl(url: string): string {
  const raw = url.trim()
  if (!raw) return ""
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw.replace(/^\/+/, "")}`
}

function isYoutubePlaylistUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeVideoUrl(url))
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      return false
    }
    if (parsed.pathname.toLowerCase().startsWith("/playlist")) return true
    // Playlist-only links have list= but no single-video v=
    return Boolean(parsed.searchParams.get("list") && !parsed.searchParams.get("v"))
  } catch {
    return false
  }
}

function isValidVideoUrl(url: string): boolean {
  const raw = normalizeVideoUrl(url)
  if (!raw) return false
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== "https:") return false
    if (youtubeId(raw) || vimeoId(raw)) return true
    const path = parsed.pathname.toLowerCase()
    return path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".ogv")
  } catch {
    return false
  }
}

function linkValidationError(url: string): string | null {
  const next = normalizeVideoUrl(url)
  if (!next) return GENERIC_LINK_ERROR
  if (isYoutubePlaylistUrl(next)) return PLAYLIST_ERROR
  if (!isValidVideoUrl(next)) return GENERIC_LINK_ERROR
  return null
}

type Props = {
  editor?: Editor | null
  uploadVideo?: (file: File) => Promise<string>
  onUploadError?: (message: string) => void
  text?: string
}

export function VideoInsertButton({
  editor: providedEditor,
  uploadVideo,
  onUploadError,
  text = "Video",
}: Props) {
  const { editor } = useTiptapEditor(providedEditor)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [localError, setLocalError] = useState("")
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const insertSrc = useCallback(
    (src: string) => {
      if (!editor) return
      editor.chain().focus().setStoryVideo({ src }).run()
      setUrl("")
      setLocalError("")
      setOpen(false)
    },
    [editor],
  )

  const onInsertUrl = useCallback(() => {
    const next = normalizeVideoUrl(url)
    const message = linkValidationError(next)
    if (message) {
      setLocalError(message)
      return
    }
    insertSrc(next)
  }, [insertSrc, url])

  const onPickFile = useCallback(
    async (file: File | undefined) => {
      if (!file || !uploadVideo) return
      if (!["video/mp4", "video/webm"].includes(file.type)) {
        setLocalError("Video files must be MP4 or WebM")
        return
      }
      setBusy(true)
      setLocalError("")
      try {
        const src = await uploadVideo(file)
        insertSrc(src)
      } catch (err) {
        const message = getApiError(err) || "Upload failed"
        setLocalError(message)
        onUploadError?.(message)
      } finally {
        setBusy(false)
        if (fileRef.current) fileRef.current.value = ""
      }
    },
    [insertSrc, onUploadError, uploadVideo],
  )

  if (!editor || !editor.isEditable) return null

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setLocalError("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="button"
          tabIndex={-1}
          aria-label="Insert video"
          tooltip="Insert video"
          data-active-state={open ? "on" : "off"}
        >
          <VideoIcon className="tiptap-button-icon" />
          {text ? <span className="tiptap-button-text">{text}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="tiptap-popover">
        <Card>
          <CardBody>
            <CardItemGroup orientation="vertical">
              <label className="text-xs font-medium text-zinc-600">
                Video URL
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=… or youtu.be/…"
                  value={url}
                  disabled={busy}
                  onChange={(event) => {
                    setUrl(event.target.value)
                    setLocalError("")
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      onInsertUrl()
                    }
                  }}
                />
              </label>
              <p className="text-[11px] leading-snug text-zinc-500">
                Single YouTube or Vimeo video, or a direct .mp4 / .webm / .ogv link. Playlists are not
                supported.
              </p>
              <Button type="button" disabled={busy || !url.trim()} onClick={onInsertUrl}>
                Insert link
              </Button>
              {uploadVideo ? (
                <>
                  <Separator orientation="horizontal" />
                  <input
                    ref={fileRef}
                    type="file"
                    accept={VIDEO_ACCEPT}
                    className="hidden"
                    onChange={(event) => void onPickFile(event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {busy ? "Uploading…" : "Upload MP4 / WebM"}
                  </Button>
                </>
              ) : null}
              {localError ? <p className="text-xs text-red-600">{localError}</p> : null}
            </CardItemGroup>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
