import { db } from '../db';
import type { HeritageRecord } from '../schema';
import type { IHeritageRepository } from './IHeritageRepository';

export class HeritageRepository implements IHeritageRepository {
  async getAll(): Promise<HeritageRecord[]> {
    return db.heritages.toArray();
  }

  async getByAncestrySlug(slug: string): Promise<HeritageRecord[]> {
    return db.heritages.where('ancestrySlug').equals(slug).toArray();
  }

  async getVersatile(): Promise<HeritageRecord[]> {
    return db.heritages.where('isVersatile').equals(1).toArray();
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
