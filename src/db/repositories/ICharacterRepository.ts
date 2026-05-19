/**
 * ICharacterRepository
 *
 * Blind interface for character persistence. Production uses Dexie/IndexedDB;
 * tests can inject a mock without touching a real database.
 */

import type { CharacterRecord } from '../schema';

export interface ICharacterRepository {
  getAll(): Promise<CharacterRecord[]>;
  getById(id: string): Promise<CharacterRecord | undefined>;
  put(record: CharacterRecord): Promise<void>;
  add(record: CharacterRecord): Promise<void>;
  update(id: string, changes: Partial<CharacterRecord>): Promise<void>;
  delete(id: string): Promise<void>;
}
