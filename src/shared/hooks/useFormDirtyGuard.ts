import { useEffect } from "react";

const LEAVE_MESSAGE = "You have unsaved changes. Leave this page anyway?";

/** Warn on browser tab close / refresh when the form has unsaved edits. */
export function useFormDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = LEAVE_MESSAGE;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

export function confirmDiscardUnsavedChanges(): boolean {
  return window.confirm(LEAVE_MESSAGE);
}

export function scrollElementIntoView(element: HTMLElement | null) {
  element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
