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

const GROUP_ORDER = [
  "staff",
  "participant",
  "user",
  "engagement",
  "session",
  "booking",
  "payment",
  "consultation",
  "report",
  "gift",
  "support",
  "otp",
] as const;

const GROUP_LABELS: Record<string, string> = {
  staff: "Staff / recipient",
  participant: "Participant (onboarded user)",
  user: "User (legacy alias)",
  engagement: "Engagement",
  session: "Session",
  booking: "Booking",
  payment: "Payment",
  consultation: "Consultation",
  report: "Reports",
  gift: "Gift",
  support: "Support",
  otp: "OTP",
};

function groupVariableFields(fields: string[]) {
  const byPrefix = new Map<string, string[]>();
  for (const field of fields) {
    const prefix = field.includes(".") ? field.split(".")[0] : "other";
    const list = byPrefix.get(prefix) ?? [];
    list.push(field);
    byPrefix.set(prefix, list);
  }
  const sections: { prefix: string; label: string; fields: string[] }[] = [];
  const seen = new Set<string>();
  for (const prefix of GROUP_ORDER) {
    const list = byPrefix.get(prefix);
    if (!list?.length) continue;
    sections.push({ prefix, label: GROUP_LABELS[prefix] ?? prefix, fields: list });
    seen.add(prefix);
  }
  for (const [prefix, list] of byPrefix) {
    if (seen.has(prefix) || !list.length) continue;
    sections.push({ prefix, label: GROUP_LABELS[prefix] ?? prefix, fields: list });
  }
  return sections;
}

export function TemplateVariablePills({
  fields,
  legend = "Insert variable",
  className = "",
  hint = "Click a pill to insert at the cursor in the focused field, or drag onto a field.",
  onInsert,
}: TemplateVariablePillsProps & { onInsert: (field: string) => void }) {
  const sections = groupVariableFields(fields);
  const flat = sections.length === 1 && sections[0].fields.length === fields.length;

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      <p className="text-xs font-medium text-zinc-600">{legend}</p>
      <div
        className="max-h-52 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-2 space-y-2"
        role="list"
        aria-label="Template variables"
      >
        {sections.map((section) => (
          <div key={section.prefix} className="space-y-1">
            {!flat && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 px-0.5">
                {section.label}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {section.fields.map((f) => (
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
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500 leading-snug">{hint}</p>
    </div>
  );
}
