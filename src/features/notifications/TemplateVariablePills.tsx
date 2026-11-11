import { useCallback, useRef, useState, type DragEvent } from "react";

import { insertAtSelection, selectionAfterInsert, templateToken } from "./templateVariableInsert";

export type TemplateFieldBinding = {
  id: string;
  getValue: () => string;
  setValue: (value: string) => void;
};

type TemplateVariablePillsProps = {
  fields: string[];
  /** Extra fields only for header / links (merged visually with a separator if both lists used). */
  legend?: string;
  className?: string;
  /** Shown when user clicks a pill but no bound field is focused */
  hint?: string;
};

type UseTemplateVariableFieldsOptions = {
  bindings: TemplateFieldBinding[];
};

/** Registers WhatsApp / email template inputs for pill click + drag-drop insert. */
export function useTemplateVariableFields({ bindings }: UseTemplateVariableFieldsOptions) {
  const elementsRef = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const findBinding = useCallback(
    (id: string) => bindings.find((b) => b.id === id),
    [bindings]
  );

  const applyInsert = useCallback(
    (fieldId: string, variableField: string, el: HTMLInputElement | HTMLTextAreaElement) => {
      const binding = findBinding(fieldId);
      if (!binding) return;
      const token = templateToken(variableField);
      const next = insertAtSelection(el, token);
      binding.setValue(next);
      const [selStart, selEnd] = selectionAfterInsert(el, token);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(selStart, selEnd);
      });
    },
    [findBinding]
  );

  const insertVariable = useCallback(
    (variableField: string): boolean => {
      if (!activeFieldId) return false;
      const el = elementsRef.current[activeFieldId];
      if (!el || document.activeElement !== el) return false;
      applyInsert(activeFieldId, variableField, el);
      return true;
    },
    [activeFieldId, applyInsert]
  );

  const fieldInputProps = useCallback(
    (fieldId: string) => ({
      onFocus: () => {
        setActiveFieldId(fieldId);
      },
      onDragOver: (e: DragEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      },
      onDrop: (e: DragEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.preventDefault();
        const variableField = e.dataTransfer.getData("text/template-variable");
        if (!variableField) return;
        const el = e.currentTarget;
        setActiveFieldId(fieldId);
        applyInsert(fieldId, variableField, el);
      },
      ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => {
        elementsRef.current[fieldId] = node;
      },
    }),
    [applyInsert]
  );

  return { insertVariable, fieldInputProps, activeFieldId };
}

export function TemplateVariablePills({
  fields,
  legend = "Insert variable",
  className = "",
  hint = "Click a pill to insert at the cursor in the focused field, or drag onto a field.",
  onInsert,
}: TemplateVariablePillsProps & { onInsert: (field: string) => void }) {
  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      <p className="text-xs font-medium text-zinc-600">{legend}</p>
      <div
        className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-2"
        role="list"
        aria-label="Template variables"
      >
        {fields.map((f) => (
          <button
            key={f}
            type="button"
            draggable
            role="listitem"
            onDragStart={(e) => {
              e.dataTransfer.setData("text/template-variable", f);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(f)}
            className="text-xs px-2.5 py-1 rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-100 hover:border-zinc-400 active:scale-[0.98] cursor-grab active:cursor-grabbing"
            title={`Insert {{${f}}}`}
          >
            {f}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500 leading-snug">{hint}</p>
    </div>
  );
}
