import type { CSSProperties } from "react";
import {
  blockAlign,
  blockText,
  codeLanguage,
  headingTag,
  isTaskList,
  listTag,
  mediaAlt,
  mediaSrc,
  mediaUrl,
  paintFillStyle,
  sectionBackground,
  sectionChildren,
  vimeoId,
  youtubeId,
  type Mark,
  type RichCell,
  type StoryBlock,
} from "./kit/lib/storyBlocks";
import { InstagramEmbed } from "./kit/components/tiptap-node/instagram-node/InstagramEmbed";
import { FaqAccordion } from "./FaqAccordion";
import { RichText } from "./RichText";

export { RichText } from "./RichText";

function cellParts(value: RichCell | undefined): { text: string; marks: Mark[] } {
  if (value && typeof value === "object") return { text: value.text || "", marks: value.marks || [] };
  return { text: "", marks: [] };
}

function RichCellView({ value }: { value: RichCell }) {
  const { text, marks } = cellParts(value);
  return <RichText text={text} marks={marks} />;
}

function alignStyle(block: StoryBlock): CSSProperties | undefined {
  const align = blockAlign(block);
  return align ? { textAlign: align } : undefined;
}

const headingClass: Record<string, string> = {
  h1: "text-3xl",
  h2: "text-2xl",
  h3: "text-xl",
  h4: "text-lg",
  h5: "text-base",
  h6: "text-sm",
};

export function BlockView({ block }: { block: StoryBlock }) {
  const tag = (block.tag || "").trim().toLowerCase();

  if (tag === "section") {
    const children = sectionChildren(block);
    if (!children.length) return null;
    return (
      <section
        className="my-4 space-y-3 rounded-lg px-4 py-4"
        style={paintFillStyle(sectionBackground(block) || "#EFF6FF")}
      >
        {children.map((child, index) => (
          <BlockView key={index} block={child} />
        ))}
      </section>
    );
  }
  if (tag === "p") {
    return (
      <p className="text-base leading-7 text-zinc-900" style={alignStyle(block)}>
        <RichText text={blockText(block)} marks={block.marks} />
      </p>
    );
  }
  if (/^h[1-6]$/.test(tag)) {
    const Tag = headingTag(block) as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    return (
      <Tag className={`font-semibold text-zinc-900 ${headingClass[Tag] || "text-xl"}`} style={alignStyle(block)}>
        <RichText text={blockText(block)} marks={block.marks} />
      </Tag>
    );
  }
  if (tag === "blockquote") {
    return (
      <blockquote className="border-l-4 border-zinc-300 pl-4 text-zinc-700">
        <p style={alignStyle(block)}>
          <RichText text={blockText(block)} marks={block.marks} />
        </p>
      </blockquote>
    );
  }
  if ((tag === "ul" || tag === "ol") && isTaskList(block)) {
    const legacyChecked = block.checked || [];
    return (
      <ul className="space-y-2">
        {(block.items || []).map((item, index) => {
          const done =
            typeof item?.checked === "boolean" ? item.checked : Boolean(legacyChecked[index]);
          return (
            <li key={index} className="flex items-start gap-2 text-zinc-900">
              <input
                type="checkbox"
                className="mt-1"
                checked={done}
                readOnly
                disabled
                aria-label={done ? "Done" : "Not done"}
              />
              <span>
                <RichCellView value={item} />
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  if (tag === "ul" || tag === "ol") {
    const items = (block.items || []).map((item, index) => (
      <li key={index}>
        <RichCellView value={item} />
      </li>
    ));
    const className = "list-outside space-y-1 pl-6 text-zinc-900";
    return listTag(block) === "ol" ? <ol className={`${className} list-decimal`}>{items}</ol> : <ul className={`${className} list-disc`}>{items}</ul>;
  }
  if (tag === "table") {
    return (
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-full border-collapse text-sm text-zinc-900">
          {(block.headers || []).length ? (
            <thead className="text-left text-zinc-900">
              <tr>
                {(block.headers || []).map((cell, index) => (
                  <th key={index} className="border border-zinc-300 px-3 py-2 font-normal">
                    <RichCellView value={cell} />
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {(block.rows || []).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {(row || []).map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-zinc-300 px-3 py-2 align-top">
                    <RichCellView value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (tag === "img") {
    const src = mediaUrl(mediaSrc(block));
    if (!src) return null;
    return (
      <figure>
        <img className="max-w-full rounded-lg" src={src} alt={mediaAlt(block)} />
      </figure>
    );
  }
  if (tag === "audio") {
    const src = mediaUrl(mediaSrc(block));
    if (!src) return null;
    return (
      <figure>
        <audio className="w-full" controls src={src} />
      </figure>
    );
  }
  if (tag === "video") {
    const src = mediaUrl(mediaSrc(block));
    if (!src) return null;
    const youtube = youtubeId(src);
    if (youtube) {
      return (
        <figure className="aspect-video overflow-hidden rounded-lg bg-zinc-100">
          <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${youtube}`} title="Video" allowFullScreen />
        </figure>
      );
    }
    const vimeo = vimeoId(src);
    if (vimeo) {
      return (
        <figure className="aspect-video overflow-hidden rounded-lg bg-zinc-100">
          <iframe className="h-full w-full" src={`https://player.vimeo.com/video/${vimeo}`} title="Video" allowFullScreen />
        </figure>
      );
    }
    return (
      <figure>
        <video className="max-w-full rounded-lg" controls src={src} />
      </figure>
    );
  }
  if (tag === "instagram") {
    const src = mediaSrc(block);
    if (!src) return null;
    return (
      <figure className="my-6">
        <InstagramEmbed src={src} variant="view" />
      </figure>
    );
  }
  if (tag === "faq") {
    return <FaqAccordion block={block} />;
  }
  if (tag === "pre") {
    return (
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
        <code data-language={codeLanguage(block)}>{blockText(block)}</code>
      </pre>
    );
  }
  if (tag === "hr") return <hr className="border-zinc-200" />;
  return null;
}
