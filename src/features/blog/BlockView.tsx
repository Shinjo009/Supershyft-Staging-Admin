import type { CSSProperties, ReactNode } from "react";
import {
  HIGHLIGHTS,
  blockAlign,
  blockText,
  codeLanguage,
  fontFamilyCss,
  fontSizeCss,
  fontWeightCss,
  headingTag,
  isTaskList,
  listTag,
  mediaAlt,
  mediaSrc,
  mediaUrl,
  paintFillStyle,
  paintTextStyle,
  paletteHex,
  safeHref,
  sectionBackground,
  sectionChildren,
  vimeoId,
  youtubeId,
  type Mark,
  type RichCell,
  type StoryBlock,
} from "./kit/lib/storyBlocks";

function cellParts(value: RichCell | undefined): { text: string; marks: Mark[] } {
  if (value && typeof value === "object") return { text: value.text || "", marks: value.marks || [] };
  return { text: "", marks: [] };
}

function wrapPiece(node: ReactNode, marks: Mark[], key: string): ReactNode {
  let piece = node;
  (
    [
      "code",
      "subscript",
      "superscript",
      "strike",
      "underline",
      "highlight",
      "fontSize",
      "fontFamily",
      "fontWeight",
      "color",
      "italic",
      "bold",
      "link",
    ] as const
  ).forEach((kind) => {
    const mark = marks.find((item) => item.type === kind);
    if (!mark) return;
    if (kind === "code") piece = <code key={`${key}-code`} className="rounded bg-zinc-100 px-1 text-[0.9em]">{piece}</code>;
    else if (kind === "subscript") piece = <sub key={`${key}-sub`}>{piece}</sub>;
    else if (kind === "superscript") piece = <sup key={`${key}-sup`}>{piece}</sup>;
    else if (kind === "strike") piece = <s key={`${key}-s`}>{piece}</s>;
    else if (kind === "underline") piece = <u key={`${key}-u`}>{piece}</u>;
    else if (kind === "highlight") {
      const background = HIGHLIGHTS[mark.value || ""] || HIGHLIGHTS.yellow;
      piece = (
        <mark key={`${key}-mark`} style={{ background, color: "#18181b", borderRadius: 3, padding: "0 2px" }}>
          {piece}
        </mark>
      );
    } else if (kind === "fontSize") {
      const fontSize = fontSizeCss(mark.value);
      if (fontSize) piece = <span key={`${key}-size`} style={{ fontSize }}>{piece}</span>;
    } else if (kind === "fontFamily") {
      const fontFamily = fontFamilyCss(mark.value);
      if (fontFamily) piece = <span key={`${key}-family`} style={{ fontFamily }}>{piece}</span>;
    } else if (kind === "fontWeight") {
      const fontWeight = fontWeightCss(mark.value);
      if (fontWeight) piece = <span key={`${key}-weight`} style={{ fontWeight: Number(fontWeight) || 400 }}>{piece}</span>;
    } else if (kind === "color") {
      const color = paletteHex(mark.value);
      if (color) piece = <span key={`${key}-color`} style={paintTextStyle(color)}>{piece}</span>;
    } else if (kind === "italic") piece = <em key={`${key}-em`}>{piece}</em>;
    else if (kind === "bold") piece = <strong key={`${key}-strong`}>{piece}</strong>;
    else {
      const href = safeHref(mark.href);
      if (href) {
        piece = (
          <a key={`${key}-link`} className="text-sky-700 underline" href={href} rel="noopener noreferrer">
            {piece}
          </a>
        );
      }
    }
  });
  return piece;
}

export function RichText({ text, marks }: { text: string; marks?: Mark[] }) {
  const list = marks || [];
  const lines = text.split("\n");
  if (!list.length) {
    return (
      <>
        {lines.map((line, index) => (
          <span key={index}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </>
    );
  }
  const points = new Set<number>([0, text.length]);
  list.forEach((mark) => {
    points.add(mark.start);
    points.add(mark.end);
  });
  const sorted = [...points].filter((point) => point >= 0 && point <= text.length).sort((a, b) => a - b);
  const pieces: ReactNode[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (start === end) continue;
    const active = list.filter((mark) => mark.start <= start && mark.end >= end);
    const chunk = text.slice(start, end);
    const linesInChunk = chunk.split("\n");
    const node = (
      <>
        {linesInChunk.map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </>
    );
    pieces.push(<span key={`${start}-${end}`}>{wrapPiece(node, active, `${start}-${end}`)}</span>);
  }
  return <>{pieces}</>;
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
