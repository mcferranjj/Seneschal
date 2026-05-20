import type { PartyMemberRecord } from '../schema';

export interface IPartyMemberRepository {
  getAll(): Promise<PartyMemberRecord[]>;
  getByIds(ids: string[]): Promise<PartyMemberRecord[]>;
  getById(id: string): Promise<PartyMemberRecord | undefined>;
  put(record: PartyMemberRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
