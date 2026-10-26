import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { HeaderActionButton, PageHeaderActions } from "../../layouts/PageHeaderActions";
import { usePermissions } from "../../contexts/PermissionContext";
import { PortalMenu } from "../../shared/ui/PortalMenu";
import { mediaUrl } from "./kit/lib/storyBlocks";
import {
  blogError,
  createCategory,
  deleteCategory,
  deletePost,
  listCategories,
  listPosts,
  renameCategory,
  type BlogCategory,
  type ListedPost,
} from "./blogApi";

const PAGE_SIZE = 10;

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function PostRowActions({
  post,
  open,
  onToggle,
  onClose,
  onDelete,
  canEditPosts,
}: {
  post: ListedPost;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
  canEditPosts: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemClass = "block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50";
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="rounded-lg border border-zinc-300 px-2 py-1 text-zinc-700"
        aria-label={`Actions for ${post.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        ···
      </button>
      <PortalMenu open={open} anchorRef={buttonRef} onClose={onClose} width={144}>
        <Link className={itemClass} to={`/blog/view/${post.id}`} role="menuitem" onClick={onClose}>
          View
        </Link>
        {canEditPosts ? (
          <>
            <Link className={itemClass} to={`/blog/editor/${post.id}`} role="menuitem" onClick={onClose}>
              Edit
            </Link>
            <button type="button" className={`${itemClass} text-red-600 hover:bg-red-50`} role="menuitem" onClick={onDelete}>
              Delete
            </button>
          </>
        ) : null}
      </PortalMenu>
    </>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BlogDashboard() {
  const navigate = useNavigate();
  const { canEditTask } = usePermissions();
  const mayEditPosts = canEditTask("blog", "posts");
  const mayEditCategories = canEditTask("blog", "categories");
  const [posts, setPosts] = useState<ListedPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [counts, setCounts] = useState({ all: 0, published: 0, draft: 0 });
  const [categoryName, setCategoryName] = useState("");
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const loadSeq = useRef(0);

  const load = useCallback(
    async (next: { status?: string; category?: string; query?: string; page?: number } = {}) => {
      const seq = ++loadSeq.current;
      const nextStatus = next.status ?? status;
      const nextCategory = next.category ?? category;
      const nextQuery = next.query ?? query;
      const nextPage = next.page ?? page;
      const [listed, cats, allRows, publishedRows, draftRows] = await Promise.all([
        listPosts({
          status: nextStatus,
          category: nextCategory === "all" ? undefined : nextCategory,
          search: nextQuery,
          page: nextPage,
          limit: PAGE_SIZE,
        }),
        listCategories(),
        listPosts({ status: "all", page: 1, limit: 1 }),
        listPosts({ status: "published", page: 1, limit: 1 }),
        listPosts({ status: "draft", page: 1, limit: 1 }),
      ]);
      if (seq !== loadSeq.current) return;
      setPosts(listed.posts);
      setTotal(listed.total);
      setTotalPages(listed.totalPages);
      setCategories(cats);
      setCounts({
        all: allRows.total,
        published: publishedRows.total,
        draft: draftRows.total,
      });
    },
    [status, category, query, page]
  );

  useEffect(() => {
    load().catch((err: unknown) => setError(blogError(err)));
  }, [load]);

  async function refresh(next: { status?: string; category?: string; query?: string; page?: number } = {}) {
    try {
      await load(next);
    } catch (err) {
      setError(blogError(err));
    }
  }

  function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    setQuery(search);
    setPage(1);
    setMenuId(null);
    void refresh({ query: search, page: 1 });
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) {
      setError("Enter a category name.");
      return;
    }
    setError("");
    try {
      await createCategory(name);
      setCategoryName("");
      await refresh();
    } catch (err) {
      setError(blogError(err));
    }
  }

  async function saveRename(event: FormEvent) {
    event.preventDefault();
    if (renameId == null) return;
    const name = renameValue.trim();
    if (!name) {
      setError("Enter a category name.");
      return;
    }
    setError("");
    try {
      await renameCategory(renameId, name);
      setRenameId(null);
      await refresh();
    } catch (err) {
      setError(blogError(err));
    }
  }

  async function removeCategory(item: BlogCategory) {
    if (!window.confirm(`Delete “${item.name}”? Posts in it stay, without a category.`)) return;
    setError("");
    try {
      await deleteCategory(item.id);
      if (category === item.name) {
        setCategory("all");
        setPage(1);
        await refresh({ category: "all", page: 1 });
      } else {
        await refresh();
      }
    } catch (err) {
      setError(blogError(err));
    }
  }

  async function removePost(post: ListedPost) {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    setMenuId(null);
    setError("");
    try {
      await deletePost(post.id);
      const nextPage = posts.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      await refresh({ page: nextPage });
    } catch (err) {
      setError(blogError(err));
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const fieldClass =
    "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-900";

  return (
    <div className="min-w-0 space-y-4" onClick={() => setMenuId(null)}>
      <PageHeaderActions>
        {mayEditPosts ? (
          <HeaderActionButton label="New post" icon={Plus} onClick={() => navigate("/blog/editor")} />
        ) : null}
      </PageHeaderActions>

      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Blog posts</h1>
        <p className="text-sm text-zinc-500">Write, publish, and organize stories. Every author sees the same list.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total posts", counts.all],
          ["Published", counts.published],
          ["Drafts", counts.draft],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-sm text-zinc-500">{label}</p>
            <strong className="text-2xl text-zinc-900">{value}</strong>
          </article>
        ))}
      </section>

      <form className="flex flex-wrap gap-2" onSubmit={applyFilters}>
        <select
          aria-label="Category"
          className={fieldClass}
          value={category}
          onChange={(event) => {
            const next = event.target.value;
            setCategory(next);
            setPage(1);
            void refresh({ category: next, page: 1 });
          }}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          className={fieldClass}
          value={status}
          onChange={(event) => {
            const next = event.target.value;
            setStatus(next);
            setPage(1);
            void refresh({ status: next, page: 1 });
          }}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <input
          className={`${fieldClass} min-w-48 flex-1`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search posts by title"
        />
        <button type="submit" className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const thumb = mediaUrl(post.thumbnail_url || undefined);
                const author = post.author_name || "—";
                return (
                  <tr key={post.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-10 w-14 rounded object-cover" />
                        ) : (
                          <span className="h-10 w-14 rounded bg-zinc-100" />
                        )}
                        <div>
                          <strong className="block text-zinc-900">{post.title}</strong>
                          <p className="max-w-xs truncate text-zinc-500">{post.description || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{post.category || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          post.status === "published"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {post.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-700">
                          {initials(author === "—" ? "A" : author)}
                        </span>
                        <div>
                          <strong className="block text-zinc-900">{author}</strong>
                          <p className="text-xs capitalize text-zinc-500">
                            {(post.author_role || "Author").replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatWhen(post.published_at)}</td>
                    <td className="px-4 py-3">
                      <PostRowActions
                        post={post}
                        open={menuId === post.id}
                        onToggle={() => setMenuId((current) => (current === post.id ? null : post.id))}
                        onClose={() => setMenuId(null)}
                        onDelete={() => void removePost(post)}
                        canEditPosts={mayEditPosts}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!posts.length ? <p className="px-4 py-8 text-sm text-zinc-500">No posts match these filters.</p> : null}
        <footer className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500">
          <p>
            Showing {from}–{to} of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => {
                setPage(page - 1);
                void refresh({ page: page - 1 });
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => {
                setPage(page + 1);
                void refresh({ page: page + 1 });
              }}
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Categories</h2>
        {mayEditCategories ? (
          <form className="mt-3 flex gap-2" onSubmit={saveCategory}>
            <input
              className={`${fieldClass} flex-1`}
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="New category"
            />
            <button type="submit" className="h-10 rounded-lg border border-zinc-300 px-4 text-sm text-zinc-800">
              Add
            </button>
          </form>
        ) : null}
        <ul className="mt-3 divide-y divide-zinc-100">
          {categories.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              {renameId === item.id ? (
                <form className="flex flex-1 gap-2" onSubmit={saveRename}>
                  <input
                    className={`${fieldClass} flex-1`}
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <button type="submit" className="text-zinc-900">
                    Save
                  </button>
                </form>
              ) : (
                <span className="text-zinc-800">
                  {item.name} <span className="text-zinc-400">({item.post_count})</span>
                </span>
              )}
              {mayEditCategories ? (
                <span className="flex gap-3 text-zinc-500">
                  <button
                    type="button"
                    onClick={() => {
                      setRenameId(item.id);
                      setRenameValue(item.name);
                    }}
                  >
                    Rename
                  </button>
                  <button type="button" className="text-red-600" onClick={() => void removeCategory(item)}>
                    Delete
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
