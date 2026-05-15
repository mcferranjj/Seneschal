/**
 * CreatureRepository — Dexie implementation of ICreatureRepository
 *
 * Wraps the Dexie `creatures` table. All creature reads and writes should
 * go through this class rather than touching `db.creatures` directly.
 */

import { db } from '../db';
import type { CreatureRecord } from '../schema';
import type { SearchFilters, SearchResult } from '../../search/types';
import type { PublicationInfo } from '../../sync/publicationRegistry';
import { getPublicationMeta } from '../../sync/publicationRegistry';
import type { ICreatureRepository } from './ICreatureRepository';

export class CreatureRepository implements ICreatureRepository {
  async get(id: string): Promise<CreatureRecord | undefined> {
    return db.creatures.get(id);
  }

  async search(filters: SearchFilters): Promise<SearchResult> {
    const {
      name, traits, excludeTraits, levelMin, levelMax,
      creatureTypes, hazardTypes, sizes, rarities, publications, entityTypes,
    } = filters;

    const nameLower = name.trim().toLowerCase();
    const hasNameFilter = nameLower.length > 0;
    const hasLevelFilter = levelMin !== -1 || levelMax !== 25;
    const hasCreatureTypeFilter = creatureTypes.length > 0;
    const hasHazardTypeFilter = hazardTypes.length > 0;
    const hasSizeFilter = sizes.length > 0;
    const hasRarityFilter = rarities.length > 0;
    const hasPublicationFilter = publications.length > 0;
    const hasExcludeTraitFilter = excludeTraits.length > 0;
    const hasEntityTypeFilter = entityTypes.length > 0;

    // 'complex' is a synthetic trait derived from system.details.isComplex rather than
    // stored in the traits array on older records. Filter it separately in the .filter()
    // pass so it works correctly regardless of whether the DB has been re-synced.
    const filterComplex = traits.includes('complex');
    const filterExcludeComplex = excludeTraits.includes('complex');
    const indexableTraits = traits.filter(t => t !== 'complex');
    const hasTraitFilter = indexableTraits.length > 0;

    let collection;
    if (hasTraitFilter) {
      collection = db.creatures.where('traits').equals(indexableTraits[0]);
    } else if (hasLevelFilter) {
      collection = db.creatures.where('level').between(levelMin, levelMax, true, true);
    } else if (hasRarityFilter) {
      collection = db.creatures.where('rarity').anyOf(rarities);
    } else if (hasSizeFilter) {
      collection = db.creatures.where('size').anyOf(sizes);
    } else if (hasPublicationFilter) {
      collection = db.creatures.where('publication').anyOf(publications);
    } else {
      collection = db.creatures.toCollection();
    }

    const raw = await collection
      .filter(c => {
        if (hasNameFilter && !c.nameLower.includes(nameLower)) return false;
        if (hasTraitFilter) {
          for (const t of indexableTraits.slice(1)) {
            if (!c.traits.includes(t)) return false;
          }
        }
        // 'complex' is checked against the raw data blob so it works on un-resynced records
        const isComplex = c.entityType === 'hazard' && c.data.system?.details?.isComplex === true;
        if (filterComplex && !isComplex) return false;
        if (filterExcludeComplex && isComplex) return false;
        if (hasLevelFilter && (c.level < levelMin || c.level > levelMax)) return false;
        if (hasCreatureTypeFilter && !creatureTypes.some(t => c.traits.includes(t))) return false;
        if (hasHazardTypeFilter && !hazardTypes.some(t => c.traits.includes(t))) return false;
        if (hasSizeFilter && !sizes.includes(c.size)) return false;
        if (hasRarityFilter && !rarities.includes(c.rarity)) return false;
        if (hasPublicationFilter && !publications.includes(c.publication)) return false;
        if (hasExcludeTraitFilter && excludeTraits.filter(t => t !== 'complex').some(t => c.traits.includes(t))) return false;
        if (hasEntityTypeFilter && !entityTypes.includes(c.entityType)) return false;
        return true;
      })
      .toArray();

    const all = filters.sortBy === 'level'
      ? filters.sortDir === 'asc'
        ? raw.sort((a, b) => a.level - b.level || a.nameLower.localeCompare(b.nameLower))
        : raw.sort((a, b) => b.level - a.level || a.nameLower.localeCompare(b.nameLower))
      : filters.sortDir === 'asc'
        ? raw.sort((a, b) => a.nameLower.localeCompare(b.nameLower))
        : raw.sort((a, b) => b.nameLower.localeCompare(a.nameLower));

    return { results: all, totalCount: all.length };
  }

  async getAllTraits(): Promise<string[]> {
    const keys = await db.creatures.orderBy('traits').uniqueKeys();
    return keys as string[];
  }

  async getAllPublications(): Promise<string[]> {
    const keys = await db.creatures.orderBy('publication').uniqueKeys();
    return keys as string[];
  }

  async getAllPublicationsWithMeta(): Promise<PublicationInfo[]> {
    const names = await this.getAllPublications();
    const results: PublicationInfo[] = [];
    for (const name of names) {
      const sample = await db.creatures.where('publication').equals(name).first();
      const isRemaster = sample?.data.system.details?.publication?.remaster ?? false;
      results.push({ name, ...getPublicationMeta(name, isRemaster) });
    }
    return results;
  }

  async bulkPut(records: CreatureRecord[]): Promise<void> {
    await db.creatures.bulkPut(records);
  }

  async put(record: CreatureRecord): Promise<void> {
    await db.creatures.put(record);
  }

  async delete(id: string): Promise<void> {
    await db.creatures.delete(id);
  }

  async count(): Promise<number> {
    return db.creatures.count();
  }

  async clear(): Promise<void> {
    await db.creatures.clear();
  }
}

/** Singleton Dexie-backed creature repository. */
export const creatureRepository = new CreatureRepository();
