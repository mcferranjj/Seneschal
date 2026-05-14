/**
 * PF2E Domain Helpers
 *
 * Canonical implementations of creature field accessors that were previously
 * duplicated across sync/sync.ts and statblockHelpers.ts. Pure functions —
 * no React, no DB.
 */

import type { PF2ECreature } from '../types/pf2e';

/** Returns the creature's base level as a number (default 0). */
export function getLevel(c: PF2ECreature): number {
  const lvl = c.system?.details?.level;
  if (!lvl) return 0;
  return typeof lvl === 'object' ? lvl.value ?? 0 : (lvl as number);
}

/**
 * Returns the creature's size as a short code (e.g. "med", "lg").
 * Used internally for DB records. For display, use getSizeLabel or SIZE_LABELS from data/pf2eConstants.
 */
export function getSize(c: PF2ECreature): string {
  const sz = c.system?.traits?.size;
  if (!sz) return 'med';
  return typeof sz === 'object' ? sz.value ?? 'med' : (sz as string);
}

const SIZE_DISPLAY_MAP: Record<string, string> = {
  tiny: 'Tiny', sm: 'Small', med: 'Medium', lg: 'Large', huge: 'Huge', grg: 'Gargantuan',
};

/**
 * Returns the creature's size as a human-readable display label (e.g. "Medium", "Large").
 * Used in the statblock UI.
 */
export function getSizeLabel(c: PF2ECreature): string {
  const raw = getSize(c);
  return SIZE_DISPLAY_MAP[raw] ?? raw;
}
