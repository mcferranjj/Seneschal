export type PublicationEra = 'remaster' | 'legacy' | 'sf2e';
export type PublicationCategory = 'core' | 'supplemental' | 'ap' | 'adventure' | 'society' | 'misc';

export interface PublicationMeta {
  era: PublicationEra;
  category: PublicationCategory;
}

export interface PublicationInfo extends PublicationMeta {
  name: string;
}

/**
 * Maps known publication titles to their category.
 * Era is NOT stored here — it is derived from the remaster boolean in the
 * creature's own data, which is always authoritative.
 */
const CORE_TITLES = new Set([
  'Pathfinder GM Core',
  'Pathfinder Monster Core',
  'Pathfinder Monster Core 2',
  'Pathfinder NPC Core',
  'Pathfinder Player Core',
  'Pathfinder Core Rulebook',
  'Pathfinder Gamemastery Guide',
  'Pathfinder Bestiary',
  'Pathfinder Bestiary 2',
  'Pathfinder Bestiary 3',
  'Pathfinder NPC Gallery',
]);

const SUPPLEMENTAL_TITLES = new Set([
  'Pathfinder Battlecry!',
  'Pathfinder Book of the Dead',
  'Pathfinder Dark Archive',
  'Pathfinder Dark Archive (Remastered)',
  'Pathfinder Guns & Gears',
  'Pathfinder Howl of the Wild',
  'Pathfinder Rage of Elements',
  'Pathfinder War of Immortals',
  'Pathfinder Lost Omens Absalom, City of Lost Omens',
  'Pathfinder Lost Omens Character Guide',
  'Pathfinder Lost Omens Draconic Codex',
  'Pathfinder Lost Omens Hellfire Dispatches',
  'Pathfinder Lost Omens Highhelm',
  'Pathfinder Lost Omens Impossible Lands',
  'Pathfinder Lost Omens Monsters of Myth',
  'Pathfinder Lost Omens Shining Kingdoms',
  'Pathfinder Lost Omens The Grand Bazaar',
  'Pathfinder Lost Omens The Mwangi Expanse',
  'Pathfinder Lost Omens Tian Xia World Guide',
  'Pathfinder Lost Omens Travel Guide',
]);

/**
 * Derives a category from a publication title using prefix/pattern matching.
 * This handles the long tail of AP volumes, Society scenarios, etc. without
 * needing to enumerate every individual title.
 */
function inferCategory(title: string): PublicationCategory {
  if (CORE_TITLES.has(title)) return 'core';
  if (SUPPLEMENTAL_TITLES.has(title)) return 'supplemental';

  // Adventure Paths — "Pathfinder Adventure Path: X" or numbered AP volumes "Pathfinder #NNN: X"
  // Also hardcover compilations of APs
  if (title.startsWith('Pathfinder Adventure Path:')) return 'ap';
  if (/^Pathfinder #\d+:/.test(title)) return 'ap';
  if (title.endsWith('Hardcover Compilation')) return 'ap';
  if (title === 'Pathfinder Abomination Vaults Hardcover Compilation') return 'ap';
  if (title === 'Pathfinder Claws of the Tyrant') return 'ap';

  // Adventures — standalone shorter adventures
  if (title.startsWith('Pathfinder Adventure:')) return 'adventure';
  if (title.startsWith('Pathfinder Adventures:')) return 'adventure';
  if (title.startsWith('Pathfinder One-Shot #')) return 'adventure';
  if (title.startsWith('Pathfinder Beginner Box')) return 'adventure';
  if (title.startsWith('Pathfinder Free RPG Day')) return 'adventure';
  if (title.startsWith('Pathfinder Game Night:')) return 'adventure';

  // Society — scenarios, quests, bounties, specials, intros, seasons
  if (title.startsWith('Pathfinder Society')) return 'society';
  if (title.startsWith('Pathfinder Bounty #')) return 'society';

  return 'misc';
}

/**
 * Resolves the publication title from a creature's raw data.
 * The pack folder name is a last-resort fallback for malformed data.
 */
export function resolvePublicationTitle(
  publicationTitle: string | undefined,
  packFolderName: string,
): string {
  return publicationTitle ?? packFolderName;
}

/**
 * Returns era + category metadata for a publication.
 * Era is derived from the remaster boolean in the creature data — not inferred
 * from the title — so it is always correct even for unknown publications.
 */
export function getPublicationMeta(title: string, isRemaster: boolean): PublicationMeta {
  const era: PublicationEra = title === 'Custom' ? 'remaster'
    : title.startsWith('sf2e') ? 'sf2e'
    : isRemaster ? 'remaster'
    : 'legacy';

  return { era, category: inferCategory(title) };
}
