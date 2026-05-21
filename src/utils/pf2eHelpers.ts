/**
 * PF2E Domain Helpers
 *
 * Canonical implementations of creature field accessors that were previously
 * duplicated across sync/sync.ts and statblockHelpers.ts. Pure functions —
 * no React, no DB.
 */

import type { PF2ECreature } from '../types/pf2e';
import { CREATURE_TYPES } from '../data/pf2eConstants';

/**
 * Normalizes a raw `system.details.creatureType` value into a family string.
 * Returns `undefined` for missing / non-string / empty (after trim) values so
 * sync and custom-import paths produce identical family keys for the same
 * source data (avoids duplicate filter entries from trailing whitespace etc.).
 */
export function normalizeFamily(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

// Lowercase set built once at module level — used by sortTraits.
const CREATURE_TYPES_LOWER = new Set(CREATURE_TYPES.map(t => t.toLowerCase()));

/**
 * Sorts a raw trait array into canonical display order:
 *   creature types (A–Z) → "complex" (if injected) → all other traits (A–Z).
 *
 * Rarity and size are NOT included here — callers prepend those separately.
 * The `injectComplex` flag handles hazards whose "complex" trait is stored on
 * the hazard record rather than in the traits array.
 */
export function sortTraits(traits: string[], injectComplex = false): string[] {
  const complexAlreadyPresent = traits.some(t => t.toLowerCase() === 'complex');
  return [
    ...traits.filter(t => CREATURE_TYPES_LOWER.has(t.toLowerCase())).sort((a, b) => a.localeCompare(b)),
    ...(injectComplex && !complexAlreadyPresent ? ['complex'] : []),
    ...traits.filter(t => !CREATURE_TYPES_LOWER.has(t.toLowerCase()) && t.toLowerCase() !== 'complex').sort((a, b) => a.localeCompare(b)),
  ];
}

/**
 * Returns true if the given attack is eligible for Sneak Attack precision damage.
 *
 * Rules (PF2e):
 *  - Melee + (finesse OR agile trait) → eligible
 *  - Ranged + thrown + (finesse OR agile trait) → eligible
 *  - Ranged + NOT thrown → eligible
 *  - Anything else → not eligible
 */
export function isSneakAttackEligible(
  attackType: 'melee' | 'ranged',
  traits: string[],
): boolean {
  const hasFinesse = traits.includes('finesse');
  const hasAgile   = traits.includes('agile');
  const isThrown   = traits.some(t => t.startsWith('thrown'));

  if (attackType === 'melee') {
    return hasFinesse || hasAgile;
  }
  // ranged
  if (isThrown) {
    return hasFinesse || hasAgile;
  }
  // ranged, not thrown
  return true;
}
