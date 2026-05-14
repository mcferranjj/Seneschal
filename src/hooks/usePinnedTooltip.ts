/**
 * usePinnedTooltip
 *
 * Encapsulates the hover-tooltip + click-to-pin interaction pattern used by
 * trait chips throughout the statblock (both header trait badges and inline
 * attack-line trait keywords).
 *
 * Behaviour:
 *  - Mouse enter  → compute viewport-safe position and show hover tooltip
 *  - Mouse leave  → hide tooltip (unless pinned)
 *  - Click        → pin the tooltip open as a persistent popup
 *  - ✕ button / outside click → unpin and hide
 *
 * Returns refs to attach to the anchor element and popup element, the current
 * position (or null when hidden), whether the popup is pinned, and event
 * handlers to spread onto the anchor.
 */

import { useState, useRef, useCallback, type RefObject } from 'react';
import { calcPopupPosition, type PopupPosition } from './usePopupPosition';
import { useOutsideClick } from './useOutsideClick';

// Trait tooltips are narrower/shorter than the default popup dimensions.
const TRAIT_POPUP_OPTIONS = { popupWidth: 260, popupMaxHeight: 200 } as const;

export type { PopupPosition };

export interface UsePinnedTooltipReturn {
  anchorRef:  RefObject<HTMLSpanElement | null>;
  popupRef:   RefObject<HTMLDivElement | null>;
  tooltipPos: PopupPosition | null;
  pinned:     boolean;
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: (e: React.MouseEvent) => void;
  };
  handleClose: (e?: React.MouseEvent) => void;
}

export function usePinnedTooltip(): UsePinnedTooltipReturn {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popupRef  = useRef<HTMLDivElement>(null);

  const [tooltipPos, setTooltipPos] = useState<PopupPosition | null>(null);
  const [pinned, setPinned]         = useState(false);

  const computePos = useCallback((): PopupPosition | null => {
    const anchor = anchorRef.current;
    if (!anchor) return null;
    return calcPopupPosition(anchor, TRAIT_POPUP_OPTIONS);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (pinned) return;
    const pos = computePos();
    if (pos) setTooltipPos(pos);
  }, [pinned, computePos]);

  const handleMouseLeave = useCallback(() => {
    if (pinned) return;
    setTooltipPos(null);
  }, [pinned]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned) return;
    const pos = computePos();
    if (pos) setTooltipPos(pos);
    setPinned(true);
  }, [pinned, computePos]);

  const handleClose = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPinned(false);
    setTooltipPos(null);
  }, []);

  useOutsideClick(popupRef, () => { if (pinned) handleClose(); }, anchorRef);

  return {
    anchorRef,
    popupRef,
    tooltipPos,
    pinned,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
    },
    handleClose,
  };
}
