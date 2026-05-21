/**
 * Trait Color Utilities
 *
 * Shared color logic for creature trait badges. Previously duplicated between
 * StatblockDrawer.tsx (traitColor + rarity colors) and CreatureRow.tsx
 * (RARITY_COLORS + TRAIT_COLORS). Pure data + one pure function — no React, no DB.
 *
 * Colors are returned as CSS `var(--color-trait-*)` references so that the browser
 * resolves them at paint time. This means trait badge colors update instantly
 * whenever the theme CSS variables change — no React re-render required.
 */

/** Rarity-specific badge colors as CSS var references. */
export function rarityColor(rarity: string): string | undefined {
  switch (rarity.toLowerCase()) {
    case 'uncommon': return 'var(--color-trait-uncommon)';
    case 'rare':     return 'var(--color-trait-rare)';
    case 'unique':   return 'var(--color-trait-unique)';
    default:         return undefined;
  }
}

/** Default trait chip color as a CSS var reference. */
export function defaultTraitColor(): string {
  return 'var(--color-trait-default)';
}

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
