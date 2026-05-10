/**
 * useFloatingPanel
 *
 * Provides drag + vertical-clamp + outside-click + Escape-key behaviour for
 * floating panels (dice rollers, spell popups, etc.).
 *
 * Returns:
 *  - ref          — attach to the panel root element
 *  - pos          — current drag position (null = use anchor)
 *  - clampedY     — auto-clamped anchorY (used when pos is null)
 *  - onDragHandlePointerDown — attach to the drag handle
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
  const [clampedY, setClampedY] = useState(anchorY);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPanelX: number;
    startPanelY: number;
  } | null>(null);

  useOutsideClick(ref, onClose);

  // Clamp vertical position so the panel never overflows the viewport bottom
  useEffect(() => {
    if (pos) return; // user is dragging — skip auto-clamp
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const overflow = rect.bottom - window.innerHeight + 8;
    if (overflow > 0) setClampedY(y => y - overflow);
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
    setPos({
      x: dragRef.current.startPanelX + dx,
      y: dragRef.current.startPanelY + dy,
    });
  }, []);

  const onDragPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const panelLeft = pos ? pos.x : anchorX;
  const panelTop = pos ? pos.y : clampedY;
  const panelTransform = pos ? 'none' : 'translateX(-50%)';

  return {
    ref,
    pos,
    panelLeft,
    panelTop,
    panelTransform,
    onDragHandlePointerDown,
    onDragPointerMove,
    onDragPointerUp,
  };
}
