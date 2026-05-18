/**
 * useConditionTooltip
 *
 * Manages hover-with-delay tooltip state for condition picker buttons.
 *
 * Behaviour:
 *  - Mouse enters a button → starts a short delay (default 300 ms)
 *  - If mouse is still over the button after the delay → tooltip appears
 *    anchored to the right of the button (flips left near the viewport edge)
 *  - Mouse leaves the button → cancels any pending delay and hides the tooltip
 *  - Mouse enters the tooltip panel itself → keeps it visible
 *  - Mouse leaves the tooltip panel → hides the tooltip
 *  - clear() → imperatively hides the tooltip (e.g. when the picker closes)
 *
 * Returns:
 *  tooltip        – current tooltip state (null = hidden)
 *  getButtonHandlers(name) – returns { onMouseEnter, onMouseLeave } for a button
 *  tooltipHandlers         – { onMouseEnter, onMouseLeave } for the tooltip panel
 *  clear                   – hide immediately with no delay
 */

import { useState, useRef, useCallback } from 'react';

export interface ConditionTooltipState {
  name: string;
  left: number;
  top: number;
}

const TOOLTIP_W       = 280;
const TOOLTIP_MAX_H   = 220;
const TOOLTIP_GAP     = 6;   // px gap between button right edge and tooltip left edge
const HOVER_DELAY_MS  = 300;
const VIEWPORT_MARGIN = 8;

function calcPosition(buttonRect: DOMRect): { left: number; top: number } {
  const rawLeft = buttonRect.right + TOOLTIP_GAP;
  // Flip left if it would overflow the right edge
  const left = rawLeft + TOOLTIP_W > window.innerWidth - VIEWPORT_MARGIN
    ? buttonRect.left - TOOLTIP_W - TOOLTIP_GAP
    : rawLeft;
  // Clamp top so it never runs off the bottom
  const top = Math.min(buttonRect.top, window.innerHeight - TOOLTIP_MAX_H - VIEWPORT_MARGIN);
  return { left, top };
}

export function useConditionTooltip() {
  const [tooltip, setTooltip] = useState<ConditionTooltipState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    cancelTimer();
    setTooltip(null);
  }, [cancelTimer]);

  /** Returns onMouseEnter / onMouseLeave handlers to spread onto a picker button. */
  const getButtonHandlers = useCallback((name: string) => ({
    onMouseEnter(e: React.MouseEvent<HTMLElement>) {
      cancelTimer();
      const rect = e.currentTarget.getBoundingClientRect();
      timerRef.current = setTimeout(() => {
        setTooltip({ name, ...calcPosition(rect) });
      }, HOVER_DELAY_MS);
    },
    onMouseLeave() {
      clear();
    },
  }), [cancelTimer, clear]);

  /** Spread onto the tooltip panel itself to keep it open while hovered. */
  const tooltipHandlers = {
    onMouseEnter() { cancelTimer(); },
    onMouseLeave() { clear(); },
  };

  return { tooltip, getButtonHandlers, tooltipHandlers, clear };
}
