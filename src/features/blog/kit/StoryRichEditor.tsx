/**
 * Story editor built on the Tiptap "Simple Editor" template
 * (https://tiptap.dev/docs/ui-components/templates/simple-editor).
 *
 * The generated template lives in components/tiptap-templates/simple/ and is
 * left untouched. This file uses the same building blocks and toolbar:
 *   headings H1-H4, bullet / numbered / task lists, quote, code block,
 *   image, text alignment; bold, italic, strike, inline code, underline,
 *   highlight, link, superscript, subscript, search and replace, and
 *   light/dark mode. On a narrow screen, highlight and link open in the toolbar.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { EditorContent, EditorContext, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Typography } from '@tiptap/extension-typography'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { FindAndReplace } from '@tiptap/extension-find-and-replace'
import { TableKit } from '@tiptap/extension-table'
import { TextStyle, FontSize, FontFamily, Color } from '@tiptap/extension-text-style'
import { Placeholder, Selection } from '@tiptap/extensions'

import { Button } from './components/tiptap-ui-primitive/button'
import { Spacer } from './components/tiptap-ui-primitive/spacer'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from './components/tiptap-ui-primitive/toolbar'

import { ImageUploadNode } from './components/tiptap-node/image-upload-node/image-upload-node-extension'
import { HorizontalRule } from './components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension'
import './components/tiptap-node/blockquote-node/blockquote-node.scss'
import './components/tiptap-node/code-block-node/code-block-node.scss'
import './components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss'
import './components/tiptap-node/list-node/list-node.scss'
import './components/tiptap-node/image-node/image-node.scss'
import './components/tiptap-node/heading-node/heading-node.scss'
import './components/tiptap-node/paragraph-node/paragraph-node.scss'

import { HeadingDropdownMenu } from './components/tiptap-ui/heading-dropdown-menu'
import { FontFamilyDropdown } from './components/tiptap-ui/font-family-dropdown/font-family-dropdown'
import { FontSizeDropdown } from './components/tiptap-ui/font-size-dropdown/font-size-dropdown'
import { ImageUploadButton } from './components/tiptap-ui/image-upload-button'
import { VideoInsertButton, normalizeVideoUrl } from './components/tiptap-ui/video-insert-button/video-insert-button'
import { DividerButton } from './components/tiptap-ui/divider-button/divider-button'
import { TableInsertButton } from './components/tiptap-ui/table-insert-button/table-insert-button'
import { ListDropdownMenu } from './components/tiptap-ui/list-dropdown-menu'
import { BlockquoteButton } from './components/tiptap-ui/blockquote-button'
import { CodeBlockButton } from './components/tiptap-ui/code-block-button'
import { ColorHighlightPopover, ColorHighlightPopoverButton, ColorHighlightPopoverContent } from './components/tiptap-ui/color-highlight-popover'
import { TextColorPopover } from './components/tiptap-ui/text-color-popover/text-color-popover'
import { LinkButton, LinkContent, LinkPopover } from './components/tiptap-ui/link-popover'
import { MarkButton } from './components/tiptap-ui/mark-button'
import { TextAlignButton } from './components/tiptap-ui/text-align-button'
import { UndoRedoButton } from './components/tiptap-ui/undo-redo-button'
import { SearchAndReplace, SearchAndReplaceButton } from './components/tiptap-ui/search-and-replace'

import { ArrowLeftIcon } from './components/tiptap-icons/arrow-left-icon'
import { HighlighterIcon } from './components/tiptap-icons/highlighter-icon'
import { LinkIcon } from './components/tiptap-icons/link-icon'

import { useIsBreakpoint } from './hooks/use-is-breakpoint'
import { useWindowSize } from './hooks/use-window-size'
import { useCursorVisibility } from './hooks/use-cursor-visibility'
import { ThemeToggle } from './components/tiptap-templates/simple/theme-toggle'

import './styles/_variables.scss'
import './styles/_keyframe-animations.scss'
import './components/tiptap-templates/simple/simple-editor.scss'
import './storyRichEditor.css'

import { mediaUrl, vimeoId, youtubeId, type StoryBlock } from './lib/storyBlocks'
import { docToStory, storyToDoc } from './lib/tiptapStory'
import { StoryAudio, StoryImage, StoryVideo } from './storyMediaNodes'
import { NodeBackground } from './components/tiptap-extension/node-background-extension'
import { StorySection } from './components/tiptap-extension/section-node-extension'
import { TableBackspace } from './components/tiptap-extension/table-backspace-extension'
import { SectionButton } from './components/tiptap-ui/section-button/section-button'

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024

const SEARCH_AND_REPLACE_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  block: 'center',
}

export type StoryRichEditorHandle = {
  /** Current content as story blocks, ready for the API. */
  getContent: () => StoryBlock[]
  focus: () => void
}

