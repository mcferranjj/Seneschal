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
import { insertTextAtCursor, textBeforeCursor, saveCurrentRange, ensureEditorFocus } from '../../utils/contentEditable';
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
  /** Spell attack bonus shortcuts — clicking inserts the number (with leading +) */
  attackBonuses?: { label: string; value: number; title?: string }[];
  /**
   * Flat damage shortcuts (hazard mode) — each opens a damage-type picker.
   * Used when a single list of labelled expressions is sufficient.
   */
  damages?: { label: string; value: string; title?: string }[];
  /**
   * Grouped damage shortcuts (monster mode) — renders a single button per group
   * that opens a sub-menu listing the tiers, each of which then opens the
   * damage-type picker.
   */
  damageGroups?: {
    /** Button label shown in the toolbar (e.g. "Single target") */
    label: string;
    /** Tiers shown in the sub-menu dropdown */
    tiers: { label: string; value: string; title?: string }[];
  }[];
}

interface AbilityEditorProps {
  /** Current HTML content */
  value: string;
  onChange: (html: string) => void;
  /** Currently selected action type */
  actionType?: AbilityActionType;
  onActionTypeChange?: (t: AbilityActionType) => void;
  /**
   * Whether to show the limited-use checkbox + frequency input.
   * When true, the checkbox is rendered; the frequency input only appears
   * when the checkbox is checked.
   */
  showLimitedUse?: boolean;
  isLimitedUse?: boolean;
  onIsLimitedUseChange?: (v: boolean) => void;
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
  /**
   * When false, only the action type row is shown.
   * Set to true once both a name and an action type have been provided.
   */
  ready?: boolean;
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

