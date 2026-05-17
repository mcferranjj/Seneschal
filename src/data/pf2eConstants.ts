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
// The picker groups in DamageTypePicker.tsx are an ordered subset of this list.
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

// ── Custom creature wizard suggestions ────────────────────────────────────────

/** Weapon and material traits that appear in a strike's trait list. */
export const WEAPON_TRAITS = [
  'agile', 'backstabber', 'backswing', 'deadly', 'disarm',
  'fatal', 'finesse', 'forceful', 'free-hand', 'grapple', 'jousting',
  'modular', 'nonlethal', 'parry', 'precision', 'propulsive', 'ranged trip',
  'reach', 'shove', 'sweep', 'thrown', 'trip', 'twin', 'two-hand', 'unarmed',
  'versatile b', 'versatile p', 'versatile s', 'volley',
  'bludgeoning', 'piercing', 'slashing',
  'cold iron', 'silver', 'magical', 'adamantine', 'mithral',
];

/**
 * Generic monster abilities that can appear in a strike's damage entry.
 * Sourced from the PF2e Bestiary Ability Glossary.
 */
export const STRIKE_ABILITY_SUGGESTIONS = [
  'Grab', 'Improved Grab',
  'Knockdown', 'Improved Knockdown',
  'Push', 'Improved Push',
  'Pull',
];

/** Common creature senses for autocomplete. */
export const COMMON_SENSES = [
  'low-light vision', 'darkvision', 'greater darkvision',
  'scent', 'tremorsense', 'echolocation', 'motion sense', 'lifesense',
];

/** Official PF2e skills for autocomplete. */
export const OFFICIAL_SKILLS = [
  'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception', 'Diplomacy',
  'Intimidation', 'Medicine', 'Nature', 'Occultism', 'Performance', 'Religion',
  'Society', 'Stealth', 'Survival', 'Thievery',
];

/** Common languages for autocomplete. */
export const LANGUAGE_SUGGESTIONS = [
  'Common', 'Draconic', 'Dwarven', 'Elven', 'Fey', 'Gnomish', 'Goblin', 'Halfling',
  'Jotun', 'Orcish', 'Sakvroth',
  'Aklo', 'Chthonian', 'Diabolic', 'Empyrean', 'Kholo', 'Necril', 'Petran', 'Pyric',
  'Shadowtongue', 'Sussuran', 'Thalassic', 'Muan', 'Talican',
];
