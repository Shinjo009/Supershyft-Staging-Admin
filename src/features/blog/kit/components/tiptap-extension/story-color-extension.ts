import { Color } from "@tiptap/extension-text-style"

import { isGradientPaint, normalizePaint, paintTextCss } from "../../lib/storyBlocks"

export const StoryColor = Color.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element) =>
              normalizePaint(element.getAttribute("data-text-paint")) ||
              normalizePaint(element.style.backgroundImage) ||
              normalizePaint(element.getAttribute("style")?.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1]) ||
              normalizePaint(element.style.color),
            renderHTML: (attributes) => {
              const paint = normalizePaint(attributes.color)
              if (!paint) return {}
              if (isGradientPaint(paint)) {
                return {
                  "data-text-paint": paint,
                  style: paintTextCss(paint),
                }
              }
              return { style: `color: ${paint}` }
            },
          },
        },
      },
    ]
  },
})