  // Viewport-safe position: prefer below anchor, flip above if needed, clamp left edge.
  // Pass popupRef so the hook can measure actual width after render and clamp right edge.
  const pos = usePopupPosition(anchorRef, true, { popupWidth: 0, popupMaxHeight: 400 }, popupRef);
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
              className={`${styles.dmgPickerBtn} ${styles.dmgTypeBtn}`}
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
                  className={`${styles.dmgPickerBtn} ${styles.dmgTypeBtn}`}
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

// ── Generic simple dropdown ───────────────────────────────────────────────────
// A small popup listing labelled items. Clicking an item calls onPick and closes.
// Used for Action Icons, DC, and Attack Mod dropdowns.

interface SimpleDropdownProps {
  items: { label: string; title?: string; onPick: () => void }[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function SimpleDropdown({ items, anchorRef, onClose }: SimpleDropdownProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePopupPosition(anchorRef, true, { popupWidth: 0, popupMaxHeight: 320 }, popupRef);
  useOutsideClick(popupRef, onClose, anchorRef);

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
      <div className={styles.dmgPickerGroup}>
        {items.map(item => (
          <button
            key={item.label}
            type="button"
            className={styles.dmgPickerBtn}
            title={item.title}
            onMouseDown={e => { e.preventDefault(); item.onPick(); onClose(); }}
          >{item.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Tier sub-menu popup (monster grouped damage) ─────────────────────────────
// Shows a small dropdown listing damage tiers (L / M / H / E).
// Clicking a tier triggers onPickTier; clicking outside closes.

interface TierSubMenuProps {
  tiers: { label: string; value: string; title?: string }[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onPickTier: (label: string, value: string) => void;
  onClose: () => void;
}

function TierSubMenu({ tiers, anchorRef, onPickTier, onClose }: TierSubMenuProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePopupPosition(anchorRef, true, { popupWidth: 0, popupMaxHeight: 300 }, popupRef);
  useOutsideClick(popupRef, onClose, anchorRef);

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
      <div className={styles.dmgPickerGroup}>
        {tiers.map(tier => (
          <button
            key={tier.label}
            type="button"
            className={styles.dmgPickerBtn}
            title={tier.title}
            onMouseDown={e => { e.preventDefault(); onPickTier(tier.label, tier.value); }}
          >{tier.label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AbilityEditor({
  value,
  onChange,
  actionType,
  onActionTypeChange,
  showLimitedUse = false,
  isLimitedUse = false,
  onIsLimitedUseChange,
  frequency = '',
  onFrequencyChange,
  showTrigger = false,
  trigger = '',
  onTriggerChange,
  requirements = '',
  onRequirementsChange,
  toolbarExtras,
  ready = true,
}: AbilityEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const lastHtmlRef = useRef(value);

  // Generic dropdown open key — shared across all toolbar dropdowns.
  // Keys:
  //   'icons'              → Action Icons dropdown
  //   'dc'                 → DC dropdown
  //   'atk'                → Attack Mod dropdown
  //   dmg.label            → flat damage type picker (hazard)
  //   `grp:${grp.label}`   → grouped damage tier sub-menu (monster)
  //   `tier:${grp}:${tier}`→ damage type picker after tier selected (monster)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Store the pending expr and ref for the open damage-type picker
  const openDmgExpr = useRef<string>('');
  const dropdownBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  // Saved cursor position at the moment any insert popup is opened
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
    if (!editorRef.current) return;
    ensureEditorFocus(editorRef.current, savedRangeRef.current);
    savedRangeRef.current = null;
    const before = textBeforeCursor();
    const hasDC = /\bDC\s*$/i.test(before);
    const text = hasDC ? String(dcValue) : `DC ${dcValue}`;
    insertTextAtCursor(text);
    handleInput();
  }

  function insertAttackBonus(bonus: number) {
    if (!editorRef.current) return;
    ensureEditorFocus(editorRef.current, savedRangeRef.current);
    savedRangeRef.current = null;
    const text = bonus >= 0 ? `+${bonus}` : String(bonus);
    insertTextAtCursor(text);
    handleInput();
  }

  function insertDamageText(text: string) {
    if (!editorRef.current) return;
    ensureEditorFocus(editorRef.current, savedRangeRef.current);
    savedRangeRef.current = null;
    insertTextAtCursor(text);
    handleInput();
  }

  function insertIcon(icon: string) {
    if (!editorRef.current) return;
    ensureEditorFocus(editorRef.current, savedRangeRef.current);
    savedRangeRef.current = null;
    insertTextAtCursor(` ${icon} `);
    handleInput();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }

  function openPickerFor(key: string, expr: string) {
    savedRangeRef.current = saveCurrentRange();
    openDmgExpr.current = expr;
    setOpenDropdown(prev => prev === key ? null : key);
  }

  function toggleDropdown(key: string) {
    savedRangeRef.current = saveCurrentRange();
    setOpenDropdown(prev => prev === key ? null : key);
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

      {ready && <>

      {/* Limited use checkbox + frequency input (monster mode) */}
      {showLimitedUse && onIsLimitedUseChange && (
        <label className={styles.limitedUseRow}>
          <input
            type="checkbox"
            checked={isLimitedUse}
            onChange={e => onIsLimitedUseChange(e.target.checked)}
          />
          Limited use?
        </label>
      )}

      {/* Frequency input — shown when limited use is checked (monster) or always when not using the checkbox (hazard) */}
      {!showLimitedUse && onFrequencyChange && actionType !== 'passive' && (
        <input
          className={styles.metaInput}
          value={frequency}
          onChange={e => onFrequencyChange(e.target.value)}
          placeholder="Frequency (e.g. Once per day)"
        />
      )}
      {showLimitedUse && isLimitedUse && onFrequencyChange && (
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

      {/* Toolbar */}
      <div className={styles.toolbar}>

        {/* ── Formatting group ── */}
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
          title="Heading"
          onMouseDown={e => { e.preventDefault(); execFmt('formatBlock', '<h3>'); }}>H</button>

        <span className={styles.toolbarSep} />

        {/* ── Action Icons dropdown ── */}
        <span className={styles.dmgPickerAnchor}>
          <button
            ref={el => { if (el) dropdownBtnRefs.current.set('icons', el); else dropdownBtnRefs.current.delete('icons'); }}
            type="button"
            className={`${styles.toolbarBtn} ${openDropdown === 'icons' ? styles.toolbarBtnActive : ''}`}
            title="Insert action icon"
            onMouseDown={e => { e.preventDefault(); toggleDropdown('icons'); }}
          >Icons ▾</button>
          {openDropdown === 'icons' && (
            <SimpleDropdown
              anchorRef={{ current: dropdownBtnRefs.current.get('icons') ?? null }}
              onClose={() => setOpenDropdown(null)}
              items={[
                { label: '◆  Single Action',   title: 'Insert Single Action icon',   onPick: () => insertIcon('◆')   },
                { label: '◆◆  Two Actions',    title: 'Insert Two Actions icon',     onPick: () => insertIcon('◆◆')  },
                { label: '◆◆◆  Three Actions', title: 'Insert Three Actions icon',   onPick: () => insertIcon('◆◆◆') },
                { label: '↺  Reaction',         title: 'Insert Reaction icon',        onPick: () => insertIcon('↺')   },
                { label: '◇  Free Action',      title: 'Insert Free Action icon',     onPick: () => insertIcon('◇')   },
              ]}
            />
          )}
        </span>

        {/* ── DC dropdown ── */}
        {toolbarExtras?.dcs && toolbarExtras.dcs.length > 0 && (
          <>
            <span className={styles.toolbarSep} />
            <span className={styles.dmgPickerAnchor}>
              <button
                ref={el => { if (el) dropdownBtnRefs.current.set('dc', el); else dropdownBtnRefs.current.delete('dc'); }}
                type="button"
                className={`${styles.toolbarBtn} ${openDropdown === 'dc' ? styles.toolbarBtnActive : ''}`}
                title="Insert DC value"
                onMouseDown={e => { e.preventDefault(); toggleDropdown('dc'); }}
              >DC ▾</button>
              {openDropdown === 'dc' && (
                <SimpleDropdown
                  anchorRef={{ current: dropdownBtnRefs.current.get('dc') ?? null }}
                  onClose={() => setOpenDropdown(null)}
                  items={toolbarExtras.dcs.map(dc => ({
                    label: dc.label,
                    title: dc.title ?? `Insert DC ${dc.value}`,
                    onPick: () => insertDC(dc.value),
                  }))}
                />
              )}
            </span>
          </>
        )}

        {/* ── Attack Mod dropdown ── */}
        {toolbarExtras?.attackBonuses && toolbarExtras.attackBonuses.length > 0 && (
          <>
            <span className={styles.toolbarSep} />
            <span className={styles.dmgPickerAnchor}>
              <button
                ref={el => { if (el) dropdownBtnRefs.current.set('atk', el); else dropdownBtnRefs.current.delete('atk'); }}
                type="button"
                className={`${styles.toolbarBtn} ${openDropdown === 'atk' ? styles.toolbarBtnActive : ''}`}
                title="Insert spell attack modifier"
                onMouseDown={e => { e.preventDefault(); toggleDropdown('atk'); }}
              >Atk ▾</button>
              {openDropdown === 'atk' && (
                <SimpleDropdown
                  anchorRef={{ current: dropdownBtnRefs.current.get('atk') ?? null }}
                  onClose={() => setOpenDropdown(null)}
                  items={toolbarExtras.attackBonuses.map(atk => ({
                    label: atk.label,
                    title: atk.title ?? `Insert spell attack ${atk.value >= 0 ? '+' : ''}${atk.value}`,
                    onPick: () => insertAttackBonus(atk.value),
                  }))}
                />
              )}
            </span>
          </>
        )}

        {/* ── Flat damage buttons (hazard mode) — L ▾ / M ▾ / H ▾, each opens damage-type picker ── */}
        {toolbarExtras?.damages && toolbarExtras.damages.length > 0 && (
          <>
            <span className={styles.toolbarSep} />
            {toolbarExtras.damages.map(dmg => {
              const isOpen = openDropdown === dmg.label;
              return (
                <span key={dmg.label} className={styles.dmgPickerAnchor}>
                  <button
                    ref={el => {
                      if (el) dropdownBtnRefs.current.set(dmg.label, el);
                      else dropdownBtnRefs.current.delete(dmg.label);
                    }}
                    type="button"
                    className={`${styles.toolbarBtn} ${isOpen ? styles.toolbarBtnActive : ''}`}
                    title={dmg.title ?? `Insert ${dmg.value} damage`}
                    onMouseDown={e => { e.preventDefault(); openPickerFor(dmg.label, dmg.value); }}
                  >{dmg.label} ▾</button>
                  {isOpen && (
                    <DamageTypePicker
                      expr={openDmgExpr.current}
                      anchorRef={{ current: dropdownBtnRefs.current.get(dmg.label) ?? null }}
                      onPick={text => insertDamageText(text)}
                      onClose={() => setOpenDropdown(null)}
                    />
                  )}
                </span>
              );
            })}
          </>
        )}

        {/* ── Grouped damage dropdowns (monster mode) — "Single-Target Damage ▾" / "Area Damage ▾" ── */}
        {toolbarExtras?.damageGroups && toolbarExtras.damageGroups.length > 0 && (
          <>
            <span className={styles.toolbarSep} />
            {toolbarExtras.damageGroups.map(grp => {
              const grpKey = `grp:${grp.label}`;
              const grpIsOpen = openDropdown === grpKey;
              return (
                <span key={grp.label} className={styles.dmgPickerAnchor}>
                  <button
                    ref={el => {
                      if (el) dropdownBtnRefs.current.set(grpKey, el);
                      else dropdownBtnRefs.current.delete(grpKey);
                    }}
                    type="button"
                    className={`${styles.toolbarBtn} ${grpIsOpen ? styles.toolbarBtnActive : ''}`}
                    title={grp.label}
                    onMouseDown={e => { e.preventDefault(); toggleDropdown(grpKey); }}
                  >{grp.label} ▾</button>

                  {/* Tier sub-menu — L / M / H / E labels only, no dice expressions */}
                  {grpIsOpen && (
                    <TierSubMenu
                      tiers={grp.tiers}
                      anchorRef={{ current: dropdownBtnRefs.current.get(grpKey) ?? null }}
                      onPickTier={(tierLabel, tierValue) => {
                        openDmgExpr.current = tierValue;
                        setOpenDropdown(`tier:${grp.label}:${tierLabel}`);
                      }}
                      onClose={() => setOpenDropdown(null)}
                    />
                  )}

                  {/* Damage type picker — opens once a tier is selected */}
                  {grp.tiers.map(tier => {
                    const tierKey = `tier:${grp.label}:${tier.label}`;
                    return openDropdown === tierKey ? (
                      <DamageTypePicker
                        key={tierKey}
                        expr={openDmgExpr.current}
                        anchorRef={{ current: dropdownBtnRefs.current.get(grpKey) ?? null }}
                        onPick={text => insertDamageText(text)}
                        onClose={() => setOpenDropdown(null)}
                      />
                    ) : null;
                  })}
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

      </>}
    </div>
  );
}
