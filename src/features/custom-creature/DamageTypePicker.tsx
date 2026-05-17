/**
 * DamageTypePicker
 *
 * Shared popup for selecting a PF2e damage type. Used in both the AbilityEditor
 * toolbar (where it appends a full damage string to a WYSIWYG editor) and the
 * AttackCard (where it sets the type field of a structured damage component).
 *
 * The component itself is presentation-only: it calls onPick(type) with the raw
 * type string (e.g. "slashing", "persistent fire"). The caller decides what to
 * do with it.
 */

import { useRef, useState } from 'react';
import { usePopupPosition } from '../../hooks/usePopupPosition';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import styles from './DamageTypePicker.module.css';

// ── Damage type group data ────────────────────────────────────────────────────

interface DmgTypeGroup {
  types: string[];
}

/** Ordered groups for the main picker. Persistent has its own submenu. */
export const DAMAGE_TYPE_GROUPS: DmgTypeGroup[] = [
  { types: ['bludgeoning', 'piercing', 'slashing'] },
  { types: ['acid', 'cold', 'electricity', 'fire', 'sonic'] },
  { types: ['force', 'spirit', 'vitality', 'void'] },
  { types: ['mental', 'poison', 'precision'] },
  { types: ['untyped'] },
];

/**
 * Types available under "persistent <type>":
 * excludes bludgeoning/piercing/slashing/precision; adds bleed first.
 */
export const PERSISTENT_DAMAGE_TYPE_GROUPS: DmgTypeGroup[] = [
  { types: ['bleed'] },
  { types: ['acid', 'cold', 'electricity', 'fire', 'sonic'] },
  { types: ['force', 'spirit', 'vitality', 'void'] },
  { types: ['mental', 'poison'] },
  { types: ['untyped'] },
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface DamageTypePickerProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  /** Called with the raw type string, e.g. "slashing" or "persistent fire". */
  onPick: (type: string) => void;
  onClose: () => void;
}

export function DamageTypePicker({ anchorRef, onPick, onClose }: DamageTypePickerProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [showPersistent, setShowPersistent] = useState(false);

  const pos = usePopupPosition(anchorRef, true, { popupWidth: 0, popupMaxHeight: 400 }, popupRef);
  useOutsideClick(popupRef, onClose, anchorRef);

  if (!pos) return null;

  function pick(type: string) {
    onPick(type);
    onClose();
  }

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
                  onMouseDown={e => { e.preventDefault(); pick(`persistent ${type}`); }}
                >{type}</button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
