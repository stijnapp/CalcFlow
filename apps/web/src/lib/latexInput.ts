import { caretOffset, type LatexKey } from './latexKeys';

/**
 * The key row is not part of the field it types into, so it finds the field by
 * asking the document: whatever has focus, or else the one marked active.
 */
export function activeLatexInput(): HTMLInputElement | null {
  const focused = document.activeElement;
  if (focused instanceof HTMLInputElement && focused.dataset.latexInput) return focused;
  return document.querySelector<HTMLInputElement>('input[data-latex-input="active"]');
}

function restore(input: HTMLInputElement, caret: number) {
  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.setSelectionRange(caret, caret);
  });
}

/** Returns the new field value, or null when there is nowhere to type. */
export function insertKey(key: LatexKey): string | null {
  const input = activeLatexInput();
  if (!input) return null;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const next = input.value.slice(0, start) + key.insert + input.value.slice(end);
  restore(input, start + caretOffset(key));
  return next;
}

export function moveCaret(step: -1 | 1): void {
  const input = activeLatexInput();
  if (!input) return;
  const at = input.selectionStart ?? input.value.length;
  const next = Math.min(input.value.length, Math.max(0, at + step));
  input.focus({ preventScroll: true });
  input.setSelectionRange(next, next);
}
