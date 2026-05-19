/**
 * statblockHelpers.ts — re-export barrel
 *
 * This file exists purely for backwards compatibility. Prefer importing
 * directly from the focused modules:
 *   - creatureHelpers.ts  — stat accessors (languages, skills, speed, etc.)
 *   - damageHelpers.ts    — damage strings, groups, sneak attack
 *   - hazardHelpers.ts    — HazardDetails + getHazardDetails
 *
 * Pure utilities that were previously inlined here live in:
 *   - utils/formatters.ts     (formatMod)
 *   - utils/foundryMacros.ts  (stripFoundryMacros, linkRolls, …)
 *   - utils/pf2eHelpers.ts    (getLevel, getSize)
 */

// ── Pure utilities ────────────────────────────────────────────────────────────
export { formatMod } from '../../utils/formatters';
export {
  stripFoundryMacros,
  linkRolls,
  linkKeywords,
  applyEliteWeakToHtml,
  extractDamageGroups,
  isLimitedUse,
  processFoundryHtml,
} from '../../utils/foundryMacros';
export type { DamageGroup } from '../../utils/foundryMacros';
export { getLevel, getSizeLabel as getSize } from '../../utils/pf2eHelpers';

// ── Creature helpers ──────────────────────────────────────────────────────────
export {
  getLanguages,
  getSkills,
  getSenses,
  getSpeedString,
  getSpeedStringWithPenalty,
  getImmResWeak,
  getAttacks,
  getActions,
  getPassives,
} from './creatureHelpers';

// ── Damage helpers ────────────────────────────────────────────────────────────
export {
  getDamageString,
  getDamageGroups,
  getSneakAttackDamage,
  withSneakAttack,
} from './damageHelpers';

// ── Hazard helpers ────────────────────────────────────────────────────────────
export type { HazardDetails } from './hazardHelpers';
export { getHazardDetails } from './hazardHelpers';
