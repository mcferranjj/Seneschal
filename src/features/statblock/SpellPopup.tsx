import { useRef } from 'react';
import {
  applyEliteWeakToHtml,
  extractDamageGroups,
  processFoundryHtml,
} from '../../utils/foundryMacros';
import type { DamageGroup } from '../../utils/foundryMacros';
import { eliteWeakDmgMod, eliteWeakDcMod } from '../../utils/levelScaling';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { usePopupPosition } from '../../hooks/usePopupPosition';
import styles from './StatblockDrawer.module.css';

interface SpellPopupProps {
  name: string;
  description: string;
  traits?: string[];
  ewMod: number;
  ewStyle?: React.CSSProperties;
  onRollAll?: (groups: DamageGroup[], name: string, traits: string[], e: React.MouseEvent) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function SpellPopup({ name, description, traits, ewMod, ewStyle, onRollAll, anchorRef, onClose }: SpellPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const traitStr = traits && traits.length > 0 ? `(${traits.join(', ')})` : '';
  const limited = /1\/day|2\/day|3\/day|focus/i.test(description);
  const dmgMod = eliteWeakDmgMod(ewMod, limited);
  const dcMod  = eliteWeakDcMod(ewMod);
  const adjustedDesc = (dmgMod !== 0 || dcMod !== 0) ? applyEliteWeakToHtml(description, dmgMod, dcMod) : description;
  const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
  const hasDamage = damageGroups.length > 0 && onRollAll != null;
  const html = processFoundryHtml(adjustedDesc);

  const pos = usePopupPosition(anchorRef, true);

  // Close on outside click, excluding the anchor that toggled this popup open
  useOutsideClick(popupRef, onClose, anchorRef);

  if (!pos) return null;

  return (
    <div
      ref={popupRef}
      className={styles.spellPopup}
      style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxH }}
    >
      <div className={styles.spellPopupHeader}>
        <strong className={styles.itemName}>{name}</strong>
        {traitStr && <span className={styles.itemTraits}> {traitStr}</span>}
        <button className={styles.spellPopupClose} onClick={onClose}>✕</button>
      </div>
      {html && (
        <div
          className={styles.itemDesc}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {hasDamage && (
        <button
          className={styles.rollAllDmgBtn}
          style={dmgMod !== 0 ? { borderColor: ewStyle?.color, color: ewStyle?.color } : undefined}
          onClick={e => { onRollAll!(damageGroups, name, [], e); onClose(); }}
        >
          🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
        </button>
      )}
    </div>
  );
}
