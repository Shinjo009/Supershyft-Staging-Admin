"use client"

import { useCallback, useMemo } from "react"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { FAQ_DEFAULT_HEADING } from "../../../lib/storyBlocks"
import {
  newFaqItemId,
  parseFaqItems,
  serializeFaqItems,
  type FaqItemAttr,
} from "../../tiptap-extension/faq-types"

function SortableFaqItem({
  item,
  index,
  onChange,
  onDelete,
}: {
  item: FaqItemAttr
  index: number
  onChange: (id: string, patch: Partial<FaqItemAttr>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id || `faq-row-${index}`,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`story-faq-item-row${isDragging ? " is-dragging" : ""}`}
      data-testid={`blog-faq-editor-item-${index}`}
    >
      <button
        type="button"
        className="story-faq-drag"
        aria-label="Drag to reorder"
        data-testid={`blog-faq-drag-${index}`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="story-faq-fields">
        <input
          type="text"
          value={item.text}
          placeholder="Question"
          data-testid={`blog-faq-question-input-${index}`}
          onChange={(e) => onChange(item.id, { text: e.target.value, marks: [] })}
        />
        <textarea
          value={item.answer?.text || ""}
          placeholder="Answer"
          data-testid={`blog-faq-answer-input-${index}`}
          onChange={(e) =>
            onChange(item.id, {
              answer: { text: e.target.value, marks: [] },
            })
          }
        />
      </div>
      <div className="story-faq-item-actions">
        <button type="button" data-testid={`blog-faq-delete-${index}`} onClick={() => onDelete(item.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

export function FaqNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected } = props
  const heading = String(node.attrs.heading || FAQ_DEFAULT_HEADING)
  const items = useMemo(
    () => parseFaqItems(node.attrs.itemsJson ?? node.attrs.items),
    [node.attrs.itemsJson, node.attrs.items],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setItems = useCallback(
    (next: FaqItemAttr[]) => {
      updateAttributes({ itemsJson: serializeFaqItems(next) })
    },
    [updateAttributes],
  )

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex((item, index) => (item.id || `faq-row-${index}`) === active.id)
      const newIndex = items.findIndex((item, index) => (item.id || `faq-row-${index}`) === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      setItems(arrayMove(items, oldIndex, newIndex))
    },
    [items, setItems],
  )

  const onChangeItem = useCallback(
    (id: string, patch: Partial<FaqItemAttr>) => {
      setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    },
    [items, setItems],
  )

  const onDeleteItem = useCallback(
    (id: string) => {
      const next = items.filter((item) => item.id !== id)
      setItems(
        next.length
          ? next
          : [
              {
                id: newFaqItemId(),
                text: "",
                marks: [],
                answer: { text: "", marks: [] },
              },
            ],
      )
    },
    [items, setItems],
  )

  const addQuestion = useCallback(() => {
    setItems([
      ...items,
      {
        id: newFaqItemId(),
        text: "",
        marks: [],
        answer: { text: "", marks: [] },
      },
    ])
  }, [items, setItems])

  return (
    <NodeViewWrapper
      className={`story-faq${selected ? " is-selected" : ""}`}
      data-type="faq"
      data-testid="blog-faq-editor"
      contentEditable={false}
    >
      <div className="story-faq-toolbar" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button type="button" data-testid="blog-faq-remove-block" onClick={() => deleteNode()}>
          Remove FAQ
        </button>
      </div>
      <input
        className="story-faq-editor-heading"
        type="text"
        value={heading}
        data-testid="blog-faq-heading-input"
        onChange={(e) => updateAttributes({ heading: e.target.value })}
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={items.map((item, index) => item.id || `faq-row-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item, index) => (
            <SortableFaqItem
              key={item.id || `faq-row-${index}`}
              item={item}
              index={index}
              onChange={onChangeItem}
              onDelete={onDeleteItem}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" className="story-faq-add" data-testid="blog-faq-add-question" onClick={addQuestion}>
        Add Question
      </button>
    </NodeViewWrapper>
  )
}
