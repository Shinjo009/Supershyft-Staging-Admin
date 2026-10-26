import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BlogArticleBody, DevicePreviewFrame } from "./DevicePreviewFrame";
import { blogError, getPost, type PostDetail } from "./blogApi";
import { usePermissions } from "../../contexts/PermissionContext";

export function BlogPreview() {
  const { id = "" } = useParams();
  const { canEditTask } = usePermissions();
  const mayEditPosts = canEditTask("blog", "posts");
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");
    getPost(id)
      .then((next) => {
        if (!cancel) setPost(next);
      })
      .catch((err: unknown) => {
        if (!cancel) {
          setPost(null);
          setError(blogError(err));
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [id]);

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] min-h-0 min-w-0 flex-col overflow-hidden sm:-m-6">
      {loading ? <p className="p-4 text-sm text-zinc-500">Loading…</p> : null}
      {!loading && error ? <p className="p-4 text-sm text-red-600">{error}</p> : null}

      {!loading && !error && post ? (
        <DevicePreviewFrame
          toolbarExtra={
            id && mayEditPosts ? (
              <Link
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
                to={`/blog/editor/${id}`}
              >
                Edit
              </Link>
            ) : null
          }
        >
          <BlogArticleBody
            title={post.title || "Untitled"}
            description={post.description || undefined}
            content={post.content || []}
            backgroundColor={post.background_color}
            backgroundImageUrl={post.background_image_url}
            authorName={post.author_name}
            readTime={post.read_time}
            publishedAt={post.published_at}
          />
        </DevicePreviewFrame>
      ) : null}
    </div>
  );
}
