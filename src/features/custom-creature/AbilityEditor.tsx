/**
 * AbilityEditor — reusable WYSIWYG ability description editor.
 *
 * • contenteditable div: user sees formatted text directly, no raw HTML
 * • Toolbar: action icons, Bold/Italic/Underline/Heading, DC/Damage inserts
 * • DC insert: checks for "DC" at cursor; inserts number only if already present, else "DC <n>"
 * • Damage insert: opens a grouped damage-type picker; inserts "<expr> <type> damage"
 * • Uses execCommand for inline formatting so no tags are ever visible to the user
 * • Stores content as HTML string via onChange
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { processFoundryHtml } from '../../utils/foundryMacros';
import { insertTextAtCursor, restoreRange, textBeforeCursor, saveCurrentRange } from '../../utils/contentEditable';
import { usePopupPosition } from '../../hooks/usePopupPosition';
import { useOutsideClick } from '../../hooks/useOutsideClick';
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

// ── Damage type groups ────────────────────────────────────────────────────────

interface DmgTypeGroup {
  types: string[];
}

// Ordered groups for the main damage type picker.
// Persistent is a special entry rendered last with its own submenu.
const DAMAGE_TYPE_GROUPS: DmgTypeGroup[] = [
  { types: ['bludgeoning', 'piercing', 'slashing'] },
  { types: ['acid', 'cold', 'electricity', 'fire', 'sonic'] },
  { types: ['force', 'spirit', 'vitality', 'void'] },
  { types: ['mental', 'poison', 'precision'] },
  { types: ['untyped'] },
];

// Types available under "persistent <type>":
// excludes bludgeoning/piercing/slashing/precision; adds bleed first.
const PERSISTENT_DAMAGE_TYPE_GROUPS: DmgTypeGroup[] = [
  { types: ['bleed'] },
  { types: ['acid', 'cold', 'electricity', 'fire', 'sonic'] },
  { types: ['force', 'spirit', 'vitality', 'void'] },
  { types: ['mental', 'poison'] },
  { types: ['untyped'] },
];

// ── Component interface ───────────────────────────────────────────────────────

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

// ── Damage type picker popup ──────────────────────────────────────────────────

interface DmgPickerProps {
  expr: string;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onPick: (text: string) => void;
  onClose: () => void;
}

function DamageTypePicker({ expr, anchorRef, onPick, onClose }: DmgPickerProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [showPersistent, setShowPersistent] = useState(false);
  const persistentBtnRef = useRef<HTMLButtonElement>(null);

  // Viewport-safe position: prefer below anchor, flip above if needed, clamp left edge
  const pos = usePopupPosition(anchorRef, true, { popupWidth: 180, popupMaxHeight: 400 });
  // Close when clicking outside both the popup and its anchor button
  useOutsideClick(popupRef, onClose, anchorRef);

  function pick(type: string) {
    onPick(`${expr} ${type} damage`);
    onClose();
  }

  function pickPersistent(type: string) {
    onPick(`${expr} persistent ${type} damage`);
    onClose();
  }

  if (!pos) return null;

  return (
    <div
      ref={popupRef}
      className={styles.dmgPicker}
      style={{
        position: 'fixed',
        top:    pos.top    !== undefined ? pos.top    : undefined,
        bottom: pos.bottom !== undefined ? pos.bottom : undefined,
        left:   pos.left,
        maxHeight: pos.maxH,
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {!showPersistent && DAMAGE_TYPE_GROUPS.map((group, gi) => (
        <div key={gi} className={styles.dmgPickerGroup}>
          {group.types.map(type => (
            <button
              key={type}
              type="button"
              className={styles.dmgPickerBtn}
              onMouseDown={e => { e.preventDefault(); pick(type); }}
            >{type}</button>
          ))}
        </div>
      ))}

      {/* Persistent trigger — always visible */}
      <div className={styles.dmgPickerGroup}>
        <button
          ref={persistentBtnRef}
          type="button"
          className={`${styles.dmgPickerBtn} ${styles.dmgPickerPersistent} ${showPersistent ? styles.dmgPickerPersistentActive : ''}`}
          onMouseDown={e => { e.preventDefault(); setShowPersistent(v => !v); }}
        >{showPersistent ? '◀ persistent' : 'persistent ▶'}</button>
      </div>

      {showPersistent && (
        <div className={styles.dmgPickerSub} onMouseDown={e => e.preventDefault()}>
          {PERSISTENT_DAMAGE_TYPE_GROUPS.map((group, gi) => (
            <div key={gi} className={styles.dmgPickerGroup}>
              {group.types.map(type => (
                <button
                  key={type}
                  type="button"
                  className={styles.dmgPickerBtn}
                  onMouseDown={e => { e.preventDefault(); pickPersistent(type); }}
                >{type}</button>
              ))}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const isComposingRef = useRef(false);
  const lastHtmlRef = useRef(value);

  // Which damage button's picker is open (by dmg label), or null
  const [openDmgPicker, setOpenDmgPicker] = useState<string | null>(null);
  // Store the pending expr and ref for the open picker
  const openDmgExpr = useRef<string>('');
  const dmgBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  // Saved cursor position at the moment the damage picker is opened
  const savedRangeRef = useRef<Range | null>(null);

  // Sync external value → DOM only on mount
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const displayHtml = processFoundryHtml(value || '');
    if (el.innerHTML !== displayHtml && !isComposingRef.current) {
      el.innerHTML = displayHtml;
      lastHtmlRef.current = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isComposingRef.current = true;
    const html = el.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
    requestAnimationFrame(() => { isComposingRef.current = false; });
  }, [onChange]);

  // Re-sync if value changes externally
  useEffect(() => {
    const el = editorRef.current;
    if (!el || isComposingRef.current) return;
    if (value !== lastHtmlRef.current) {
      const displayHtml = processFoundryHtml(value || '');
      el.innerHTML = displayHtml;
      lastHtmlRef.current = value;
    }
  }, [value]);

  function execFmt(command: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
  }

  function insertDC(dcValue: number) {
    editorRef.current?.focus();
    const before = textBeforeCursor();
    const hasDC = /\bDC\s*$/i.test(before);
    const text = hasDC ? String(dcValue) : `DC ${dcValue}`;
    insertTextAtCursor(text);
    handleInput();
  }

  function insertDamageText(text: string) {
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      restoreRange(savedRangeRef.current);
      savedRangeRef.current = null;
    }
    insertTextAtCursor(text);
    handleInput();
  }

  function insertIcon(icon: string) {
    editorRef.current?.focus();
    insertTextAtCursor(` ${icon} `);
    handleInput();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }

  function openPickerFor(label: string, expr: string) {
    // Snapshot the current selection before the button click shifts focus
    savedRangeRef.current = saveCurrentRange();
    openDmgExpr.current = expr;
    setOpenDmgPicker(prev => prev === label ? null : label);
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

        {/* Damage inserts — each button opens a damage-type picker */}
        {toolbarExtras?.damages && toolbarExtras.damages.length > 0 && (
          <>
            <span className={styles.toolbarSep} />
            {toolbarExtras.damages.map(dmg => {
              const isOpen = openDmgPicker === dmg.label;
              return (
                <span key={dmg.label} className={styles.dmgPickerAnchor}>
                  <button
                    ref={el => {
                      if (el) dmgBtnRefs.current.set(dmg.label, el);
                      else dmgBtnRefs.current.delete(dmg.label);
                    }}
                    type="button"
                    className={`${styles.toolbarBtn} ${isOpen ? styles.toolbarBtnActive : ''}`}
                    title={dmg.title ?? `Insert ${dmg.value} damage`}
                    onMouseDown={e => { e.preventDefault(); openPickerFor(dmg.label, dmg.value); }}
                  >{dmg.label} ▾</button>
                  {isOpen && (
                    <DamageTypePicker
                      expr={openDmgExpr.current}
                      anchorRef={{ current: dmgBtnRefs.current.get(dmg.label) ?? null }}
                      onPick={text => insertDamageText(text)}
                      onClose={() => setOpenDmgPicker(null)}
                    />
                  )}
                </span>
              );
            })}
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
