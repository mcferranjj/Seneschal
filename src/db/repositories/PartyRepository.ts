/**
 * PartyRepository — Dexie implementation of IPartyRepository
 *
 * Wraps the Dexie `parties` table. All party reads and writes should
 * go through this class rather than touching `db.parties` directly.
 */

import { db } from '../db';
import type { PartyRecord } from '../schema';
import type { IPartyRepository } from './IPartyRepository';

export class PartyRepository implements IPartyRepository {
  async getAll(): Promise<PartyRecord[]> {
    return db.parties.toArray();
  }

  async getById(id: string): Promise<PartyRecord | undefined> {
    return db.parties.get(id);
  }

  async put(record: PartyRecord): Promise<void> {
    await db.parties.put(record);
  }

  async add(record: PartyRecord): Promise<void> {
    await db.parties.add(record);
  }

  async update(id: string, changes: Partial<PartyRecord>): Promise<void> {
    await db.parties.update(id, changes);
  }

  async delete(id: string): Promise<void> {
    await db.parties.delete(id);
  }
}

/** Singleton Dexie-backed party repository. */
export const partyRepository = new PartyRepository();
