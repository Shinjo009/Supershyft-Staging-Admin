import { test, expect } from "../fixtures/blogEditor";

async function insertFaqBlock(page: import("@playwright/test").Page) {
  const story = page.getByLabel("Story text");
  await story.click();
  await expect(story).toBeFocused();

  const insert = page.getByTestId("blog-faq-insert");
  await expect(insert).toBeEnabled({ timeout: 20_000 });
  await insert.scrollIntoViewIfNeeded();
  await insert.click();

  await expect(page.getByTestId("blog-faq-editor")).toBeVisible({ timeout: 10_000 });
}

test.describe("Blog FAQ accordion block", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blog/editor/501");
    await expect(page.getByLabel("Story text")).toBeVisible({ timeout: 20_000 });
  });

  test("inserts FAQ, adds edits and deletes questions", async ({ page }) => {
    await insertFaqBlock(page);
    const faq = page.getByTestId("blog-faq-editor");
    await expect(faq).toBeVisible();

    const heading = page.getByTestId("blog-faq-heading-input");
    await expect(heading).toHaveValue("Frequently Asked Questions");
    await heading.fill("Frequently Asked Questions");

    const q0 = page.getByTestId("blog-faq-question-input-0");
    const a0 = page.getByTestId("blog-faq-answer-input-0");
    await q0.fill("What is SuperShyft and how does it work?");
    await a0.fill("SuperShyft is a preventive healthcare platform.");

    await page.getByTestId("blog-faq-add-question").click();
    await expect(page.getByTestId("blog-faq-editor-item-1")).toBeVisible();
    await page.getByTestId("blog-faq-question-input-1").fill("What are biomarkers?");
    await page.getByTestId("blog-faq-answer-input-1").fill("Measurable indicators of health.");

    await page.getByTestId("blog-faq-delete-1").click();
    await expect(page.getByTestId("blog-faq-editor-item-1")).toHaveCount(0);
    await expect(page.getByTestId("blog-faq-question-input-0")).toHaveValue(
      "What is SuperShyft and how does it work?",
    );
  });

  test("preview accordion expands and collapses with multi-open", async ({ page }) => {
    await insertFaqBlock(page);
    await page.getByTestId("blog-faq-question-input-0").fill("Question one?");
    await page.getByTestId("blog-faq-answer-input-0").fill("Answer one.");
    await page.getByTestId("blog-faq-add-question").click();
    await page.getByTestId("blog-faq-question-input-1").fill("Question two?");
    await page.getByTestId("blog-faq-answer-input-1").fill("Answer two.");

    const previewButton = page.getByRole("button", { name: /preview/i }).first();
    await previewButton.click();

    const faq = page.getByTestId("blog-faq-block");
    await expect(faq).toBeVisible();
    await expect(faq.getByText("Frequently Asked Questions")).toBeVisible();

    const q0 = page.getByTestId("blog-faq-question-0");
    const q1 = page.getByTestId("blog-faq-question-1");
    const a0 = page.getByTestId("blog-faq-answer-0");
    const a1 = page.getByTestId("blog-faq-answer-1");

    await expect(q0).toContainText("Question one?");
    await expect(a0).toContainText("Answer one.");
    await expect(a1).toContainText("Answer two.");
    await expect(q0).toHaveAttribute("aria-expanded", "true");
    await expect(q1).toHaveAttribute("aria-expanded", "true");

    await q0.click();
    await expect(q0).toHaveAttribute("aria-expanded", "false");
    await expect(a0.locator("..")).toHaveAttribute("data-open", "false");
    await expect(q1).toHaveAttribute("aria-expanded", "true");

    await q1.click();
    await expect(q1).toHaveAttribute("aria-expanded", "false");

    await q0.click();
    await q1.click();
    await expect(q0).toHaveAttribute("aria-expanded", "true");
    await expect(q1).toHaveAttribute("aria-expanded", "true");
    await expect(a0).toContainText("Answer one.");
    await expect(a1).toContainText("Answer two.");
  });

  test("supports drag handle for reorder", async ({ page }) => {
    await insertFaqBlock(page);
    await page.getByTestId("blog-faq-question-input-0").fill("First question");
    await page.getByTestId("blog-faq-answer-input-0").fill("First answer");
    await page.getByTestId("blog-faq-add-question").click();
    await page.getByTestId("blog-faq-question-input-1").fill("Second question");
    await page.getByTestId("blog-faq-answer-input-1").fill("Second answer");

    const drag = page.getByTestId("blog-faq-drag-1");
    const target = page.getByTestId("blog-faq-editor-item-0");
    const box = await drag.boundingBox();
    const targetBox = await target.boundingBox();
    expect(box).toBeTruthy();
    expect(targetBox).toBeTruthy();
    if (!box || !targetBox) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 8, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByTestId("blog-faq-question-input-0")).toHaveValue("Second question");
    await expect(page.getByTestId("blog-faq-question-input-1")).toHaveValue("First question");
  });
});
