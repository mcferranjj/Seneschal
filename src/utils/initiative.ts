/**
 * Pure helpers for the combat tracker's initiative ordering.
 *
 * Kept free of React/DOM so they can be unit-tested in isolation.
 */

interface InitOrdered {
  init: number;
}

/**
 * Result of computeInitForDrop.
 *
 * - `draggedInit`: the new initiative for the creature being dropped.
 * - `sideEffects`: zero or more `{ idx, init }` entries for OTHER items in the
 *   `list` passed to the function whose inits must also change. This is only
 *   non-empty when the gap between neighbours is less than 2 and a full
 *   renumber is needed to open up a slot.
 */
export interface DropInitResult {
  draggedInit: number;
  sideEffects: { idx: number; init: number }[];
}

/**
 * Compute the new initiative value(s) needed when a combatant is inserted at
 * `toIdx` in `list` (sorted descending by init, NOT including the moving
 * combatant).
 *
 * Rules:
 *   - Drop at the top      → above-top init + 1
 *   - Drop at the bottom   → bottom init - 1
 *   - Drop between A (above) and B (below) with a gap ≥ 2 → midpoint floor
 *   - Otherwise (no integer slot available) → renumber `toIdx` onward
 *     descending from `above.init - 1`, so the inserted creature lands in the
 *     correct slot without a collision.
 */
export function computeInitForDrop<T extends InitOrdered>(
  list: T[],
  toIdx: number,
): DropInitResult {
  const above = list[toIdx - 1];
  const below = list[toIdx];

  if (!above) {
    return { draggedInit: (below?.init ?? 0) + 1, sideEffects: [] };
  }
  if (!below) {
    return { draggedInit: above.init - 1, sideEffects: [] };
  }
  if (above.init - below.init >= 2) {
    return {
      draggedInit: Math.floor((above.init + below.init) / 2),
      sideEffects: [],
    };
  }

  // No integer gap: renumber from `toIdx` onward (descending from above.init - 1).
  // We shift list[toIdx], list[toIdx+1], … down by however much is needed so
  // the dragged creature fits at above.init - 1 without a collision.
  const draggedInit = above.init - 1;
  const sideEffects: { idx: number; init: number }[] = [];

  let next = draggedInit - 1; // first value to assign to list[toIdx]
  for (let i = toIdx; i < list.length; i++) {
    if (list[i].init <= next) {
      // No collision at this position or beyond — stop early.
      break;
    }
    sideEffects.push({ idx: i, init: next });
    next--;
  }

  return { draggedInit, sideEffects };
}
