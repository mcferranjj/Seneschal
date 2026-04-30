import { db } from '../db/db';
import type { CreatureRecord } from '../db/schema';
import { getPackMeta, packRegistryHas } from '../sync/packList';
import type { PackEra, PackCategory } from '../sync/packList';

export interface PackSourceInfo {
  name: string;
  era: PackEra;
  category: PackCategory;
}

export interface SearchFilters {
  name: string;
  traits: string[];
  levelMin: number;
  levelMax: number;
  creatureTypes: string[];
  sizes: string[];
  rarities: string[];
  packSources: string[];
  sortBy: 'name' | 'level';
}

export const DEFAULT_FILTERS: SearchFilters = {
  name: '',
  traits: [],
  levelMin: -1,
  levelMax: 25,
  creatureTypes: [],
  sizes: [],
  rarities: [],
  packSources: [],
  sortBy: 'level',
};

export interface SearchResult {
  results: CreatureRecord[];
  totalCount: number;
}

export async function searchCreatures(filters: SearchFilters): Promise<SearchResult> {
  const { name, traits, levelMin, levelMax, creatureTypes, sizes, rarities, packSources } = filters;
  const nameLower = name.trim().toLowerCase();
  const hasNameFilter = nameLower.length > 0;
  const hasLevelFilter = levelMin !== -1 || levelMax !== 25;
  const hasCreatureTypeFilter = creatureTypes.length > 0;
  const hasSizeFilter = sizes.length > 0;
  const hasRarityFilter = rarities.length > 0;
  const hasPackFilter = packSources.length > 0;
  const hasTraitFilter = traits.length > 0;

  // Choose the most selective indexed query to start from
  let collection;
  if (hasTraitFilter) {
    collection = db.creatures.where('traits').equals(traits[0]);
  } else if (hasLevelFilter) {
    collection = db.creatures.where('level').between(levelMin, levelMax, true, true);
  } else if (hasRarityFilter) {
    collection = db.creatures.where('rarity').anyOf(rarities);
  } else if (hasSizeFilter) {
    collection = db.creatures.where('size').anyOf(sizes);
  } else if (hasPackFilter) {
    collection = db.creatures.where('packSource').anyOf(packSources);
  } else {
    collection = db.creatures.toCollection();
  }

  const raw = await collection
    .filter(c => {
      if (hasNameFilter && !c.nameLower.includes(nameLower)) return false;
      // Additional traits beyond the first (which was used as index)
      if (hasTraitFilter) {
        for (const t of traits.slice(1)) {
          if (!c.traits.includes(t)) return false;
        }
      }
      if (hasLevelFilter && (c.level < levelMin || c.level > levelMax)) return false;
      if (hasCreatureTypeFilter && !creatureTypes.some(t => c.traits.includes(t))) return false;
      if (hasSizeFilter && !sizes.includes(c.size)) return false;
      if (hasRarityFilter && !rarities.includes(c.rarity)) return false;
      if (hasPackFilter && !packSources.includes(c.packSource)) return false;
      return true;
    })
    .toArray();

  const all = filters.sortBy === 'level'
    ? raw.sort((a, b) => a.level - b.level || a.nameLower.localeCompare(b.nameLower))
    : raw.sort((a, b) => a.nameLower.localeCompare(b.nameLower));

  return { results: all, totalCount: all.length };
}

export async function getAllTraits(): Promise<string[]> {
  const keys = await db.creatures.orderBy('traits').uniqueKeys();
  return keys as string[];
}

export async function getAllPackSources(): Promise<string[]> {
  const keys = await db.creatures.orderBy('packSource').uniqueKeys();
  return keys as string[];
}

export async function getAllPackSourcesWithMeta(): Promise<PackSourceInfo[]> {
  const names = (await db.creatures.orderBy('packSource').uniqueKeys()) as string[];
  const results: PackSourceInfo[] = [];
  for (const name of names) {
    if (packRegistryHas(name)) {
      results.push({ name, ...getPackMeta(name) });
    } else {
      const sample = await db.creatures.where('packSource').equals(name).first();
      const isRemaster = sample?.data.system.details?.publication?.remaster ?? false;
      results.push({ name, ...getPackMeta(name, isRemaster) });
    }
  }
  return results;
}
