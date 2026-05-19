import { db } from '../db';
import type { HeritageRecord } from '../schema';
import type { IHeritageRepository } from './IHeritageRepository';

export class HeritageRepository implements IHeritageRepository {
  async getAll(): Promise<HeritageRecord[]> {
    return db.heritages.toArray();
  }

  async getByAncestrySlug(slug: string): Promise<HeritageRecord[]> {
    const all = await db.heritages.toArray();
    return all.filter(h => h.ancestrySlug === slug);
  }

  async getVersatile(): Promise<HeritageRecord[]> {
    const all = await db.heritages.toArray();
    return all.filter(h => h.isVersatile === true);
  }

  async bulkPut(records: HeritageRecord[]): Promise<void> {
    await db.heritages.bulkPut(records);
  }

  async clear(): Promise<void> {
    await db.heritages.clear();
  }

  async count(): Promise<number> {
    return db.heritages.count();
  }
}

/** Singleton Dexie-backed heritage repository. */
export const heritageRepository = new HeritageRepository();
