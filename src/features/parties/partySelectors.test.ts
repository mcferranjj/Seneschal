import { describe, it, expect } from 'vitest';
import { filterAvailableMembers, partyRowSubLabel } from './partySelectors';
import type { PartyMemberRecord } from '../../db/schema';

function makeMember(id: string): PartyMemberRecord {
  return { id } as unknown as PartyMemberRecord;
}

describe('filterAvailableMembers', () => {
  it('returns all members when no current members', () => {
    const all = [makeMember('a'), makeMember('b'), makeMember('c')];
    const available = filterAvailableMembers(all, new Set());
    expect(available.map(m => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('excludes members whose id is in the current-member set', () => {
    const all = [makeMember('a'), makeMember('b'), makeMember('c')];
    const available = filterAvailableMembers(all, new Set(['b']));
    expect(available.map(m => m.id)).toEqual(['a', 'c']);
  });

  it('returns an empty array when every member is already in the party', () => {
    const all = [makeMember('a'), makeMember('b')];
    const available = filterAvailableMembers(all, new Set(['a', 'b']));
    expect(available).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const all = [makeMember('a'), makeMember('b')];
    const snapshot = [...all];
    filterAvailableMembers(all, new Set(['a']));
    expect(all).toEqual(snapshot);
  });
});

describe('partyRowSubLabel', () => {
  it('uses singular "member" for a single member', () => {
    expect(partyRowSubLabel({ level: 3, memberIds: ['x'] })).toBe('Lvl 3 · 1 member');
  });

  it('uses plural "members" for zero or multiple members', () => {
    expect(partyRowSubLabel({ level: 1, memberIds: [] })).toBe('Lvl 1 · 0 members');
    expect(partyRowSubLabel({ level: 7, memberIds: ['a', 'b', 'c'] })).toBe('Lvl 7 · 3 members');
  });
});
