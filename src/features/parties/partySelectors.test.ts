import { describe, it, expect } from 'vitest';
import { filterOrphanCharacters, partyRowSubLabel } from './partySelectors';
import type { CharacterRecord } from '../../db/schema';

function makeChar(id: string): CharacterRecord {
  // Minimal cast — the selector only reads `id`.
  return { id } as unknown as CharacterRecord;
}

describe('filterOrphanCharacters', () => {
  it('returns all characters when no current members', () => {
    const all = [makeChar('a'), makeChar('b'), makeChar('c')];
    const orphans = filterOrphanCharacters(all, new Set());
    expect(orphans.map(c => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('excludes characters whose id is in the current-member set', () => {
    const all = [makeChar('a'), makeChar('b'), makeChar('c')];
    const orphans = filterOrphanCharacters(all, new Set(['b']));
    expect(orphans.map(c => c.id)).toEqual(['a', 'c']);
  });

  it('returns an empty array when every character is already a member', () => {
    const all = [makeChar('a'), makeChar('b')];
    const orphans = filterOrphanCharacters(all, new Set(['a', 'b']));
    expect(orphans).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const all = [makeChar('a'), makeChar('b')];
    const snapshot = [...all];
    filterOrphanCharacters(all, new Set(['a']));
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
