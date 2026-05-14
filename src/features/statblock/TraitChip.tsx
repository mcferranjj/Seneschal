import { useState, useRef, useCallback } from 'react';
import { TRAIT_DESCRIPTIONS } from '../../data/traitDescriptions';
import { traitColor } from '../../utils/traitColors';
import styles from './StatblockDrawer.module.css';

const TOOLTIP_W   = 260;
const TOOLTIP_MAX_H = 200; // max-height set in CSS; used here only for flip calculation
const MARGIN      = 8;
const GAP         = 4; // matches usePopupPosition default

interface TraitChipProps {
  trait: string;
  rarity: string;
}

/**
 * A single trait badge. Traits that have a description in TRAIT_DESCRIPTIONS
 * show a fixed-position hover tooltip; others render as a plain chip.
 */
export function TraitChip({ trait, rarity }: TraitChipProps) {
  const desc = TRAIT_DESCRIPTIONS[trait.toLowerCase()];
  const bgColor = traitColor(trait.toLowerCase(), rarity);
  const chipRef = useRef<HTMLSpanElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const spaceAbove = rect.top - MARGIN;
    const openBelow = spaceBelow >= TOOLTIP_MAX_H || spaceBelow >= spaceAbove;
    const top = openBelow ? rect.bottom + GAP : rect.top - Math.min(TOOLTIP_MAX_H, spaceAbove) - GAP;
    let left = rect.left;
    if (left + TOOLTIP_W > window.innerWidth - MARGIN) left = window.innerWidth - TOOLTIP_W - MARGIN;
    left = Math.max(MARGIN, left);
    setTooltipPos({ top, left });
  }, []);

  if (!desc) {
    return (
      <span className={styles.traitChip} style={{ background: bgColor }}>
        {trait}
      </span>
    );
  }

  return (
    <span
      ref={chipRef}
      className={`${styles.traitChip} ${styles.traitChipHoverable}`}
      style={{ background: bgColor }}
      onMouseEnter={handleMouseEnter}
    >
      {trait}
      {tooltipPos && (
        <span className={styles.traitTooltip} style={{ top: tooltipPos.top, left: tooltipPos.left }}>
          <span className={styles.traitTooltipName}>{trait}</span>
          {desc}
        </span>
      )}
    </span>
  );
}
