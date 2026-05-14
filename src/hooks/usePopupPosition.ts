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
 * Pure calculation: given an anchor element's bounding rect and sizing
 * options, returns a viewport-safe PopupPosition.
 *
 * Exported so imperative callers (e.g. usePinnedTooltip) can call it
 * directly without needing an effect-based open/close flag.
 */
export function calcPopupPosition(
  anchor: HTMLElement,
  {
    popupWidth     = 320,
    popupMaxHeight = 420,
    margin         = 8,
    gap            = 4,
  }: Options = {},
): PopupPosition {
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;

  let left = rect.left;
  if (left + popupWidth > window.innerWidth - margin) {
    left = window.innerWidth - popupWidth - margin;
  }
  left = Math.max(margin, left);

  const openBelow = spaceBelow >= popupMaxHeight || spaceBelow >= spaceAbove;

  if (openBelow) {
    return { top: rect.bottom + gap, left, maxH: Math.min(popupMaxHeight, spaceBelow) };
  } else {
    return { bottom: window.innerHeight - rect.top + gap, left, maxH: Math.min(popupMaxHeight, spaceAbove) };
  }
}

/**
 * Returns a `PopupPosition` (or `null` before the first calculation) based on
 * the bounding rect of `anchorRef`. Re-runs whenever `open` changes to `true`.
 */
export function usePopupPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  options: Options = {},
): PopupPosition | null {
  const [pos, setPos] = useState<PopupPosition | null>(null);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    setPos(calcPopupPosition(anchor, options));
    // options is an inline object at call sites, so we intentionally omit it
    // from deps to avoid infinite loops — callers should memoize if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorRef]);

  return pos;
}
