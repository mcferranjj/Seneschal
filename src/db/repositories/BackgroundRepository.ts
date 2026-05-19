import { db } from '../db';
import type { BackgroundRecord } from '../schema';
import type { IBackgroundRepository } from './IBackgroundRepository';

export class BackgroundRepository implements IBackgroundRepository {
  async getAll(): Promise<BackgroundRecord[]> {
    return db.backgrounds.toArray();
  }

  async get(id: string): Promise<BackgroundRecord | undefined> {
    return db.backgrounds.get(id);
  }

  async search(query: string): Promise<BackgroundRecord[]> {
    const q = query.toLowerCase();
    const all = await db.backgrounds.toArray();
    return all.filter(r => r.nameLower.includes(q));
  }

  async bulkPut(records: BackgroundRecord[]): Promise<void> {
    await db.backgrounds.bulkPut(records);
  }

  async clear(): Promise<void> {
    await db.backgrounds.clear();
  }

  async count(): Promise<number> {
    return db.backgrounds.count();
  }
}

/** Singleton Dexie-backed background repository. */
export const backgroundRepository = new BackgroundRepository();
