/**
 * PF2E Game Constants
 *
 * Shared lookup data used across multiple components.
 * Pure static data — no logic, no imports.
 */

// ── Creature types ────────────────────────────────────────────────────────────

export const CREATURE_TYPES = [
  'Aberration', 'Animal', 'Astral', 'Beast', 'Celestial', 'Construct',
  'Dragon', 'Dream', 'Elemental', 'Ethereal', 'Fey', 'Fiend', 'Fungus',
  'Humanoid', 'Monitor', 'Ooze', 'Plant', 'Shade', 'Spirit', 'Time', 'Undead',
];

// ── Creature sizes ────────────────────────────────────────────────────────────

export const SIZES: { value: string; label: string }[] = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'sm',   label: 'Small' },
  { value: 'med',  label: 'Medium' },
  { value: 'lg',   label: 'Large' },
  { value: 'huge', label: 'Huge' },
  { value: 'grg',  label: 'Gargantuan' },
];

/** Flat map of size value → display label (for read-only display). */
export const SIZE_LABELS: Record<string, string> = Object.fromEntries(
  SIZES.map(s => [s.value, s.label])
);

// ── Rarity ────────────────────────────────────────────────────────────────────

export const RARITIES: { value: string; label: string }[] = [
  { value: 'common',   label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare',     label: 'Rare' },
  { value: 'unique',   label: 'Unique' },
];

// ── Hazard types ──────────────────────────────────────────────────────────────

export const HAZARD_TYPES: { value: string; label: string }[] = [
  { value: 'trap',          label: 'Trap' },
  { value: 'haunt',         label: 'Haunt' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'magical',       label: 'Magical' },
  { value: 'mechanical',    label: 'Mechanical' },
];

// ── Damage types ──────────────────────────────────────────────────────────────

// Canonical PF2e (remaster) damage types used for search suggestions,
// immunity/resistance/weakness inputs, and the ability-editor damage picker.
// The picker groups in AbilityEditor.tsx are an ordered subset of this list.
export const DAMAGE_TYPES = [
  // Physical
  'bludgeoning', 'piercing', 'slashing',
  // Energy
  'acid', 'cold', 'electricity', 'fire', 'sonic',
  // Planar / esoteric
  'force', 'spirit', 'vitality', 'void',
  // Other
  'mental', 'poison', 'precision', 'bleed', 'untyped',
];
