/**
 * useFloatingPanel
 *
 * Provides drag + viewport-clamp + outside-click behaviour for floating panels
 * (dice rollers, spell popups, etc.).
 *
 * Returns:
 *  - ref              — attach to the panel root element
 *  - panelLeft        — resolved CSS `left` value
 *  - panelTop         — resolved CSS `top` value (clamped to viewport)
 *  - panelTransform   — `translateX(-50%)` when anchored, `none` when dragging
 *  - panelMaxHeight   — available height from panelTop to viewport bottom (minus 8px margin);
 *                       set as `--roller-max-height` on the panel so CSS can cap overflow
 *  - onDragHandlePointerDown — attach to the drag handle element
 *  - onDragPointerMove       — attach to the panel root (onPointerMove)
 *  - onDragPointerUp         — attach to the panel root (onPointerUp)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useOutsideClick } from './useOutsideClick';

export function useFloatingPanel(
  anchorX: number,
  anchorY: number,
  onClose: () => void,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [clampedX, setClampedX] = useState(anchorX);
  const [clampedY, setClampedY] = useState(anchorY);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPanelX: number;
    startPanelY: number;
  } | null>(null);

  useOutsideClick(ref, onClose);

  // Clamp position so the panel stays fully within the viewport
  useEffect(() => {
    if (pos) return; // user is dragging — skip auto-clamp
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    // Vertical: clamp bottom then top
    const bottomOverflow = rect.bottom - window.innerHeight + 8;
    const topOverflow = 8 - rect.top;
    if (bottomOverflow > 0) setClampedY(y => y - bottomOverflow);
    else if (topOverflow > 0) setClampedY(y => y + topOverflow);
    // Horizontal: clamp right then left
    const rightOverflow = rect.right - window.innerWidth + 8;
    const leftOverflow = 8 - rect.left;
    if (rightOverflow > 0) setClampedX(x => x - rightOverflow);
    else if (leftOverflow > 0) setClampedX(x => x + leftOverflow);
  });

  const onDragHandlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!ref.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = ref.current.getBoundingClientRect();
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPanelX: rect.left,
      startPanelY: rect.top,
    };
  }, []);

  const onDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startMouseX;
    const dy = e.clientY - dragRef.current.startMouseY;
    const rect = ref.current?.getBoundingClientRect();
    const panelW = rect?.width ?? 0;
    const panelH = rect?.height ?? 0;
    const newX = dragRef.current.startPanelX + dx;
    const newY = dragRef.current.startPanelY + dy;
    setPos({
      x: Math.min(window.innerWidth - panelW - 8, Math.max(8, newX)),
      y: Math.min(window.innerHeight - panelH - 8, Math.max(8, newY)),
    });
  }, []);

  const onDragPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const panelLeft = pos ? pos.x : clampedX;
  const panelTop = pos ? pos.y : clampedY;
  const panelTransform = pos ? 'none' : 'translateX(-50%)';
  /** Available height from the panel's top edge to the bottom of the viewport (minus 8px margin). */
  const panelMaxHeight = `${window.innerHeight - panelTop - 8}px`;

  return {
    ref,
    pos,
    panelLeft,
    panelTop,
    panelTransform,
    panelMaxHeight,
    onDragHandlePointerDown,
    onDragPointerMove,
    onDragPointerUp,
  };
}
