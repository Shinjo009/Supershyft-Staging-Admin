import { api, getApiError } from "../../lib/api";
import type { StoryBlock } from "./kit/lib/storyBlocks";

export type ListedPost = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  status: string;
  category: string | null;
  author_name: string | null;
  author_role: string | null;
  avatar_url: string | null;
  published_at: string | null;
};

export type BlogCategory = {
  id: number;
  name: string;
  slug: string;
  post_count: number;
};

export type PostDetail = {
  title: string;
  description: string;
  slug: string;
  status: "draft" | "published";
  category_id: number;
  category?: string | null;
  focus_keyword: string;
  thumbnail_url: string | null;
  background_color?: string | null;
  background_image_url?: string | null;
  content: StoryBlock[];
  author_name?: string;
  read_time?: number;
  published_at?: string | null;
};

type Envelope<T> = { data: T };

function unwrap<T>(body: Envelope<T>): T {
  return body.data;
}

export function blogError(err: unknown): string {
  return getApiError(err);
}

export async function listPosts(params: {
  status: string;
  category?: string;
  search?: string;
  page: number;
  limit: number;
}): Promise<{ posts: ListedPost[]; total: number; totalPages: number }> {
  const { data } = await api.get<
    Envelope<{ posts: ListedPost[]; total: number; totalPages: number }>
  >("/blog/posts", { params });
  return unwrap(data);
}

export async function listCategories(): Promise<BlogCategory[]> {
  const { data } = await api.get<Envelope<{ categories: BlogCategory[] }>>("/blog/categories");
  return unwrap(data).categories;
}

export async function createCategory(name: string): Promise<void> {
  await api.post("/blog/categories", { name });
}

export async function renameCategory(id: number, name: string): Promise<void> {
  await api.put(`/blog/categories/${id}`, { name });
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/blog/categories/${id}`);
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/blog/posts/${id}`);
}

export async function getPost(id: string): Promise<PostDetail> {
  const { data } = await api.get<Envelope<{ post: PostDetail }>>(`/blog/posts/${id}`);
  return unwrap(data).post;
}

export async function savePost(
  postId: string,
  body: {
    title: string;
    slug: string;
    description: string;
    content: StoryBlock[];
    category_id: number;
    thumbnail_url: string;
    background_color?: string | null;
    background_image_url?: string | null;
    focus_keyword: string | string[];
    status: "draft" | "published";
  }
): Promise<{ id: number; slug: string }> {
  if (postId) {
    const { data } = await api.put<Envelope<{ id: number; slug: string }>>(`/blog/posts/${postId}`, body);
    return unwrap(data);
  }
  const { data } = await api.post<Envelope<{ id: number; slug: string }>>("/blog/posts", body);
  return unwrap(data);
}

export async function uploadBlogMedia(file: File, field: "image" | "file" = "image"): Promise<string> {
  const form = new FormData();
  form.append(field, file);
  const { data } = await api.post<Envelope<{ url: string }>>("/blog/uploads", form);
  return unwrap(data).url;
}
