/**
 * AbilityEditor — reusable WYSIWYG ability description editor.
 *
 * • contenteditable div: user sees formatted text directly, no raw HTML
 * • Toolbar: action icons, Bold/Italic/Underline/Heading, DC/Damage inserts
 * • DC insert: checks for "DC" at cursor; inserts number only if already present, else "DC <n>"
 * • Damage insert: inserts the plain dice expression (e.g. "2d8+5")
 * • Uses execCommand for inline formatting so no tags are ever visible to the user
 * • Stores content as HTML string via onChange
 */

import { useRef, useEffect, useCallback } from 'react';
import { processFoundryHtml } from '../../utils/foundryMacros';
import type { AbilityActionType } from '../../types/encounter';
import styles from './AbilityEditor.module.css';

// PF2e action icon characters
const ACTION_ICONS: { value: AbilityActionType; label: string; title: string }[] = [
  { value: 'single',   label: '◆',     title: 'Single Action'         },
  { value: 'two',      label: '◆◆',    title: 'Two Actions'           },
  { value: 'three',    label: '◆◆◆',   title: 'Three Actions'         },
  { value: 'reaction', label: '↺',     title: 'Reaction'              },
  { value: 'free',     label: '◇',     title: 'Free Action'           },
  { value: 'passive',  label: 'Passive', title: 'Passive'             },
];

export interface AbilityEditorToolbarExtras {
  /** Plain text DC values to insert (e.g. { label: 'EDC', value: 22 }) */
  dcs?: { label: string; value: number; title?: string }[];
  /** Plain dice expressions to insert (e.g. { label: 'SDmg', value: '2d8+5' }) */
  damages?: { label: string; value: string; title?: string }[];
}

interface AbilityEditorProps {
  /** Current HTML content */
  value: string;
  onChange: (html: string) => void;
  /** Currently selected action type */
  actionType?: AbilityActionType;
  onActionTypeChange?: (t: AbilityActionType) => void;
  /** Show frequency field (hidden for passive) */
  showFrequency?: boolean;
  frequency?: string;
  onFrequencyChange?: (v: string) => void;
  /** Show trigger field (for reaction/free) */
  showTrigger?: boolean;
  trigger?: string;
  onTriggerChange?: (v: string) => void;
  /** Requirements */
  requirements?: string;
  onRequirementsChange?: (v: string) => void;
  /** Extra DC/Damage toolbar buttons */
  toolbarExtras?: AbilityEditorToolbarExtras;
}

/** Insert a text node at the current selection, or at end if no selection. */
function insertTextAtCursor(text: string) {
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

/** Return the text immediately before the cursor in the current line/paragraph. */
function textBeforeCursor(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  // expand to start of container
  const node = range.startContainer;
  const offset = range.startOffset;
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').slice(0, offset);
  }
  return '';
}

