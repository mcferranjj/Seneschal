import { db } from '../db';
import type { FeatRecord, FeatCategory } from '../schema';
import type { IFeatRepository } from './IFeatRepository';

export class FeatRepository implements IFeatRepository {
  async getAll(): Promise<FeatRecord[]> {
    return db.feats.toArray();
  }

  async get(id: string): Promise<FeatRecord | undefined> {
    return db.feats.get(id);
  }

  async getByCategory(category: FeatCategory, maxLevel?: number): Promise<FeatRecord[]> {
    const records = await db.feats.where('category').equals(category).toArray();
    if (maxLevel !== undefined) {
      return records.filter(r => r.level <= maxLevel);
    }
    return records;
  }

  async getByAncestrySlug(slug: string, maxLevel?: number): Promise<FeatRecord[]> {
    const records = await db.feats.where('traits').equals(slug).toArray();
    return records.filter(r => {
      if (r.category !== 'ancestry') return false;
      if (maxLevel !== undefined && r.level > maxLevel) return false;
      return true;
    });
  }

  async getByClassSlug(slug: string, maxLevel?: number): Promise<FeatRecord[]> {
    const records = await db.feats.where('traits').equals(slug).toArray();
    return records.filter(r => {
      if (r.category !== 'class') return false;
      if (maxLevel !== undefined && r.level > maxLevel) return false;
      return true;
    });
  }

  async getSkillFeats(maxLevel?: number): Promise<FeatRecord[]> {
    return this.getByCategory('skill', maxLevel);
  }

  async getGeneralFeats(maxLevel?: number): Promise<FeatRecord[]> {
    return this.getByCategory('general', maxLevel);
  }

  async bulkPut(records: FeatRecord[]): Promise<void> {
    await db.feats.bulkPut(records);
  }

  async clear(): Promise<void> {
    await db.feats.clear();
  }

  async count(): Promise<number> {
    return db.feats.count();
  }
}

/** Singleton Dexie-backed feat repository. */
export const featRepository = new FeatRepository();
