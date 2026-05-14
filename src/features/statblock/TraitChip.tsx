import { createPortal } from 'react-dom';
import { getTraitDescription } from '../../utils/traitHelpers';
import { traitColor } from '../../utils/traitColors';
import { usePinnedTooltip, type PopupPosition } from '../../hooks/usePinnedTooltip';
import styles from './StatblockDrawer.module.css';

// ── Shared pinned-popup JSX ────────────────────────────────────────────────

interface PinnedPopupProps {
  trait: string;
  desc: string;
  pos: PopupPosition;
  popupRef: React.RefObject<HTMLDivElement | null>;
  onClose: (e?: React.MouseEvent) => void;
}

function TraitPinnedPopup({ trait, desc, pos, popupRef, onClose }: PinnedPopupProps) {
  return createPortal(
    <div
      ref={popupRef}
      className={styles.traitPinnedPopup}
      style={{ top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxH }}
    >
      <div className={styles.traitPinnedPopupHeader}>
        <span className={styles.traitPinnedPopupName}>{trait}</span>
        <button className={styles.traitPinnedPopupClose} onClick={onClose}>✕</button>
      </div>
      <div className={styles.traitPinnedPopupDesc}>{desc}</div>
    </div>,
    document.body,
  );
}

// ── Shared hover-tooltip JSX ───────────────────────────────────────────────

interface HoverTooltipProps {
  trait: string;
  desc: string;
  pos: PopupPosition;
}

function TraitHoverTooltip({ trait, desc, pos, forceVisible }: HoverTooltipProps) {
  return createPortal(
    <span
      className={styles.traitTooltip}
      style={{
        top: pos.top, bottom: pos.bottom, left: pos.left,
        opacity: 1,
      }}
    >
      <span className={styles.traitTooltipName}>{trait}</span>
      {desc}
    </span>,
    document.body,
  );
}

// ── TraitChip ─────────────────────────────────────────────────────────────

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
 * A single trait element. Traits that have a description show a viewport-safe
 * hover tooltip; clicking pins it open as a scrollable popup that dismisses
 * via ✕ or an outside click.
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
        {tooltipPos && !pinned && <TraitHoverTooltip trait={trait} desc={desc} pos={tooltipPos} />}
        {pinned && tooltipPos && <TraitPinnedPopup trait={trait} desc={desc} pos={tooltipPos} popupRef={popupRef} onClose={handleClose} />}
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
      {tooltipPos && !pinned && <TraitHoverTooltip trait={trait} desc={desc} pos={tooltipPos} />}
      {pinned && tooltipPos && <TraitPinnedPopup trait={trait} desc={desc} pos={tooltipPos} popupRef={popupRef} onClose={handleClose} />}
    </span>
  );
}