export function AbilityEditor({
  value,
  onChange,
  actionType,
  onActionTypeChange,
  showFrequency = true,
  frequency = '',
  onFrequencyChange,
  showTrigger = false,
  trigger = '',
  onTriggerChange,
  requirements = '',
  onRequirementsChange,
  toolbarExtras,
}: AbilityEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // Track whether we're in the middle of a user-initiated change to avoid cursor reset
  const isComposingRef = useRef(false);
  const lastHtmlRef = useRef(value);

  // Sync external value → DOM only when it differs from what the editor already shows
  // (i.e. on initial mount or external programmatic change, not on user typing)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Convert stored plain/Foundry HTML to display HTML on initial load
    const displayHtml = processFoundryHtml(value || '');
    if (el.innerHTML !== displayHtml && !isComposingRef.current) {
      el.innerHTML = displayHtml;
      lastHtmlRef.current = value;
    }
  // Only run on mount and when value changes externally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the editor content changes, serialize back to the stored format
  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isComposingRef.current = true;
    // We store the innerHTML as-is (it will be plain HTML from execCommand)
    const html = el.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
    // Allow next external sync
    requestAnimationFrame(() => { isComposingRef.current = false; });
  }, [onChange]);

  // Re-sync if value changes externally (e.g. load from DB)
  useEffect(() => {
    const el = editorRef.current;
    if (!el || isComposingRef.current) return;
    if (value !== lastHtmlRef.current) {
      const displayHtml = processFoundryHtml(value || '');
      el.innerHTML = displayHtml;
      lastHtmlRef.current = value;
    }
  }, [value]);

  function execFmt(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function insertDC(dcValue: number) {
    editorRef.current?.focus();
    const before = textBeforeCursor();
    // If the last non-whitespace chars are "DC" or "dc", just insert the number
    const hasDC = /\bDC\s*$/i.test(before);
    const text = hasDC ? String(dcValue) : `DC ${dcValue}`;
    insertTextAtCursor(text);
    handleInput();
  }

  function insertDamage(expr: string) {
    editorRef.current?.focus();
    insertTextAtCursor(expr);
    handleInput();
  }

  function insertIcon(icon: string) {
    editorRef.current?.focus();
    insertTextAtCursor(` ${icon} `);
    handleInput();
  }

  // Prevent Enter from creating <div> instead of <br>
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }

  return (
    <div className={styles.abilityEditor}>
      {/* Action type buttons */}
      {onActionTypeChange && (
        <div className={styles.actionRow}>
          {ACTION_ICONS.map(opt => (
            <button
              key={opt.value}
              title={opt.title}
              type="button"
              className={`${styles.actionBtn} ${actionType === opt.value ? styles.actionBtnActive : ''}`}
              onMouseDown={e => { e.preventDefault(); onActionTypeChange(opt.value); }}
            >{opt.label}</button>
          ))}
        </div>
      )}

      {/* Frequency — hidden for passive */}
      {showFrequency && onFrequencyChange && (
        <input
          className={styles.metaInput}
          value={frequency}
          onChange={e => onFrequencyChange(e.target.value)}
          placeholder="Frequency (e.g. Once per day)"
        />
      )}

      {/* Trigger — for reaction/free */}
      {showTrigger && onTriggerChange && (
        <input
          className={styles.metaInput}
          value={trigger}
          onChange={e => onTriggerChange(e.target.value)}
          placeholder="Trigger (e.g. A creature enters your reach)"
        />
      )}

      {/* Requirements */}
      {onRequirementsChange && (
        <input
          className={styles.metaInput}
          value={requirements}
          onChange={e => onRequirementsChange(e.target.value)}
          placeholder="Requirements (e.g. You are holding a weapon)"
        />
      )}

      {/* Formatting toolbar */}
      <div className={styles.toolbar}>
        {/* Inline icon inserts */}
        {(['◆', '◆◆', '◆◆◆', '↺', '◇'] as const).map(icon => (
          <button
            key={icon}
            type="button"
            className={styles.toolbarBtn}
            title={`Insert ${icon}`}
            onMouseDown={e => { e.preventDefault(); insertIcon(icon); }}
          >{icon}</button>
        ))}

        <span className={styles.toolbarSep} />

        {/* Text formatting */}
        <button type="button" className={`${styles.toolbarBtn} ${styles.bold}`}
          title="Bold (Ctrl+B)"
          onMouseDown={e => { e.preventDefault(); execFmt('bold'); }}>B</button>
        <button type="button" className={`${styles.toolbarBtn} ${styles.italic}`}
          title="Italic (Ctrl+I)"
          onMouseDown={e => { e.preventDefault(); execFmt('italic'); }}>I</button>
        <button type="button" className={`${styles.toolbarBtn} ${styles.underline}`}
          title="Underline (Ctrl+U)"
          onMouseDown={e => { e.preventDefault(); execFmt('underline'); }}>U</button>
        <button type="button" className={styles.toolbarBtn}
          title="Heading (wraps selection in h3)"
          onMouseDown={e => { e.preventDefault(); execFmt('formatBlock', '<h3>'); }}>H</button>

        {/* DC inserts */}
        {toolbarExtras?.dcs && toolbarExtras.dcs.length > 0 && (
          <>
            <span className={styles.toolbarSep} />
            {toolbarExtras.dcs.map(dc => (
              <button
                key={dc.label}
                type="button"
                className={styles.toolbarBtn}
                title={dc.title ?? `Insert DC ${dc.value}`}
                onMouseDown={e => { e.preventDefault(); insertDC(dc.value); }}
              >{dc.label}</button>
            ))}
          </>
        )}

        {/* Damage inserts */}
        {toolbarExtras?.damages && toolbarExtras.damages.length > 0 && (
          <>
            {!toolbarExtras?.dcs?.length && <span className={styles.toolbarSep} />}
            {toolbarExtras.damages.map(dmg => (
              <button
                key={dmg.label}
                type="button"
                className={styles.toolbarBtn}
                title={dmg.title ?? `Insert ${dmg.value}`}
                onMouseDown={e => { e.preventDefault(); insertDamage(dmg.value); }}
              >{dmg.label}</button>
            ))}
          </>
        )}
      </div>

      {/* WYSIWYG editor surface */}
      <div
        ref={editorRef}
        className={styles.editorSurface}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder="Description…"
        spellCheck
      />
    </div>
  );
}
