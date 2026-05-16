/**
 * ContentEditable DOM Utilities
 *
 * Pure DOM helpers for working with contenteditable elements and the
 * Selection/Range API. No React, no app-specific logic.
 */

/** Insert a text node at the current selection position. */
export function insertTextAtCursor(text: string): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Restore a previously saved Range into the current selection. */
export function restoreRange(saved: Range): void {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(saved);
}

/**
 * Returns the plain text immediately before the cursor within its text node.
 * Useful for context-sensitive inserts (e.g. detecting "DC " before a number).
 */
export function textBeforeCursor(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const node = range.startContainer;
  const offset = range.startOffset;
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').slice(0, offset);
  }
  return '';
}

/**
 * Snapshots the current selection range, or returns null if there is none.
 * Clone is necessary — the live Range object mutates as the DOM changes.
 */
export function saveCurrentRange(): Range | null {
  const sel = window.getSelection();
  return sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
}
