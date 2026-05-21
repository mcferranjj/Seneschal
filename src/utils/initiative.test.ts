import { describe, it, expect } from 'vitest';
import { computeInitForDrop } from './initiative';

function c(init: number) {
  return { init };
}

describe('computeInitForDrop', () => {
  // ── Edge cases ───────────────────────────────────────────────────────────

  it('drop at the top of an empty list returns 1', () => {
    const { draggedInit, sideEffects } = computeInitForDrop([], 0);
    expect(draggedInit).toBe(1);
    expect(sideEffects).toHaveLength(0);
  });

  it('drop at the top (above the highest) returns highest + 1', () => {
    const list = [c(8), c(7)];
    const { draggedInit, sideEffects } = computeInitForDrop(list, 0);
    expect(draggedInit).toBe(9);
    expect(sideEffects).toHaveLength(0);
  });

  it('drop at the bottom returns lowest - 1', () => {
    const list = [c(8), c(7)];
    const { draggedInit, sideEffects } = computeInitForDrop(list, 2);
    expect(draggedInit).toBe(6);
    expect(sideEffects).toHaveLength(0);
  });

  // ── Gap ≥ 2 (midpoint) ───────────────────────────────────────────────────

  it('inserts at midpoint when gap >= 2', () => {
    const list = [c(12), c(8)];
    const { draggedInit, sideEffects } = computeInitForDrop(list, 1);
    expect(draggedInit).toBe(10);
    expect(sideEffects).toHaveLength(0);
  });

  it('inserts at floor midpoint for odd gap', () => {
    const list = [c(10), c(7)];
    const { draggedInit, sideEffects } = computeInitForDrop(list, 1);
    expect(draggedInit).toBe(8);
    expect(sideEffects).toHaveLength(0);
  });

  // ── Gap = 1 (renumber) ───────────────────────────────────────────────────

  /**
   * THE CRITICAL BUG CASE:
   * withoutDragged = [AnimatedBroom(8), Trollhound(7)]
   * Insert IceTroll between them (toIdx = 1).
   *
   * Expected:
   *   - draggedInit = 7  (AnimatedBroom(8) - 1)
   *   - sideEffects = [{ idx: 1, init: 6 }]  (Trollhound shifts to 6)
   *
   * After applying all updates:
   *   AnimatedBroom(8), IceTroll(7), Trollhound(6)  — correct order.
   *
   * Before the fix, the renumber branch returned `maxInit - toIdx = 8 - 1 = 7`
   * (coincidentally equal to Trollhound's init), with NO sideEffects.  Both
   * IceTroll and Trollhound landed at init 7, creating an ambiguous tie that
   * could resolve in the wrong visual order and produced unstable persistence.
   */
  it('renumber case — drag-down into tight gap: IceTroll between AnimatedBroom and Trollhound', () => {
    const list = [c(8), c(7)]; // withoutDragged: AnimatedBroom(8), Trollhound(7)
    const { draggedInit, sideEffects } = computeInitForDrop(list, 1);

    // Dragged creature must land strictly between 8 and Trollhound's new init.
    expect(draggedInit).toBe(7);
    // Trollhound must be shifted down to 6 to avoid a tie.
    expect(sideEffects).toHaveLength(1);
    expect(sideEffects[0]).toEqual({ idx: 1, init: 6 });
  });

  it('renumber propagates through a chain of consecutive inits', () => {
    // withoutDragged: [A(10), B(5), C(4), D(3)]
    // Insert between B(5) and C(4) — gap = 1.
    const list = [c(10), c(5), c(4), c(3)];
    const { draggedInit, sideEffects } = computeInitForDrop(list, 2);

    expect(draggedInit).toBe(4); // 5 - 1
    // C and D both get bumped down; A and B are unaffected.
    expect(sideEffects).toContainEqual({ idx: 2, init: 3 }); // C: 4 → 3
    expect(sideEffects).toContainEqual({ idx: 3, init: 2 }); // D: 3 → 2
    expect(sideEffects).toHaveLength(2);
  });

  it('renumber stops early when a natural gap already exists below', () => {
    // withoutDragged: [A(10), B(5), C(4), D(1)]
    // Insert between B(5) and C(4) — gap = 1.
    // D is at 1, which is already ≤ 3 (the next-to-assign value), so no shift needed.
    const list = [c(10), c(5), c(4), c(1)];
    const { draggedInit, sideEffects } = computeInitForDrop(list, 2);

    expect(draggedInit).toBe(4); // 5 - 1
    // Only C needs to shift; D is already low enough.
    expect(sideEffects).toHaveLength(1);
    expect(sideEffects[0]).toEqual({ idx: 2, init: 3 }); // C: 4 → 3
  });

  it('renumber with large gap elsewhere in the list does not bleed maxInit pollution', () => {
    // withoutDragged: [Dragon(20), AnimatedBroom(8), Trollhound(7)]
    // Insert between AnimatedBroom(8) and Trollhound(7) — gap = 1.
    // Old formula: maxInit - toIdx = 20 - 2 = 18 → WRONG (above Dragon!).
    // New formula: draggedInit = 8 - 1 = 7, sideEffects shift Trollhound to 6.
    const list = [c(20), c(8), c(7)];
    const { draggedInit, sideEffects } = computeInitForDrop(list, 2);

    expect(draggedInit).toBe(7);
    expect(sideEffects).toHaveLength(1);
    expect(sideEffects[0]).toEqual({ idx: 2, init: 6 }); // Trollhound shifts to 6
  });
});
