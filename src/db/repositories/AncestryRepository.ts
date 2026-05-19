import { db } from '../db';
import type { AncestryRecord } from '../schema';
import type { IAncestryRepository } from './IAncestryRepository';

export class AncestryRepository implements IAncestryRepository {
  async getAll(): Promise<AncestryRecord[]> {
    return db.ancestries.toArray();
  }

  async get(id: string): Promise<AncestryRecord | undefined> {
    return db.ancestries.get(id);
  }

  async getBySlug(slug: string): Promise<AncestryRecord | undefined> {
    return db.ancestries.where('slug').equals(slug).first();
  }

  async bulkPut(records: AncestryRecord[]): Promise<void> {
    await db.ancestries.bulkPut(records);
  }

  async count(): Promise<number> {
    return db.ancestries.count();
  }

  async clear(): Promise<void> {
    await db.ancestries.clear();
  }
}

/** Singleton Dexie-backed ancestry repository. */
export const ancestryRepository = new AncestryRepository();
