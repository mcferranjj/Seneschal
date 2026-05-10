/**
 * CharacterRepository — Dexie implementation of ICharacterRepository
 *
 * Wraps the Dexie `characters` table. All character reads and writes should
 * go through this class rather than touching `db.characters` directly.
 */

import { db } from '../db';
import type { CharacterRecord } from '../schema';
import type { ICharacterRepository } from './ICharacterRepository';

export class CharacterRepository implements ICharacterRepository {
  async getAll(): Promise<CharacterRecord[]> {
    return db.characters.toArray();
  }

  async put(record: CharacterRecord): Promise<void> {
    await db.characters.put(record);
  }

  async add(record: CharacterRecord): Promise<void> {
    await db.characters.add(record);
  }

  async update(id: string, changes: Partial<CharacterRecord>): Promise<void> {
    await db.characters.update(id, changes);
  }

  async delete(id: string): Promise<void> {
    await db.characters.delete(id);
  }
}

/** Singleton Dexie-backed character repository. */
export const characterRepository = new CharacterRepository();
