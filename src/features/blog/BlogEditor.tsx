import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BlogArticleBody, DevicePreviewFrame } from "./DevicePreviewFrame";
import { readMinutesFromBlocks } from "./blogMeta";
import { pageBackgroundStyle } from "./pageBackgroundStyle";
import { StoryRichEditor, type StoryRichEditorHandle } from "./kit/StoryRichEditor";
import { mediaUrl as resolveMedia, normalizePaint, type StoryBlock } from "./kit/lib/storyBlocks";
import { PaintPicker } from "./kit/components/tiptap-ui/paint-picker/paint-picker";
import { authStorage } from "../../lib/authStorage";
import { usePermissions } from "../../contexts/PermissionContext";
import { usePageHeader } from "../../layouts/PageHeaderActions";
import { Modal } from "../../shared/ui/Modal";
import {
  blogError,
  getPost,
  listCategories,
  savePost,
  uploadBlogMedia,
  type BlogCategory,
} from "./blogApi";

type StoryStatus = "draft" | "published";

function fitTextArea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function parseFocusKeywords(focusKeyword: string | undefined): string[] {
  const raw = (focusKeyword || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEditPosts = canEditTask("blog", "posts");
  const headerConfig = useMemo(() => ({ title: "Write post", backTo: "/blog" }), []);
  usePageHeader(headerConfig);
  const editorRef = useRef<StoryRichEditorHandle>(null);
  const [postId, setPostId] = useState(id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<StoryStatus>("draft");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [initialContent, setInitialContent] = useState<StoryBlock[]>([]);
  const [editorKey, setEditorKey] = useState("new");
  const [drawer, setDrawer] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [error, setError] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<StoryBlock[]>([]);
  const [authorName, setAuthorName] = useState(() => authStorage.getProfile()?.name || "");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    fitTextArea(titleRef.current);
    fitTextArea(descriptionRef.current);
  }, [title, description]);

  useEffect(() => {
    let cancel = false;
    listCategories()
      .then(async (rows) => {
        if (cancel) return;
        setCategories(rows);
        if (!id) {
          if (rows[0]) setCategoryId(String(rows[0].id));
          return;
        }
        const post = await getPost(id);
        if (cancel) return;
        setTitle(post.title || "");
        setDescription(post.description || "");
        setSlug(post.slug || "");
        setStatus(post.status === "published" ? "published" : "draft");
        setCategoryId(String(post.category_id || rows[0]?.id || ""));
        setKeywords(parseFocusKeywords(post.focus_keyword));
        setKeywordDraft("");
        setThumbnailUrl(post.thumbnail_url || "");
        setBackgroundColor(normalizePaint(post.background_color) || post.background_color || null);
        setBackgroundImageUrl(post.background_image_url || null);
        setInitialContent(post.content || []);
        setAuthorName(post.author_name?.trim() || authStorage.getProfile()?.name || "");
        setPublishedAt(post.published_at ?? null);
        setEditorKey(`post-${id}`);
        setPostId(id);
      })
      .catch((err: unknown) => {
        if (!cancel) setError(blogError(err));
      });
    return () => {
      cancel = true;
    };
  }, [id]);

  const uploadStoryImage = useCallback((file: File) => uploadBlogMedia(file), []);
  const uploadStoryVideo = useCallback((file: File) => uploadBlogMedia(file, "file"), []);

  function addKeyword(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setKeywords((current) => {
      if (current.some((item) => item.toLowerCase() === text.toLowerCase())) return current;
      return [...current, text];
    });
    setKeywordDraft("");
  }

  function removeKeyword(index: number) {
    setKeywords((current) => current.filter((_, i) => i !== index));
  }

  async function onUploadCover(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      setThumbnailUrl(await uploadBlogMedia(file));
    } catch (err) {
      setError(blogError(err));
    }
  }

  async function onUploadWallpaper(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      setBackgroundImageUrl(await uploadBlogMedia(file));
    } catch (err) {
      setError(blogError(err));
    }
  }

  async function save(nextStatus: StoryStatus) {
    setError("");
    setSaveState("Saving…");
    const content = editorRef.current?.getContent() ?? initialContent;
    if (!categoryId) {
      setSaveState("");
      setError("Choose a category.");
      setDrawer(true);
      return;
    }
    const body = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      content,
      category_id: Number(categoryId),
      thumbnail_url: thumbnailUrl,
      background_color: backgroundColor,
      background_image_url: backgroundImageUrl,
      focus_keyword: keywords,
      status: nextStatus,
    };
    try {
      const saved = await savePost(postId, body);
      const savedId = String(saved.id || postId);
      setPostId(savedId);
      setStatus(nextStatus);
      setInitialContent(content);
      if (nextStatus === "published" && !publishedAt) {
        setPublishedAt(new Date().toISOString().slice(0, 19).replace("T", " "));
      }
      setSaveState(nextStatus === "published" ? "Published" : "Saved");
      if (nextStatus === "published") setDrawer(false);
      if (!id && savedId) navigate(`/blog/editor/${savedId}`, { replace: true });
    } catch (err) {
      setSaveState("");
      setError(blogError(err));
    }
  }

  function openPreview() {
    setPreviewContent(editorRef.current?.getContent() ?? initialContent);
    setShowPreview(true);
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900";

  function growField(event: FormEvent<HTMLTextAreaElement>) {
    fitTextArea(event.currentTarget);
  }

  const pageBg = pageBackgroundStyle(backgroundColor, backgroundImageUrl);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {!mayEditPosts ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          View-only access. You cannot save changes to this post.
        </p>
      ) : null}
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          mayEditPosts ? "" : "pointer-events-none opacity-95"
        }`}
      >
      <StoryRichEditor
        key={editorKey}
        ref={editorRef}
        initialContent={initialContent}
        uploadImage={uploadStoryImage}
        uploadVideo={uploadStoryVideo}
        pageBackground={backgroundColor}
        pageBackgroundImage={backgroundImageUrl}
        onChange={() => setSaveState((current) => (current === "Saved" || current === "Published" ? "" : current))}
        onUploadError={setError}
        actions={
          <div className="ml-2 flex shrink-0 items-center gap-2 pr-3">
            <button type="button" className="text-sm text-zinc-500" onClick={() => setDrawer(true)}>
              Settings
            </button>
            <button type="button" className="text-sm text-zinc-500" onClick={openPreview}>
              Preview
            </button>
            {saveState ? <span className="text-sm text-zinc-500">{saveState}</span> : null}
            {mayEditPosts ? (
              <>
                <button
                  type="button"
                  className="h-8 rounded-full border border-zinc-300 bg-white px-3 text-sm text-zinc-800"
                  onClick={() => void save("draft")}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="h-8 rounded-full bg-emerald-500 px-3 text-sm font-semibold text-white"
                  onClick={() => setConfirmPublish(true)}
                >
                  Publish
                </button>
              </>
            ) : null}
          </div>
        }
        header={
          <>
            <textarea
              ref={titleRef}
              className="writer-title"
              value={title}
              placeholder="Title"
              rows={1}
              maxLength={200}
              onChange={(event) => {
                setTitle(event.target.value);
                growField(event);
              }}
            />
            <textarea
              ref={descriptionRef}
              className="writer-excerpt"
              value={description}
              placeholder="Description"
              rows={1}
              maxLength={500}
              onChange={(event) => {
                setDescription(event.target.value);
                growField(event);
              }}
            />
            {error ? <p className="admin-error">{error}</p> : null}
          </>
        }
      />
      </div>

      {drawer ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Close publish"
            onClick={() => setDrawer(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-base font-semibold text-zinc-900">Story settings</h2>
              <button type="button" className="text-sm text-zinc-600" onClick={() => setDrawer(false)}>
                Close
              </button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-700">Page background</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Color and optional wallpaper applied only to the writing canvas that goes live.
                </p>
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    className={`h-8 rounded-full border px-3 text-xs ${
                      !backgroundColor ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700"
                    }`}
                    onClick={() => setBackgroundColor(null)}
                  >
                    Default
                  </button>
                  <PaintPicker
                    value={backgroundColor || "#f4faf8"}
                    onChange={(paint) => {
                      setBackgroundColor(paint);
                      setError("");
                    }}
                    allowGradient={false}
                  />
                </div>
                <label className="mt-3 block text-sm font-medium text-zinc-700">
                  Background image
                  <input
                    className="mt-1 block w-full text-sm"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => void onUploadWallpaper(event.target.files?.[0])}
                  />
                </label>
                {resolveMedia(backgroundImageUrl || "") ? (
                  <div className="mt-2 space-y-1">
                    <div className="h-20 w-full rounded-lg border border-zinc-200" style={pageBg} />
                    <button
                      type="button"
                      className="text-xs text-zinc-600 hover:text-zinc-900"
                      onClick={() => setBackgroundImageUrl(null)}
                    >
                      Remove wallpaper
                    </button>
                  </div>
                ) : null}
              </div>
              <label className="block text-sm font-medium text-zinc-700">
                Status
                <select
                  className={fieldClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StoryStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publish</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                Category
                <select
                  className={fieldClass}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                Slug
                <input className={fieldClass} value={slug} onChange={(event) => setSlug(event.target.value)} />
              </label>
              <div>
                <p className="text-sm font-medium text-zinc-700">Focus keyword</p>
                {keywords.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <span
                        key={`${keyword}-${index}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-white"
                      >
                        {keyword}
                        <button
                          type="button"
                          className="text-zinc-300 hover:text-white"
                          aria-label={`Remove ${keyword}`}
                          onClick={() => removeKeyword(index)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <input
                    className={fieldClass}
                    value={keywordDraft}
                    placeholder="Type a keyword"
                    onChange={(event) => setKeywordDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addKeyword(keywordDraft);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="mt-1 h-10 shrink-0 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-800"
                    onClick={() => addKeyword(keywordDraft)}
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Type a keyword and press Enter to add another.</p>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <label className="block text-sm font-medium text-zinc-700">
                Thumbnail URL
                <input
                  className="mt-1 block w-full text-sm"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => void onUploadCover(event.target.files?.[0])}
                />
              </label>
              {resolveMedia(thumbnailUrl) ? (
                <img className="h-32 w-full rounded-lg object-cover" src={resolveMedia(thumbnailUrl) || ""} alt="" />
              ) : null}
            </div>
            {mayEditPosts ? (
              <footer className="flex gap-2 border-t border-zinc-200 px-4 py-3">
                <button
                  type="button"
                  className="h-10 flex-1 rounded-lg border border-zinc-300 text-sm text-zinc-800"
                  onClick={() => void save("draft")}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="h-10 flex-1 rounded-lg bg-zinc-900 text-sm font-medium text-white"
                  onClick={() => setConfirmPublish(true)}
                >
                  Publish
                </button>
              </footer>
            ) : null}
          </aside>
        </>
      ) : null}

      <Modal
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        title="Publish"
        maxWidthClassName="max-w-md"
        zIndexClassName="z-[60]"
      >
        <p className="mb-4 text-sm text-zinc-600">Are you sure you want to publish?</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto"
            onClick={() => setConfirmPublish(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 sm:w-auto"
            onClick={() => {
              setConfirmPublish(false);
              void save("published");
            }}
          >
            Yes
          </button>
        </div>
      </Modal>

      {showPreview ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <DevicePreviewFrame
            toolbarExtra={
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800"
                onClick={() => setShowPreview(false)}
              >
                Close preview
              </button>
            }
          >
            <BlogArticleBody
              title={title}
              description={description}
              content={previewContent}
              backgroundColor={backgroundColor}
              backgroundImageUrl={backgroundImageUrl}
              authorName={authorName}
              readTime={readMinutesFromBlocks(previewContent)}
              publishedAt={publishedAt}
            />
          </DevicePreviewFrame>
        </div>
      ) : null}
      </div>
    </div>
  );
}
