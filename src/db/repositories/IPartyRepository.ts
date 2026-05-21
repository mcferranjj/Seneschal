/**
 * IPartyRepository
 *
 * Blind interface for party persistence. Production uses Dexie/IndexedDB;
 * tests can inject a mock without touching a real database.
 */

import type { PartyRecord } from '../schema';

export interface IPartyRepository {
  getAll(): Promise<PartyRecord[]>;
  getById(id: string): Promise<PartyRecord | undefined>;
  put(record: PartyRecord): Promise<void>;
  add(record: PartyRecord): Promise<void>;
  update(id: string, changes: Partial<PartyRecord>): Promise<void>;
  delete(id: string): Promise<void>;
}