type Props = {
  /** Loaded once; to load another post, remount with a new `key`. */
  initialContent: StoryBlock[]
  /** Upload a file and resolve with its URL (blog-backend /api/v1/uploads). */
  uploadImage: (file: File) => Promise<string>
  /** Upload a video file; defaults to `uploadImage` when omitted. */
  uploadVideo?: (file: File) => Promise<string>
  onChange?: () => void
  onUploadError?: (message: string) => void
  /** Page background color applied to the story column (null = default). */
  pageBackground?: string | null
  /** Optional page wallpaper image URL (covers the story column). */
  pageBackgroundImage?: string | null
  /** Rendered above the story text, in the same column (title, description). */
  header?: ReactNode
  /** Rendered at the right end of the toolbar (save status and publish actions). */
  actions?: ReactNode
}

function pastedVideoUrl(text: string): string | null {
  const raw = text.trim()
  if (!raw || /\s/.test(raw)) return null
  const normalized = normalizeVideoUrl(raw)
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'https:') return null
    if (youtubeId(normalized) || vimeoId(normalized)) return normalized
    const path = parsed.pathname.toLowerCase()
    if (path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogv')) return normalized
  } catch {
    return null
  }
  return null
}

function buildPageBgStyle(
  color?: string | null,
  imageUrl?: string | null,
): CSSProperties | undefined {
  const resolved = mediaUrl(imageUrl || '') || undefined
  if (!resolved && !color) return undefined
  const style: CSSProperties = {}
  if (color) style.backgroundColor = color
  if (resolved) {
    style.backgroundImage = `url(${resolved})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
    style.backgroundRepeat = 'no-repeat'
  }
  return style
}

function MainToolbarContent({
  onHighlighterClick,
  onLinkClick,
  onSearchAndReplaceClick,
  isSearchAndReplaceOpen,
  searchAndReplaceButtonRef,
  isMobile,
  uploadVideo,
  onUploadError,
  actions,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  onSearchAndReplaceClick: () => void
  isSearchAndReplaceOpen: boolean
  searchAndReplaceButtonRef: RefObject<HTMLButtonElement | null>
  isMobile: boolean
  uploadVideo: (file: File) => Promise<string>
  onUploadError?: (message: string) => void
  actions?: ReactNode
}) {
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu modal={false} types={['bulletList', 'orderedList', 'taskList']} />
        <BlockquoteButton />
        <CodeBlockButton />
        <DividerButton />
        <TableInsertButton />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <FontFamilyDropdown modal={false} />
        <FontSizeDropdown modal={false} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        <TextColorPopover />
        {!isMobile ? <ColorHighlightPopover /> : <ColorHighlightPopoverButton onClick={onHighlighterClick} />}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ImageUploadButton text="Image" />
        <VideoInsertButton text="Video" uploadVideo={uploadVideo} onUploadError={onUploadError} />
        <SectionButton />
      </ToolbarGroup>
      <Spacer />
      {isMobile ? <ToolbarSeparator /> : null}
      <ToolbarGroup>
        <SearchAndReplaceButton
          ref={searchAndReplaceButtonRef}
          aria-expanded={isSearchAndReplaceOpen}
          data-active-state={isSearchAndReplaceOpen ? 'on' : 'off'}
          onClick={onSearchAndReplaceClick}
        />
        <ThemeToggle />
      </ToolbarGroup>
      {actions}
    </>
  )
}

function MobileToolbarContent({ type, onBack }: { type: 'highlighter' | 'link'; onBack: () => void }) {
  return (
    <>
      <ToolbarGroup>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="tiptap-button-icon" />
          {type === 'highlighter' ? <HighlighterIcon className="tiptap-button-icon" /> : <LinkIcon className="tiptap-button-icon" />}
        </Button>
      </ToolbarGroup>
      <ToolbarSeparator />
      {type === 'highlighter' ? <ColorHighlightPopoverContent /> : <LinkContent />}
    </>
  )
}

export const StoryRichEditor = forwardRef<StoryRichEditorHandle, Props>(function StoryRichEditor(
  { initialContent, uploadImage, uploadVideo, onChange, onUploadError, pageBackground, pageBackgroundImage, header, actions },
  ref,
) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<'main' | 'highlighter' | 'link'>('main')
  const [isSearchAndReplaceOpen, setIsSearchAndReplaceOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const searchAndReplaceButtonRef = useRef<HTMLButtonElement>(null)
  const uploadVideoFile = uploadVideo || uploadImage

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': 'Story text',
        class: 'simple-editor',
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain') || ''
        const videoUrl = pastedVideoUrl(text)
        if (!videoUrl) return false
        const type = view.state.schema.nodes.storyVideo
        if (!type) return false
        const node = type.create({ src: videoUrl })
        view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
        return true
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: { openOnClick: false, enableClickSelection: true, protocols: ['http', 'https'] },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      // Story task lists are flat, so items don't nest.
      TaskItem.configure({ nested: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      StorySection,
      NodeBackground,
      Superscript,
      Subscript,
      TableKit.configure({ table: { resizable: false } }),
      TableBackspace,
      StoryImage,
      StoryVideo,
      StoryAudio,
      Typography,
      Selection,
      FindAndReplace.configure({
        searchDebounceMs: 500,
        injectCSS: false,
      }),
      Placeholder.configure({ placeholder: 'Tell your story…' }),
      ImageUploadNode.configure({
        accept: 'image/jpeg,image/png,image/webp,image/gif',
        maxSize: IMAGE_MAX_BYTES,
        limit: 3,
        upload: (file) => uploadImage(file),
        onError: (error) => onUploadError?.(error.message || 'Upload failed'),
      }),
    ],
    content: storyToDoc(initialContent),
    onUpdate: () => onChange?.(),
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  useEffect(() => {
    if (!isMobile && mobileView !== 'main') setMobileView('main')
  }, [isMobile, mobileView])

  const openSearchAndReplace = useCallback(() => {
    setMobileView('main')
    setIsSearchAndReplaceOpen(true)
  }, [])

  const closeSearchAndReplace = useCallback(() => {
    setIsSearchAndReplaceOpen(false)
    searchAndReplaceButtonRef.current?.focus()
  }, [])

  const toggleSearchAndReplace = useCallback(() => {
    if (isSearchAndReplaceOpen) {
      closeSearchAndReplace()
      return
    }
    openSearchAndReplace()
  }, [closeSearchAndReplace, isSearchAndReplaceOpen, openSearchAndReplace])

  useImperativeHandle(
    ref,
    () => ({
      getContent: () => (editor ? docToStory(editor.getJSON()) : initialContent),
      focus: () => editor?.commands.focus(),
    }),
    [editor, initialContent],
  )

  return (
    <div className="simple-editor-wrapper story-rich-editor">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={
            isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : undefined
          }
        >
          {mobileView === 'main' ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView('highlighter')}
              onLinkClick={() => setMobileView('link')}
              onSearchAndReplaceClick={toggleSearchAndReplace}
              isSearchAndReplaceOpen={isSearchAndReplaceOpen}
              searchAndReplaceButtonRef={searchAndReplaceButtonRef}
              isMobile={isMobile}
              uploadVideo={uploadVideoFile}
              onUploadError={onUploadError}
              actions={actions}
            />
          ) : (
            <MobileToolbarContent type={mobileView === 'highlighter' ? 'highlighter' : 'link'} onBack={() => setMobileView('main')} />
          )}
        </Toolbar>

        <SearchAndReplace
          className="simple-editor-search-and-replace"
          open={isSearchAndReplaceOpen}
          onOpen={openSearchAndReplace}
          onClose={closeSearchAndReplace}
          scrollIntoViewOptions={SEARCH_AND_REPLACE_SCROLL_OPTIONS}
        />

        <div className="story-scroll" style={buildPageBgStyle(pageBackground, pageBackgroundImage)}>
          <div className="story-page" style={buildPageBgStyle(pageBackground, pageBackgroundImage)}>
            {header ? <div className="story-page-header">{header}</div> : null}
            <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
          </div>
        </div>
      </EditorContext.Provider>
    </div>
  )
})
