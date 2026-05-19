import { getTraitDescription } from '../../utils/traitHelpers';
import { traitColor } from '../../utils/traitColors';
import { usePinnedTooltip } from '../../hooks/usePinnedTooltip';
import { TraitHoverPopup, TraitPinnedPopup } from './TraitPopup';
import styles from './StatblockDrawer.module.css';

interface TraitChipProps {
  trait: string;
  rarity: string;
  /**
   * 'badge'  (default) — colored pill used in the statblock header traits row.
   * 'inline'           — unstyled span used inside italic attack-line trait lists.
   */
  variant?: 'badge' | 'inline';
}

/**
 * A single trait element. Traits that have a description show a hover popup;
 * clicking pins it open as a scrollable popup that dismisses via ✕ or an
 * outside click.
 *
 * Use variant="badge"  for the colored header-row chips (default).
 * Use variant="inline" for plain italic keywords inside attack lines.
 */
export function TraitChip({ trait, rarity, variant = 'badge' }: TraitChipProps) {
  const desc    = getTraitDescription(trait);
  const bgColor = variant === 'badge' ? traitColor(trait.toLowerCase(), rarity) : undefined;

  const { anchorRef, popupRef, tooltipPos, pinned, handlers, handleClose } = usePinnedTooltip();

  // ── No description: render non-interactive ──────────────────────────────
  if (!desc) {
    if (variant === 'inline') return <span>{trait}</span>;
    return (
      <span className={styles.traitChip} style={{ background: bgColor }}>
        {trait}
      </span>
    );
  }

  // ── Badge variant ───────────────────────────────────────────────────────
  if (variant === 'badge') {
    return (
      <span
        ref={anchorRef}
        className={`${styles.traitChip} ${styles.traitChipHoverable} ${pinned ? styles.traitChipPinned : ''}`}
        style={{ background: bgColor }}
        {...handlers}
      >
        {trait}
        {tooltipPos && !pinned && <TraitHoverPopup trait={trait} desc={desc} pos={tooltipPos} />}
        {tooltipPos && pinned && <TraitPinnedPopup trait={trait} desc={desc} pos={tooltipPos} popupRef={popupRef} onClose={handleClose} />}
      </span>
    );
  }

  // ── Inline variant ──────────────────────────────────────────────────────
  return (
    <span
      ref={anchorRef}
      className={`${styles.attackTraitKw} ${pinned ? styles.attackTraitKwPinned : ''}`}
      {...handlers}
    >
      {trait}
      {tooltipPos && !pinned && <TraitHoverPopup trait={trait} desc={desc} pos={tooltipPos} />}
      {tooltipPos && pinned && <TraitPinnedPopup trait={trait} desc={desc} pos={tooltipPos} popupRef={popupRef} onClose={handleClose} />}
    </span>
  );
}
