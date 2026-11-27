import type { ReactNode } from "react";
import {
  HIGHLIGHTS,
  fontFamilyCss,
  fontSizeCss,
  fontWeightCss,
  paintTextStyle,
  paletteHex,
  safeHref,
  type Mark,
} from "./kit/lib/storyBlocks";

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
