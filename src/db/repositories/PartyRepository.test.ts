/**
 * Contract test for IPartyRepository.
 *
 * We can't exercise the real Dexie-backed implementation in a node vitest
 * environment without pulling in fake-indexeddb. Instead we verify the
 * interface contract against an in-memory implementation — this catches
 * API drift (e.g. a method renamed on the interface but not the impl) and
 * doubles as a usable mock for component-level tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { IPartyRepository } from './IPartyRepository';
import type { PartyRecord } from '../schema';

class InMemoryPartyRepository implements IPartyRepository {
  private store = new Map<string, PartyRecord>();

  async getAll(): Promise<PartyRecord[]> {
    return Array.from(this.store.values());
  }
  async getById(id: string): Promise<PartyRecord | undefined> {
    return this.store.get(id);
  }
  async put(record: PartyRecord): Promise<void> {
    this.store.set(record.id, record);
  }
  async add(record: PartyRecord): Promise<void> {
    if (this.store.has(record.id)) throw new Error('duplicate id');
    this.store.set(record.id, record);
  }
  async update(id: string, changes: Partial<PartyRecord>): Promise<void> {
    const cur = this.store.get(id);
    if (!cur) return;
    this.store.set(id, { ...cur, ...changes });
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

function makeParty(id: string, overrides: Partial<PartyRecord> = {}): PartyRecord {
  return {
    id,
    name: `Party ${id}`,
    level: 1,
    memberIds: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('IPartyRepository contract (in-memory impl)', () => {
  let repo: IPartyRepository;
  beforeEach(() => { repo = new InMemoryPartyRepository(); });

  it('add + getById round-trips a record', async () => {
    const p = makeParty('p1', { level: 3, memberIds: ['c1', 'c2'] });
    await repo.add(p);
    const got = await repo.getById('p1');
    expect(got).toEqual(p);
  });

  it('put inserts when absent and overwrites when present', async () => {
    await repo.put(makeParty('p1', { level: 1 }));
    await repo.put(makeParty('p1', { level: 5 }));
    const got = await repo.getById('p1');
    expect(got?.level).toBe(5);
  });

  it('add rejects duplicates', async () => {
    await repo.add(makeParty('p1'));
    await expect(repo.add(makeParty('p1'))).rejects.toThrow();
  });

  it('update applies partial changes', async () => {
    await repo.add(makeParty('p1', { level: 1, memberIds: ['a'] }));
    await repo.update('p1', { level: 4 });
    const got = await repo.getById('p1');
    expect(got?.level).toBe(4);
    expect(got?.memberIds).toEqual(['a']);
  });

  it('delete removes and getById returns undefined after', async () => {
    await repo.add(makeParty('p1'));
    await repo.delete('p1');
    expect(await repo.getById('p1')).toBeUndefined();
  });

  it('getAll returns every stored record', async () => {
    await repo.add(makeParty('p1'));
    await repo.add(makeParty('p2'));
    const all = await repo.getAll();
    expect(all.map(p => p.id).sort()).toEqual(['p1', 'p2']);
  });
});
