import type { CreatureRecord } from '../db/schema';
import { creatureRepository } from '../db/repositories/CreatureRepository';
import { db } from '../db/db';
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
  excludeTraits: string[];
  levelMin: number;
  levelMax: number;
  creatureTypes: string[];
  hazardTypes: string[]; // [] = all hazard types; ['trap'] = traps only; etc.
  sizes: string[];
  rarities: string[];
  packSources: string[];
  entityTypes: string[]; // [] = all; ['npc'] = creatures only; ['hazard'] = hazards only
  sortBy: 'name' | 'level';
  sortDir: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: SearchFilters = {
  name: '',
  traits: [],
  excludeTraits: [],
  levelMin: -1,
  levelMax: 25,
  creatureTypes: [],
  hazardTypes: [],
  sizes: [],
  rarities: [],
  packSources: [],
  entityTypes: [],
  sortBy: 'level',
  sortDir: 'desc',
};

export interface SearchResult {
  results: CreatureRecord[];
  totalCount: number;
}

export async function searchCreatures(filters: SearchFilters): Promise<SearchResult> {
  return creatureRepository.search(filters);
}

export async function getAllTraits(): Promise<string[]> {
  return creatureRepository.getAllTraits();
}

export async function getAllPackSources(): Promise<string[]> {
  return creatureRepository.getAllPackSources();
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
