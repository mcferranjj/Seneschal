/**
 * useContainerTraitTooltip
 *
 * Drives hover + click-to-pin behaviour for trait keyword spans (.pf2kw)
 * injected into a container via dangerouslySetInnerHTML. Attach `containerRef`
 * to the scrollable wrapper; the hook manages all interaction through native
 * DOM listeners so React's synthetic event system doesn't interfere.
 *
 * Behaviour mirrors usePinnedTooltip / TraitChip:
 *  - Hover  → show TraitHoverPopup
 *  - Click  → pin TraitPinnedPopup open
 *  - Scroll → dismiss hover (and suppress re-trigger while scrolling)
 *  - Outside click or ✕ → close pinned popup
 */

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';
import { calcPopupPosition, type PopupPosition } from './usePopupPosition';

export interface TraitTooltipState {
  trait: string;
  desc: string;
  pos: PopupPosition;
}

export interface UseContainerTraitTooltipReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  popupRef:     RefObject<HTMLDivElement | null>;
  hover:        TraitTooltipState | null;
  pinned:       TraitTooltipState | null;
  closePin:     () => void;
}

const POPUP_OPTIONS = { popupWidth: 260, popupMaxHeight: 200, centerOnAnchor: true } as const;

export function useContainerTraitTooltip(): UseContainerTraitTooltipReturn {
  const containerRef   = useRef<HTMLDivElement>(null);
  const popupRef       = useRef<HTMLDivElement>(null);
  const pinnedRef      = useRef<TraitTooltipState | null>(null);
  const scrollingRef   = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hover,  setHover]  = useState<TraitTooltipState | null>(null);
  const [pinned, setPinned] = useState<TraitTooltipState | null>(null);

  pinnedRef.current = pinned;

  const closePin = useCallback(() => setPinned(null), []);

  // ── DOM listeners for hover and click-to-pin ──────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function getKw(e: MouseEvent) {
      return (e.target as HTMLElement).closest('.pf2kw') as HTMLElement | null;
    }

    function onOver(e: MouseEvent) {
      if (pinnedRef.current || scrollingRef.current) return;
      const kw = getKw(e);
      if (!kw) return;
      const desc = kw.dataset.tip ?? '';
      if (!desc) return;
      setHover({ trait: kw.textContent ?? '', desc, pos: calcPopupPosition(kw, POPUP_OPTIONS) });
    }

    function onOut(e: MouseEvent) {
      if (pinnedRef.current) return;
      if (!getKw(e)) return;
      setHover(null);
    }

    function onMouseDown(e: MouseEvent) {
      const kw = getKw(e);
      if (!kw) return;
      e.stopPropagation();
      const desc = kw.dataset.tip ?? '';
      if (!desc) return;
      // Toggle off if same keyword already pinned
      if (pinnedRef.current?.desc === desc) {
        setPinned(null);
      } else {
        setHover(null);
        setPinned({ trait: kw.textContent ?? '', desc, pos: calcPopupPosition(kw, POPUP_OPTIONS) });
      }
    }

    container.addEventListener('mouseover',  onOver);
    container.addEventListener('mouseout',   onOut);
    container.addEventListener('mousedown',  onMouseDown);
    return () => {
      container.removeEventListener('mouseover',  onOver);
      container.removeEventListener('mouseout',   onOut);
      container.removeEventListener('mousedown',  onMouseDown);
    };
  }, []);

  // ── Dismiss hover on scroll; suppress re-trigger while scrolling ──────────
  useEffect(() => {
    if (!hover) return;
    function onWheel() {
      setHover(null);
      scrollingRef.current = true;
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => { scrollingRef.current = false; }, 300);
    }
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [hover]);

  // ── Outside click closes pinned popup ─────────────────────────────────────
  useEffect(() => {
    if (!pinned) return;
    function onDown(e: PointerEvent) {
      if (popupRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.('.pf2kw')) return;
      setPinned(null);
    }
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [pinned]);

  return { containerRef, popupRef, hover, pinned, closePin };
}
