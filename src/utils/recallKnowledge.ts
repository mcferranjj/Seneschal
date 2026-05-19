/**
 * Recall Knowledge helpers
 *
 * Pure utility functions for computing Recall Knowledge DCs and relevant
 * skills for a given creature.  Based on PF2E Remaster GM Core Table 5-6.
 *
 * Kept separate from EncounterManager so they can be imported anywhere
 * (e.g. StatblockDrawer, future unit tests) without pulling in React.
 */

// ── DC table — indexed by creature level (−1 through 25) ─────────────────────

export const RK_DC_TABLE: Record<number, number> = {
  [-1]: 13, [0]: 14, [1]: 15, [2]: 16, [3]: 18, [4]: 19, [5]: 20, [6]: 22,
  [7]: 23,  [8]: 24, [9]: 26, [10]: 27, [11]: 28, [12]: 30, [13]: 31, [14]: 32,
  [15]: 34, [16]: 35, [17]: 36, [18]: 38, [19]: 39, [20]: 40, [21]: 42, [22]: 44,
  [23]: 46, [24]: 48, [25]: 50,
};

// ── Rarity DC adjustments (GM Core) ──────────────────────────────────────────

export const RK_RARITY_ADJUSTMENT: Record<string, number> = {
  uncommon: 2,
  rare:     5,
  unique:   10,
};

// ── Relevant skills per creature type ────────────────────────────────────────

export const RK_SKILLS: Record<string, string[]> = {
  aberration:  ['Occultism'],
  animal:      ['Nature'],
  astral:      ['Occultism'],
  beast:       ['Arcana', 'Nature'],
  celestial:   ['Religion'],
  construct:   ['Arcana', 'Crafting'],
  dragon:      ['Arcana'],
  elemental:   ['Arcana', 'Nature'],
  fey:         ['Nature'],
  fiend:       ['Religion'],
  fungus:      ['Nature'],
  humanoid:    ['Society'],
  monitor:     ['Religion'],
  ooze:        ['Occultism'],
  plant:       ['Nature'],
  spirit:      ['Occultism'],
  undead:      ['Religion'],
};

// ── Main helper ───────────────────────────────────────────────────────────────

/**
 * Compute the Recall Knowledge DC and relevant skills for a creature.
 *
 * - Always returns a DC (level + rarity adjustment, clamped to the table range).
 * - Returns skills only when recognised creature-type traits are present;
 *   otherwise `skills` is an empty array.
 */
export function getRecallKnowledge(
  level: number,
  traits: string[],
  rarity = 'common',
): { dc: number; skills: string[] } {
  const l = Math.max(-1, Math.min(25, level));
  const baseDc = RK_DC_TABLE[l] ?? 14;
  const rarityAdj = RK_RARITY_ADJUSTMENT[rarity.toLowerCase()] ?? 0;
  const dc = baseDc + rarityAdj;

  const skills = new Set<string>();
  for (const t of traits) {
    const s = RK_SKILLS[t.toLowerCase()];
    if (s) s.forEach(sk => skills.add(sk));
  }

  return { dc, skills: [...skills].sort() };
}
