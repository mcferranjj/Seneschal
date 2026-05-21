import { db } from '../db';
import type { PartyMemberRecord } from '../schema';
import type { IPartyMemberRepository } from './IPartyMemberRepository';

export class PartyMemberRepository implements IPartyMemberRepository {
  async getAll(): Promise<PartyMemberRecord[]> {
    return db.partyMembers.toArray();
  }

  async getByIds(ids: string[]): Promise<PartyMemberRecord[]> {
    return db.partyMembers.where('id').anyOf(ids).toArray();
  }

  async getById(id: string): Promise<PartyMemberRecord | undefined> {
    return db.partyMembers.get(id);
  }

  async put(record: PartyMemberRecord): Promise<void> {
    await db.partyMembers.put(record);
  }

  async delete(id: string): Promise<void> {
    await db.partyMembers.delete(id);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await db.partyMembers.bulkDelete(ids);
  }
}

export const partyMemberRepository = new PartyMemberRepository();
