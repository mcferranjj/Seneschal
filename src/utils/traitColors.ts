/**
 * Trait Color Utilities
 *
 * Shared color logic for creature trait badges. Previously duplicated between
 * StatblockDrawer.tsx (traitColor + rarity colors) and CreatureRow.tsx
 * (RARITY_COLORS + TRAIT_COLORS). Pure data + one pure function — no React, no DB.
 *
 * Colors are read from CSS custom properties at call time so they respond to
 * theme changes without a page reload.
 */

/** Read a CSS custom property from :root. Falls back to the provided default. */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Rarity-specific badge colors, read live from the theme. */
export function rarityColor(rarity: string): string | undefined {
  switch (rarity.toLowerCase()) {
    case 'uncommon': return cssVar('--color-trait-uncommon', '#8a6a18');
    case 'rare':     return cssVar('--color-trait-rare',     '#2a4a8a');
    case 'unique':   return cssVar('--color-trait-unique',   '#6a2a8a');
    default:         return undefined;
  }
}

/** Default trait chip color (all non-rarity traits). */
export function defaultTraitColor(): string {
  return cssVar('--color-trait-default', '#522e2c');
}

// ── Legacy named exports kept for backwards compat ────────────────────────────

/** @deprecated use rarityColor() instead */
export const RARITY_COLORS: Record<string, string> = {
  uncommon: '#8a6a18',
  rare:     '#2a4a8a',
  unique:   '#6a2a8a',
};

/** Alignment / creature-type trait badge colors (all default to the theme color). */
export const TRAIT_COLORS: Record<string, string> = {};

/**
 * Returns the background color for a trait badge.
 * Rarity traits (uncommon / rare / unique) take priority over the type colors.
 * Falls back to the theme's default trait color for all other traits.
 */
export function traitColor(trait: string, rarity: string): string {
  const t = trait.toLowerCase();
  if (t === rarity.toLowerCase()) {
    const rc = rarityColor(rarity);
    if (rc) return rc;
  }
  return defaultTraitColor();
}

/**
 * Simple variant: returns the badge background for a trait name alone
 * (no rarity context). Used in list views where rarity is handled separately.
 */
export function traitBg(trait: string): string {
  const rc = rarityColor(trait);
  return rc ?? defaultTraitColor();
}
