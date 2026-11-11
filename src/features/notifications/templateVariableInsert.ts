/** Insert text at the current selection in a text control. */

export function insertAtSelection(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): string {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  return el.value.slice(0, start) + text + el.value.slice(end);
}

export function selectionAfterInsert(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): [number, number] {
  const start = el.selectionStart ?? el.value.length;
  const pos = start + text.length;
  return [pos, pos];
}

export function templateToken(field: string): string {
  return `{{${field}}}`;
}
