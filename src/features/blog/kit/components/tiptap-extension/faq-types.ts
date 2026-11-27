import { FAQ_DEFAULT_HEADING, type RichCell } from "../../lib/storyBlocks"

export type FaqItemAttr = {
  id: string
  text: string
  marks: RichCell["marks"]
  answer: { text: string; marks: RichCell["marks"] }
}

export function newFaqItemId(): string {
  return `faq-${Math.random().toString(36).slice(2, 10)}`
}

export function defaultFaqItems(): FaqItemAttr[] {
  return [
    {
      id: newFaqItemId(),
      text: "What is SuperShyft and how does it work?",
      marks: [],
      answer: {
        text: "SuperShyft is a preventive healthcare platform that combines biomarker intelligence, Bio AI, and personalized wellness strategies.",
        marks: [],
      },
    },
  ]
}

export { FAQ_DEFAULT_HEADING }

export function parseFaqItems(value: unknown): FaqItemAttr[] {
  if (Array.isArray(value)) return value as FaqItemAttr[]
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as FaqItemAttr[]) : defaultFaqItems()
    } catch {
      return defaultFaqItems()
    }
  }
  return defaultFaqItems()
}

export function serializeFaqItems(items: FaqItemAttr[] | unknown): string {
  return JSON.stringify(Array.isArray(items) ? items : defaultFaqItems())
}
