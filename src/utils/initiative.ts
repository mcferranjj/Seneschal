/**
 * Pure helpers for the combat tracker's initiative ordering.
 *
 * Kept free of React/DOM so they can be unit-tested in isolation.
 */

interface InitOrdered {
  init: number;
}

/**
 * Compute the new initiative value for a combatant being inserted at `toIdx`
 * in `list` (where `list` is already sorted descending by init and does NOT
 * include the moving combatant).
 *
 * Rules:
 *   - Drop at the top      → above-top init + 1
 *   - Drop at the bottom   → bottom init - 1
 *   - Drop between A (above) and B (below) with a gap ≥ 2 → midpoint floor
 *   - Otherwise (no integer slot available) → fall back to `maxInit - toIdx`
 *     so the inserted creature lands in a sensible relative slot.
 */
export function computeInitForDrop<T extends InitOrdered>(list: T[], toIdx: number): number {
  const above = list[toIdx - 1];
  const below = list[toIdx];

  if (!above) {
    return (below?.init ?? 0) + 1;
  }
  if (!below) {
    return above.init - 1;
  }
  if (above.init - below.init >= 2) {
    return Math.floor((above.init + below.init) / 2);
  }

  const maxInit = Math.max(...list.map(c => c.init));
  return maxInit - toIdx;
}
