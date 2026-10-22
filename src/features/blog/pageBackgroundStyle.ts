import type { CSSProperties } from "react";
import { mediaUrl } from "./kit/lib/storyBlocks";

/** CSS for article page color and/or wallpaper image. */
export function pageBackgroundStyle(
  color?: string | null,
  imageUrl?: string | null
): CSSProperties | undefined {
  const resolved = mediaUrl(imageUrl || "") || undefined;
  if (!resolved && !color) return undefined;
  const style: CSSProperties = {};
  if (color) style.backgroundColor = color;
  if (resolved) {
    style.backgroundImage = `url(${resolved})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
    style.backgroundAttachment = "scroll";
  }
  return style;
}
