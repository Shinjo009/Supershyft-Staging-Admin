import { BlockView } from "./BlockView";
import { formatPublishedDate } from "./blogMeta";
import { pageBackgroundStyle } from "./pageBackgroundStyle";
import type { StoryBlock } from "./kit/lib/storyBlocks";

export type { DeviceMode } from "../../shared/ui/DevicePreviewFrame";
export { DevicePreviewFrame } from "../../shared/ui/DevicePreviewFrame";

type ArticleProps = {
  title: string;
  description?: string;
  content: StoryBlock[];
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  authorName?: string | null;
  readTime?: number | null;
  publishedAt?: string | null;
};

export function BlogArticleBody({
  title,
  description,
  content,
  backgroundColor,
  backgroundImageUrl,
  authorName,
  readTime,
  publishedAt,
}: ArticleProps) {
  const bg = pageBackgroundStyle(backgroundColor, backgroundImageUrl);
  const mins = Math.max(1, Number(readTime) || 1);
  const dateLabel = formatPublishedDate(publishedAt);
  const showByline = Boolean(authorName?.trim()) || readTime != null || Boolean(dateLabel);

  return (
    <div className="min-h-full bg-white p-4 sm:p-6">
      <article
        className="mx-auto w-full max-w-[960px] space-y-5 p-4 text-zinc-900 sm:p-6"
        style={bg || { backgroundColor: "#ffffff" }}
      >
        <h1 className="text-3xl font-semibold text-zinc-900">{title || "Untitled"}</h1>
        {showByline ? (
          <div className="space-y-1">
            {authorName?.trim() ? (
              <p className="text-base font-semibold text-zinc-800">{authorName.trim()}</p>
            ) : null}
            <p className="text-sm text-zinc-500">
              {mins} mins read
              {dateLabel ? ` • ${dateLabel}` : ""}
            </p>
          </div>
        ) : null}
        {description ? <p className="text-lg text-zinc-600">{description}</p> : null}
        <div className="space-y-4">
          {(content || []).map((block, index) => (
            <BlockView key={index} block={block} />
          ))}
        </div>
      </article>
    </div>
  );
}
