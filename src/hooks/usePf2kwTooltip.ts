/**
 * usePf2kwTooltip
 *
 * Listens for mouseover/mouseout on `.pf2kw` spans injected as raw HTML via
 * dangerouslySetInnerHTML. Because those spans live inside containers with
 * `overflow: hidden` the CSS `::after` tooltip gets clipped. This hook drives
 * a React-portal tooltip rendered into document.body instead.
 *
 * Usage:
 *   const { containerRef, tooltip } = usePf2kwTooltip();
 *   // attach containerRef to the scrollable content wrapper
 *   // render <Pf2kwTooltipPortal tooltip={tooltip} /> somewhere at the top level
 */

import { useState, useRef, useEffect, type RefObject } from 'react';
import { calcPopupPosition } from './usePopupPosition';

export interface Pf2kwTooltipState {
  text: string;
  top?: number;
  bottom?: number;
  left: number;
  maxH: number;
}

const POPUP_OPTIONS = { popupWidth: 240, popupMaxHeight: 160, centerOnAnchor: true } as const;

export function usePf2kwTooltip(): {
  containerRef: RefObject<HTMLDivElement | null>;
  tooltip: Pf2kwTooltipState | null;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Pf2kwTooltipState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onOver(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('.pf2kw') as HTMLElement | null;
      if (!target) return;
      const tip = target.dataset.tip;
      if (!tip) return;
      const pos = calcPopupPosition(target, POPUP_OPTIONS);
      setTooltip({ text: tip, ...pos });
    }

    function onOut(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('.pf2kw') as HTMLElement | null;
      if (!target) return;
      setTooltip(null);
    }

    container.addEventListener('mouseover', onOver);
    container.addEventListener('mouseout', onOut);
    return () => {
      container.removeEventListener('mouseover', onOver);
      container.removeEventListener('mouseout', onOut);
    };
  }, []);

  return { containerRef, tooltip };
}
