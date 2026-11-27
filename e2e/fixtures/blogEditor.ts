import { test as base, expect, type Page, type Route } from "@playwright/test";
import { seedAdminSession } from "./auth";

const CATEGORIES = [{ id: 1, name: "Wellness", slug: "wellness", post_count: 0 }];

const EMPTY_POST = {
  id: 501,
  title: "Untitled draft",
  slug: "untitled-draft",
  description: "",
  content: [{ tag: "p", text: "Start writing", marks: [] }],
  category_id: 1,
  category: "Wellness",
  status: "draft",
  thumbnail_url: null,
  background_color: null,
  background_image_url: null,
  focus_keyword: "",
  author_name: "E2E Admin",
  published_at: null,
  read_time: 1,
};

function isApi(url: string): boolean {
  return url.includes("/api/") || url.includes(":8000/");
}

async function fulfillJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, meta }),
  });
}

export async function mockBlogEditorApis(page: Page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (!isApi(url) && request.resourceType() === "document") {
      await route.continue();
      return;
    }

    if (url.includes("/employees/auth/me")) {
      await fulfillJson(route, {
        employee_id: 9001,
        name: "E2E Admin",
        role: "admin",
        permissions: null,
        pending_task_count: 0,
      });
      return;
    }

    if (!isApi(url)) {
      await route.continue();
      return;
    }

    if (method === "GET" && url.includes("/blog/categories")) {
      await fulfillJson(route, { categories: CATEGORIES });
      return;
    }

    if (method === "GET" && /\/blog\/posts\/\d+/.test(url)) {
      await fulfillJson(route, { post: EMPTY_POST });
      return;
    }

    if (method === "GET" && url.includes("/blog/posts")) {
      await fulfillJson(route, {
        posts: [EMPTY_POST],
        total: 1,
        totalPages: 1,
      });
      return;
    }

    if ((method === "POST" || method === "PUT") && url.includes("/blog/posts")) {
      await fulfillJson(route, { id: 501, slug: "untitled-draft" });
      return;
    }

    if (method === "POST" && url.includes("/blog/uploads")) {
      await fulfillJson(route, { url: "/media/blog/test.png" });
      return;
    }

    await fulfillJson(route, {});
  });
}

export async function prepareBlogEditor(page: Page) {
  await seedAdminSession(page);
  await mockBlogEditorApis(page);
}

export const test = base.extend<{ prepared: void }>({
  prepared: [
    async ({ page }, use) => {
      await prepareBlogEditor(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
