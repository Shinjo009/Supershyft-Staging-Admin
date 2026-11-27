import { test, expect } from "../fixtures/blogEditor";

test.describe("Blog Insert Link embeds", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blog/editor/501");
    await expect(page.getByLabel("Story text")).toBeVisible({ timeout: 20_000 });
  });

  test("generic URL becomes a clickable hyperlink", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror, .simple-editor");
    await editor.click();
    await page.keyboard.type("Read more ");

    await page.getByTestId("blog-link-popover").click();
    const input = page.getByTestId("blog-link-popover-input");
    await expect(input).toBeVisible();
    await input.fill("https://example.com/article");
    await input.press("Enter");

    const link = editor.locator('a[href="https://example.com/article"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText("https://example.com/article");
    await expect(page.getByTestId("blog-instagram-node")).toHaveCount(0);
  });

  test("Instagram post URL inserts embed preview with edit and remove", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror, .simple-editor");
    await editor.click();

    await page.getByTestId("blog-link-popover").click();
    const input = page.getByTestId("blog-link-popover-input");
    await input.fill("https://www.instagram.com/p/ABC123xyz/");
    await input.press("Enter");

    const embed = page.getByTestId("blog-instagram-node");
    await expect(embed).toBeVisible();
    const preview = page.getByTestId("blog-instagram-embed");
    await expect(preview).toBeVisible();
    await expect(preview.locator("iframe[src*='instagram.com']")).toHaveCount(1);
    await expect(preview.getByRole("link", { name: /Open on Instagram/i })).toBeVisible();

    await page.getByTestId("blog-instagram-edit").click();
    const urlInput = page.getByTestId("blog-instagram-url-input");
    await expect(urlInput).toBeVisible();
    await urlInput.fill("https://www.instagram.com/reel/ReelCode99/");
    await page.getByTestId("blog-instagram-apply").click();
    await expect(embed).toHaveAttribute("data-src", "https://www.instagram.com/reel/ReelCode99/");

    await page.getByTestId("blog-instagram-remove").click();
    await expect(page.getByTestId("blog-instagram-node")).toHaveCount(0);
  });

  test("YouTube URL via Insert Link becomes a video embed", async ({ page }) => {
    const editor = page.locator(".tiptap.ProseMirror, .simple-editor");
    await editor.click();

    await page.getByTestId("blog-link-popover").click();
    const input = page.getByTestId("blog-link-popover-input");
    await input.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await input.press("Enter");

    await expect(editor.locator("iframe[src*='youtube-nocookie.com/embed/dQw4w9WgXcQ']")).toBeVisible();
    await expect(page.getByTestId("blog-instagram-node")).toHaveCount(0);
  });
});
