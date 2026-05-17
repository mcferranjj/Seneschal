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

/**
 * Ensures the selection is inside `editor` before inserting.
 *
 * - If `saved` is non-null and lies inside `editor`, restores it.
 * - Otherwise collapses the selection to the very end of `editor`'s content.
 *
 * Call this at the start of any insert operation so text never lands in a
 * different input that happened to hold focus last.
 */
export function ensureEditorFocus(editor: HTMLElement, saved: Range | null): void {
  editor.focus();

  // If we have a saved range and it's inside this editor, use it.
  if (saved && editor.contains(saved.commonAncestorContainer)) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(saved);
    }
    return;
  }

  // Otherwise place the cursor at the end of the editor content.
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false); // collapse to end
  sel.removeAllRanges();
  sel.addRange(range);
}
