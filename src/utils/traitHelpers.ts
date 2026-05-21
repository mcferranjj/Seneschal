/**
 * traitHelpers
 *
 * Utility functions for working with PF2e trait strings.
 * Pure functions — no React, no side effects, fully unit-testable.
 */

import { TRAIT_DESCRIPTIONS } from '../data/traitDescriptions';

/**
 * Resolve a raw PF2e trait string to its TRAIT_DESCRIPTIONS lookup key.
 *
 * Many weapon and ability traits carry a numeric or die-size parameter that is
 * part of the display string but not part of the description key, e.g.:
 *
 *   "deadly-2d10"             → "deadly"
 *   "fatal-d10"               → "fatal"
 *   "reload-0"                → "reload"
 *   "thrown-20"               → "thrown"
 *   "volley-30"               → "volley"
 *   "reach-10"                → "reach"
 *   "range increment 60 feet" → "range"   (AttackBlock rangeDisplay string)
 *   "range 30 feet"           → "range"
 *
 * Plain traits (agile, magical, twin, …) pass through unchanged.
 */
export function resolveTraitKey(raw: string): string {
  const lower = raw.toLowerCase().trim();

  // "range increment N feet" or "range N feet" → "range"
  if (lower.startsWith('range ')) return 'range';

  // Strip a trailing parameter: "-Nd<N>", "-d<N>", "-<N>", or "-<letter>"
  // e.g. deadly-2d10, fatal-d10, reload-0, thrown-20, versatile-p, versatile-b
  return lower.replace(/-(\d+d\d+|\d*d\d+|\d+|[a-z])$/, '');
}

/**
 * Look up the description for a raw trait string, handling parameterized
 * traits like "deadly-2d10" automatically.
 *
 * Returns undefined if no description exists.
 */
export function getTraitDescription(raw: string): string | undefined {
  return TRAIT_DESCRIPTIONS[resolveTraitKey(raw)];
}
