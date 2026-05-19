/**
 * NotesPanel
 *
 * A collapsible GM notes textarea that appears just below the traits row in
 * the statblock. Notes are per-encounter-creature-instance and are persisted
 * immediately on every keystroke via `onSetNotes`.
 *
 * IMPORTANT: callers must pass a `key` tied to the creature instance UID so
 * React remounts this component (and resets all state) when the selected
 * creature changes.
 *
 * Undo: a snapshot of the notes value is taken on mount and when the panel is
 * re-opened after being closed. The ↩ Undo button appears whenever the current
 * text differs from that snapshot, and reverts both local state and the
 * persisted value.
 */

import { useState, useEffect, useRef } from 'react';
import styles from './StatblockDrawer.module.css';

interface NotesPanelProps {
  /** Persisted notes value for the current encounter creature instance. */
  activeNotes: string;
  /** Called on every change; consumer is responsible for persistence. */
  onSetNotes: (notes: string) => void;
  /** Whether the panel is currently visible. */
  open: boolean;
}

/** Clamp the textarea height to at most 6 visible rows, then scroll for the rest. */
function autoSize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  const lineH = parseInt(getComputedStyle(el).lineHeight, 10) || 20;
  const maxH = lineH * 6 + 16; // 6 rows + top/bottom padding
  el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
}

export function NotesPanel({ activeNotes, onSetNotes, open }: NotesPanelProps) {
  // Initialised from activeNotes on mount. Because callers pass a `key` tied to
  // the creature UID, this component is remounted fresh for every new creature —
  // so useState(activeNotes) is always correct and needs no sync effect.
  const [localNotes, setLocalNotes] = useState(activeNotes);
  const [undoNotes, setUndoNotes] = useState(activeNotes);

  // Refresh the undo baseline whenever the panel transitions from closed → open,
  // so the user can undo back to what was saved before this editing session.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setUndoNotes(localNotes);
    }
    prevOpenRef.current = open;
  }, [open, localNotes]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalNotes(val);
    onSetNotes(val);
    autoSize(e.target);
  };

  const handleUndo = () => {
    setLocalNotes(undoNotes);
    onSetNotes(undoNotes);
  };

  return (
    <div className={styles.notesPanel}>
      <textarea
        className={styles.notesTextarea}
        value={localNotes}
        placeholder="GM notes…"
        rows={1}
        onChange={handleChange}
        onFocus={e => autoSize(e.target)}
        ref={el => { if (el) autoSize(el); }}
      />
      {localNotes !== undoNotes && (
        <button
          className={styles.notesUndoBtn}
          title="Undo changes to notes"
          onClick={handleUndo}
        >
          ↩ Undo
        </button>
      )}
    </div>
  );
}
