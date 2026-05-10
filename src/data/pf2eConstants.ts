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
  { value: 'curse',         label: 'Curse' },
  { value: 'disease',       label: 'Disease' },
];

// ── Damage types ──────────────────────────────────────────────────────────────

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'electricity', 'fire', 'force',
  'mental', 'negative', 'piercing', 'poison', 'positive', 'slashing', 'sonic',
  'bleed', 'chaotic', 'evil', 'good', 'lawful', 'void', 'vitality',
  'cold iron', 'silver', 'adamantine', 'magical',
  'disease', 'death effects', 'doomed', 'drained', 'fatigued',
  'paralyzed', 'petrified', 'poison', 'sleep', 'unconscious',
];
