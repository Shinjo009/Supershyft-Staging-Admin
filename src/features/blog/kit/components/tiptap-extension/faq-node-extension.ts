import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { FAQ_DEFAULT_HEADING } from "../../lib/storyBlocks"
import { FaqNodeView } from "../tiptap-node/faq-node/faq-node"
import { defaultFaqItems, serializeFaqItems } from "./faq-types"

export type { FaqItemAttr } from "./faq-types"
export { newFaqItemId, defaultFaqItems, parseFaqItems, serializeFaqItems } from "./faq-types"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    storyFaq: {
      insertFaq: () => ReturnType
    }
  }
}

export const StoryFaq = Node.create({
  name: "storyFaq",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      heading: {
        default: FAQ_DEFAULT_HEADING,
        parseHTML: (element) => element.getAttribute("data-heading") || FAQ_DEFAULT_HEADING,
      },
      itemsJson: {
        default: serializeFaqItems(defaultFaqItems()),
        parseHTML: (element) => element.getAttribute("data-items") || serializeFaqItems(defaultFaqItems()),
        renderHTML: (attributes) => ({
          "data-items": String(attributes.itemsJson || serializeFaqItems(defaultFaqItems())),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="faq"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-type": "faq",
        "data-heading": HTMLAttributes.heading || FAQ_DEFAULT_HEADING,
        class: "story-faq",
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqNodeView)
  },

  addCommands() {
    return {
      insertFaq:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              heading: FAQ_DEFAULT_HEADING,
              itemsJson: serializeFaqItems(defaultFaqItems()),
            },
          }),
    }
  },
})
