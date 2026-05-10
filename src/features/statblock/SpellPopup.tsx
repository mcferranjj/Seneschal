import { useState, useEffect, useRef } from 'react';
import {
  applyEliteWeakToHtml,
  extractDamageGroups,
  stripFoundryMacros,
  linkKeywords,
  linkRolls,
} from '../../utils/foundryMacros';
import type { DamageGroup } from '../../utils/foundryMacros';
import styles from './StatblockDrawer.module.css';

function processHtml(raw: string): string {
  return linkRolls(linkKeywords(stripFoundryMacros(raw)));
}

interface SpellPopupProps {
  name: string;
  description: string;
  traits?: string[];
  ewMod: number;
  ewStyle?: React.CSSProperties;
  onRollAll?: (groups: DamageGroup[], name: string, e: React.MouseEvent) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

export function SpellPopup({ name, description, traits, ewMod, ewStyle, onRollAll, anchorRef, onClose }: SpellPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const traitStr = traits && traits.length > 0 ? `(${traits.join(', ')})` : '';
  const limited = /1\/day|2\/day|3\/day|focus/i.test(description);
  const dmgMod = ewMod !== 0 ? (limited ? (ewMod > 0 ? 4 : -4) : (ewMod > 0 ? 2 : -2)) : 0;
  const dcMod = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
  const adjustedDesc = (dmgMod !== 0 || dcMod !== 0) ? applyEliteWeakToHtml(description, dmgMod, dcMod) : description;
  const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
  const hasDamage = damageGroups.length > 0 && onRollAll != null;
  const html = processHtml(adjustedDesc);

  // Compute viewport-clamped position from anchor element
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxH: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const POPUP_W = 320;
    const POPUP_MAX_H = 420;
    const MARGIN = 8;
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    // Open below unless above has meaningfully more room and below is tight
    let posResult: { top?: number; bottom?: number; left: number; maxH: number };
    // Align left with anchor; clamp so popup stays within viewport
    let left = rect.left;
    if (left + POPUP_W > window.innerWidth - MARGIN) {
      left = window.innerWidth - POPUP_W - MARGIN;
    }
    left = Math.max(MARGIN, left);
    const fitsBelow = spaceBelow >= POPUP_MAX_H;
    const openBelow = fitsBelow || spaceBelow >= spaceAbove;
    if (openBelow) {
      // Below: anchor top edge at rect.bottom, let max-height clip naturally
      posResult = { top: rect.bottom + 4, left, maxH: Math.min(POPUP_MAX_H, spaceBelow) };
    } else {
      // Above: anchor bottom edge just above the clicked link using CSS bottom
      posResult = { bottom: window.innerHeight - rect.top + 4, left, maxH: Math.min(POPUP_MAX_H, spaceAbove) };
    }
    setPos(posResult);
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

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
          onClick={e => { onRollAll!(damageGroups, name, e); onClose(); }}
        >
          🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
        </button>
      )}
    </div>
  );
}
