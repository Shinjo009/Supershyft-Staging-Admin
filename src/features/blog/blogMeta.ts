import type { StoryBlock } from "./kit/lib/storyBlocks";

const WORD_RE = /[A-Za-z0-9']+/g;
const TAG_RE = /<[^>]+>/g;

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function cellText(value: unknown): string {
  if (typeof value === "string") return value.replace(TAG_RE, " ");
  if (Array.isArray(value)) return value.map(cellText).join(" ");
  if (value && typeof value === "object" && "text" in value) {
    return cellText((value as { text?: unknown }).text);
  }
  return "";
}

function readingText(blocks: StoryBlock[] | undefined): string {
  const parts: string[] = [];
  for (const block of blocks || []) {
    if (!block || typeof block !== "object") continue;
    const tag = (block.tag || "").trim().toLowerCase();
    if (tag === "section") {
      const nested = readingText(
        Array.isArray(block.content) ? (block.content as StoryBlock[]) : [],
      );
      if (nested) parts.push(nested);
    } else if (tag === "p" || HEADING_TAGS.has(tag) || tag === "blockquote") {
      parts.push(cellText(block.content));
    } else if (tag === "pre") {
      parts.push(String(block.content || ""));
    } else if (tag === "ul" || tag === "ol") {
      for (const item of block.items || []) parts.push(cellText(item));
    } else if (tag === "table") {
      for (const cell of block.headers || []) parts.push(cellText(cell));
      for (const row of block.rows || []) {
        for (const cell of row || []) parts.push(cellText(cell));
      }
    }
  }
  return parts.filter(Boolean).join(" ");
}

/** Mirror backend calc_read_time: ceil(words/200), minimum 1. */
export function readMinutesFromBlocks(blocks: StoryBlock[] | undefined): number {
  const text = readingText(blocks).replace(TAG_RE, " ");
  const words = text.match(WORD_RE) || [];
  return Math.max(1, Math.ceil(words.length / 200));
}

/** Format backend published_at to YYYY-MM-DD; empty if missing/invalid. */
export function formatPublishedDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const text = value.trim().replace("T", " ");
  const ymd = text.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
