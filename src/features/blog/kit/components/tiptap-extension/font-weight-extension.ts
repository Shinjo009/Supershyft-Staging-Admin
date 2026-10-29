import { Extension } from "@tiptap/core"
import { fontWeightCss, fontWeightName } from "../../lib/storyBlocks"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontWeight: {
      setFontWeight: (fontWeight: string) => ReturnType
      unsetFontWeight: () => ReturnType
    }
  }
}

declare module "@tiptap/extension-text-style" {
  interface TextStyleAttributes {
    fontWeight?: string | null
  }
}

export const FontWeight = Extension.create({
  name: "fontWeight",

  addOptions() {
    return {
      types: ["textStyle"],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element: HTMLElement) => fontWeightName(element.style.fontWeight) || null,
            renderHTML: (attributes: { fontWeight?: string | null }) => {
              const weight = fontWeightCss(attributes.fontWeight ?? undefined)
              if (!weight) return {}
              return { style: `font-weight: ${weight}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontWeight:
        (fontWeight) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontWeight: fontWeightName(fontWeight) || null }).run(),
      unsetFontWeight:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontWeight: null }).removeEmptyTextStyle().run(),
    }
  },
})
