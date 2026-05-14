/**
 * useOutsideClick
 *
 * Calls onClose when a pointerdown event fires outside the given ref element.
 * An optional excludeRef can be supplied for a second element that should also
 * be treated as "inside" (e.g. an anchor that toggles the panel).
 *
 * Previously duplicated in DiceRoller, MultiDamageRoller,
 * TopBar, RollHistory, and SpellPopup.
 */

import { useEffect, type RefObject } from 'react';

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  excludeRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        if (excludeRef?.current && excludeRef.current.contains(target)) return;
        onClose();
      }
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [ref, onClose, excludeRef]);
}
