import { useState } from "react";
import {
  FAQ_DEFAULT_HEADING,
  blockText,
  type RichCell,
  type StoryBlock,
} from "./kit/lib/storyBlocks";
import { RichText } from "./RichText";
import "./faqAccordion.css";

function faqItems(block: StoryBlock): RichCell[] {
  return (block.items || []).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const question = (item.text || "").trim();
    const answer = (item.answer?.text || "").trim();
    return Boolean(question && answer);
  });
}

export function FaqAccordion({
  block,
  defaultOpen = true,
}: {
  block: StoryBlock;
  /** Preview/editor: open all by default. Public site also allows multi-open. */
  defaultOpen?: boolean;
}) {
  const heading = blockText(block).trim() || FAQ_DEFAULT_HEADING;
  const items = faqItems(block);
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(items.map((_, index) => [index, defaultOpen])),
  );

  if (!items.length) return null;

  return (
    <section className="blog-faq" data-testid="blog-faq-block">
      <h2 className="blog-faq-heading">{heading}</h2>
      <div className="blog-faq-list">
        {items.map((item, index) => {
          const isOpen = Boolean(open[index]);
          return (
            <div key={index} className={`blog-faq-item${isOpen ? " is-open" : ""}`} data-testid={`blog-faq-item-${index}`}>
              <button
                type="button"
                className="blog-faq-question"
                aria-expanded={isOpen}
                data-testid={`blog-faq-question-${index}`}
                onClick={() => setOpen((prev) => ({ ...prev, [index]: !prev[index] }))}
              >
                <span className="blog-faq-chevron" aria-hidden="true" />
                <span className="blog-faq-question-text">
                  <RichText text={item.text || ""} marks={item.marks} />
                </span>
              </button>
              <div className="blog-faq-answer-wrap" data-open={isOpen ? "true" : "false"}>
                <div className="blog-faq-answer" data-testid={`blog-faq-answer-${index}`}>
                  <RichText text={item.answer?.text || ""} marks={item.answer?.marks} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
