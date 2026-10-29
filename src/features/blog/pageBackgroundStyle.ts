import type { CSSProperties } from "react";
import { isGradientPaint, mediaUrl, normalizePaint } from "./kit/lib/storyBlocks";

/** CSS for article page color and/or wallpaper image. */
export function pageBackgroundStyle(
  color?: string | null,
  imageUrl?: string | null
): CSSProperties | undefined {
  const paint = normalizePaint(color);
  const resolved = mediaUrl(imageUrl || "") || undefined;
  if (!resolved && !paint) return undefined;
  const style: CSSProperties = {};
  const layers: string[] = [];
  if (resolved) {
    layers.push(`url(${resolved})`);
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
    style.backgroundAttachment = "scroll";
  }
  if (paint && isGradientPaint(paint)) {
    layers.push(paint);
  } else if (paint) {
    style.backgroundColor = paint;
  }
  if (layers.length) style.backgroundImage = layers.join(", ");
  return style;
}
