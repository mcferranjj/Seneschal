export const RARITY_ORDER = ['common', 'uncommon', 'rare'] as const;

export function groupByRarity<T extends { rarity: string }>(
  items: T[]
): { rarity: string; items: T[] }[] {
  return RARITY_ORDER.map(rarity => ({
    rarity,
    items: items.filter(item => item.rarity === rarity),
  })).filter(g => g.items.length > 0);
}
