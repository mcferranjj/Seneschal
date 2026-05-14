/**
 * Trait Color Utilities
 *
 * Shared color logic for creature trait badges. Previously duplicated between
 * StatblockDrawer.tsx (traitColor + rarity colors) and CreatureRow.tsx
 * (RARITY_COLORS + TRAIT_COLORS). Pure data + one pure function — no React, no DB.
 */

/** Rarity-specific badge colors. */
export const RARITY_COLORS: Record<string, string> = {
  uncommon: '#8a6a18',
  rare: '#2a4a8a',
  unique: '#6a2a8a',
};

/** Alignment / elemental trait badge colors. */
export const TRAIT_COLORS: Record<string, string> = {
  lg: '#2255aa',
  ng: '#2255aa',
  cg: '#2255aa',
  ln: '#555',
  n: '#555',
  cn: '#555',
  le: '#aa2222',
  ne: '#aa2222',
  ce: '#aa2222',
  good: '#2255aa',
  evil: '#aa2222',
  lawful: '#555',
  chaotic: '#555',
  neutral: '#555',
  // Creature-type accent colors (used in CreatureRow)
  undead: '#6b2222',
  construct: '#4a4a5a',
  humanoid: '#6a5a3a',
  animal: '#3a5a3a',
  dragon: '#5a3a6a',
  fiend: '#6a2a4a',
  celestial: '#2a4a6a',
};

/**
 * Returns the background color for a trait badge.
 * Rarity traits (uncommon / rare / unique) take priority over the type colors.
 * Falls back to a default brown for all other traits.
 */
export function traitColor(trait: string, rarity: string): string {
  const t = trait.toLowerCase();
  if (t === rarity.toLowerCase() && RARITY_COLORS[rarity]) return RARITY_COLORS[rarity];
  return TRAIT_COLORS[t] ?? '#8b4513';
}

/**
 * Simple variant: returns the badge background for a trait name alone
 * (no rarity context). Used in list views where rarity is handled separately.
 */
export function traitBg(trait: string): string {
  return TRAIT_COLORS[trait.toLowerCase()] ?? '#6a5a3a';
}
