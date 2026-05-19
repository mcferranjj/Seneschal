/**
 * Shared trait popup components used by both TraitChip (React-rendered traits)
 * and StatblockDrawer (traits inside dangerouslySetInnerHTML descriptions).
 */

import { createPortal } from 'react-dom';
import type { PopupPosition } from '../../hooks/usePopupPosition';
import styles from './StatblockDrawer.module.css';

interface TraitPopupProps {
  trait: string;
  desc: string;
  pos: PopupPosition;
}

/** Non-interactive hover tooltip — shown on mouseover, dismissed on mouseout/scroll. */
export function TraitHoverPopup({ trait, desc, pos }: TraitPopupProps) {
  return createPortal(
    <div
      className={styles.traitPinnedPopup}
      style={{ top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxH, pointerEvents: 'none' }}
    >
      <div className={styles.traitPinnedPopupHeader}>
        <span className={styles.traitPinnedPopupName}>{trait}</span>
      </div>
      <div className={styles.traitPinnedPopupDesc}>{desc}</div>
    </div>,
    document.body,
  );
}

interface TraitPinnedPopupProps extends TraitPopupProps {
  popupRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

/** Persistent pinned popup — stays open until ✕ or outside click. */
export function TraitPinnedPopup({ trait, desc, pos, popupRef, onClose }: TraitPinnedPopupProps) {
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
