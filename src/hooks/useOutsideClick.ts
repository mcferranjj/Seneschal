/**
 * useOutsideClick
 *
 * Calls onClose when a pointerdown event fires outside the given ref element.
 * Previously duplicated in DiceRoller, MultiDamageRoller, DamageRoller,
 * TopBar, RollHistory, and SpellPopup.
 */

import { useEffect, type RefObject } from 'react';

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [ref, onClose]);
}
