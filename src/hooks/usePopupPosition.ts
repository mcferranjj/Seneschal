/**
 * usePopupPosition
 *
 * Computes a viewport-safe fixed position for a popup anchored to a trigger
 * element. Prefers opening below the anchor; flips above if there's
 * meaningfully more room there. Clamps the left edge to the viewport.
 *
 * Used by ItemBlock (ability glossary popup) and SpellPopup — centralises the
 * positioning logic that was previously duplicated across both components.
 */

import { useState, useEffect, type RefObject } from 'react';

export interface PopupPosition {
  top?: number;
  bottom?: number;
  left: number;
  maxH: number;
}

interface Options {
  popupWidth?: number;
  popupMaxHeight?: number;
  margin?: number;
  gap?: number;
}

/**
 * Returns a `PopupPosition` (or `null` before the first calculation) based on
 * the bounding rect of `anchorRef`. Re-runs whenever `open` changes to `true`.
 */
export function usePopupPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  {
    popupWidth    = 320,
    popupMaxHeight = 420,
    margin        = 8,
    gap           = 4,
  }: Options = {},
): PopupPosition | null {
  const [pos, setPos] = useState<PopupPosition | null>(null);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    let left = rect.left;
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin;
    }
    left = Math.max(margin, left);

    const fitsBelow = spaceBelow >= popupMaxHeight;
    const openBelow = fitsBelow || spaceBelow >= spaceAbove;

    if (openBelow) {
      setPos({ top: rect.bottom + gap, left, maxH: Math.min(popupMaxHeight, spaceBelow) });
    } else {
      setPos({ bottom: window.innerHeight - rect.top + gap, left, maxH: Math.min(popupMaxHeight, spaceAbove) });
    }
  }, [open, anchorRef, popupWidth, popupMaxHeight, margin, gap]);

  return pos;
}
