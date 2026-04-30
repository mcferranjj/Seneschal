import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';

// ---------------------------------------------------------------------------
// Dexie mock — vi.hoisted ensures these exist before vi.mock's factory runs
// ---------------------------------------------------------------------------
const dbMock = vi.hoisted(() => {
  const toArray = vi.fn();
  const filter = vi.fn(() => ({ toArray }));
  const first = vi.fn();
  const equals = vi.fn(() => ({ filter, first }));
  const anyOf = vi.fn(() => ({ filter }));
  const between = vi.fn(() => ({ filter }));
  const where = vi.fn(() => ({ equals, between, anyOf }));
  const toCollection = vi.fn(() => ({ filter }));
  const uniqueKeys = vi.fn();
  const orderBy = vi.fn(() => ({ uniqueKeys }));
  return { toArray, filter, first, equals, anyOf, between, where, toCollection, uniqueKeys, orderBy };
});

vi.mock('../../db/db', () => ({
  db: {
    creatures: {
      where: dbMock.where,
      toCollection: dbMock.toCollection,
      orderBy: dbMock.orderBy,
    },
  },
}));

import { searchCreatures, getAllTraits, getAllPackSources, getAllPackSourcesWithMeta, DEFAULT_FILTERS } from '../../search/search';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeRecord(overrides: Partial<CreatureRecord> = {}): CreatureRecord {
  return {
    id: 'id-1',
    name: 'Goblin Warrior',
    nameLower: 'goblin warrior',
    level: 1,
    traits: ['goblin', 'humanoid'],
    size: 'sm',
    rarity: 'common',
    packSource: 'pathfinder-bestiary',
    blobSha: 'sha',
    data: {} as PF2ECreature,
    ...overrides,
  };
}

const goblin = makeRecord();
const dragon = makeRecord({
  id: 'id-2',
  name: 'Ancient Red Dragon',
  nameLower: 'ancient red dragon',
  level: 20,
  traits: ['dragon', 'fire'],
  size: 'huge',
  rarity: 'rare',
  packSource: 'pathfinder-bestiary-3',
});
const troll = makeRecord({
  id: 'id-3',
  name: 'Troll',
  nameLower: 'troll',
  level: 5,
  traits: ['giant', 'humanoid'],
  size: 'lg',
  rarity: 'uncommon',
  packSource: 'npc-gallery',
});

// Wire up filter to actually run the predicate against a fixed creature list
function setupCollection(creatures: CreatureRecord[]) {
  dbMock.filter.mockImplementation((predicate: (c: CreatureRecord) => boolean) => ({
    toArray: vi.fn().mockResolvedValue(creatures.filter(predicate)),
  }));
  dbMock.equals.mockReturnValue({ filter: dbMock.filter, first: dbMock.first });
  dbMock.anyOf.mockReturnValue({ filter: dbMock.filter });
  dbMock.between.mockReturnValue({ filter: dbMock.filter });
  dbMock.where.mockReturnValue({ equals: dbMock.equals, between: dbMock.between, anyOf: dbMock.anyOf });
  dbMock.toCollection.mockReturnValue({ filter: dbMock.filter });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupCollection([goblin, dragon, troll]);
});

// ---------------------------------------------------------------------------
// DEFAULT_FILTERS
// ---------------------------------------------------------------------------
describe('DEFAULT_FILTERS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_FILTERS).toEqual({
      name: '',
      traits: [],
      levelMin: -1,
      levelMax: 25,
      sizes: [],
      rarities: [],
      packSources: [],
      sortBy: 'level',
    });
  });
});

// ---------------------------------------------------------------------------
// searchCreatures — query path selection
// ---------------------------------------------------------------------------
describe('searchCreatures — query path selection', () => {
  it('uses toCollection when no filters are active', async () => {
    await searchCreatures(DEFAULT_FILTERS);
    expect(dbMock.toCollection).toHaveBeenCalled();
    expect(dbMock.where).not.toHaveBeenCalled();
  });

  it('uses where("traits") when trait filter is active', async () => {
    await searchCreatures({ ...DEFAULT_FILTERS, traits: ['goblin'] });
    expect(dbMock.where).toHaveBeenCalledWith('traits');
    expect(dbMock.equals).toHaveBeenCalledWith('goblin');
  });

  it('uses where("level").between for level filter', async () => {
    await searchCreatures({ ...DEFAULT_FILTERS, levelMin: 1, levelMax: 5 });
    expect(dbMock.where).toHaveBeenCalledWith('level');
    expect(dbMock.between).toHaveBeenCalledWith(1, 5, true, true);
  });

  it('uses where("rarity").anyOf when only rarities is filtered', async () => {
    await searchCreatures({ ...DEFAULT_FILTERS, rarities: ['rare'] });
    expect(dbMock.where).toHaveBeenCalledWith('rarity');
    expect(dbMock.anyOf).toHaveBeenCalledWith(['rare']);
  });

  it('uses where("size").anyOf when only sizes is filtered', async () => {
    await searchCreatures({ ...DEFAULT_FILTERS, sizes: ['huge'] });
    expect(dbMock.where).toHaveBeenCalledWith('size');
    expect(dbMock.anyOf).toHaveBeenCalledWith(['huge']);
  });

  it('uses where("packSource").anyOf when only packSources is filtered', async () => {
    await searchCreatures({ ...DEFAULT_FILTERS, packSources: ['npc-gallery'] });
    expect(dbMock.where).toHaveBeenCalledWith('packSource');
    expect(dbMock.anyOf).toHaveBeenCalledWith(['npc-gallery']);
  });

  it('prefers trait filter over level filter (more selective)', async () => {
    await searchCreatures({ ...DEFAULT_FILTERS, traits: ['goblin'], levelMin: 1, levelMax: 5 });
    expect(dbMock.where).toHaveBeenCalledWith('traits');
  });
});

// ---------------------------------------------------------------------------
// searchCreatures — filter logic (predicate run against real fixture data)
// ---------------------------------------------------------------------------
describe('searchCreatures — filter logic', () => {
  it('returns all creatures with no filters', async () => {
    const { results, totalCount } = await searchCreatures(DEFAULT_FILTERS);
    expect(results).toHaveLength(3);
    expect(totalCount).toBe(3);
  });

  it('filters by name substring (case-insensitive)', async () => {
    const { results } = await searchCreatures({ ...DEFAULT_FILTERS, name: 'GOB' });
    expect(results.map(r => r.id)).toEqual(['id-1']);
  });

  it('filters by level range', async () => {
    const { results } = await searchCreatures({ ...DEFAULT_FILTERS, levelMin: 3, levelMax: 10 });
    expect(results.map(r => r.id)).toEqual(['id-3']);
  });

  it('filters by a single rarity', async () => {
    const { results } = await searchCreatures({ ...DEFAULT_FILTERS, rarities: ['rare'] });
    expect(results.map(r => r.id)).toEqual(['id-2']);
  });

  it('filters by multiple rarities', async () => {
    const { results } = await searchCreatures({ ...DEFAULT_FILTERS, rarities: ['rare', 'uncommon'] });
    expect(results.map(r => r.id)).toContain('id-2');
    expect(results.map(r => r.id)).toContain('id-3');
    expect(results.map(r => r.id)).not.toContain('id-1');
  });

  it('filters by a single size', async () => {
    const { results } = await searchCreatures({ ...DEFAULT_FILTERS, sizes: ['huge'] });
    expect(results.map(r => r.id)).toEqual(['id-2']);
  });

  it('filters by multiple sizes', async () => {
    const { results } = await searchCreatures({ ...DEFAULT_FILTERS, sizes: ['sm', 'huge'] });
    expect(results.map(r => r.id)).toContain('id-1');
    expect(results.map(r => r.id)).toContain('id-2');
    expect(results.map(r => r.id)).not.toContain('id-3');
  });

  it('filters by a single packSource', async () => {
    const { results } = await searchCreatures({ ...DEFAULT_FILTERS, packSources: ['npc-gallery'] });
    expect(results.map(r => r.id)).toEqual(['id-3']);
  });

  it('filters by multiple packSources', async () => {
    const { results } = await searchCreatures({
      ...DEFAULT_FILTERS,
      packSources: ['npc-gallery', 'pathfinder-bestiary-3'],
    });
    expect(results.map(r => r.id)).toContain('id-2');
    expect(results.map(r => r.id)).toContain('id-3');
    expect(results.map(r => r.id)).not.toContain('id-1');
  });

  it('applies multiple filters simultaneously', async () => {
    const { results } = await searchCreatures({
      ...DEFAULT_FILTERS,
      name: 'troll',
      rarities: ['uncommon'],
    });
    expect(results.map(r => r.id)).toEqual(['id-3']);
  });

  it('returns empty when nothing matches', async () => {
    const { results, totalCount } = await searchCreatures({ ...DEFAULT_FILTERS, name: 'xyzzy-no-match' });
    expect(results).toHaveLength(0);
    expect(totalCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getAllTraits
// ---------------------------------------------------------------------------
describe('getAllTraits', () => {
  it('returns unique trait keys from orderBy', async () => {
    dbMock.uniqueKeys.mockResolvedValue(['dragon', 'goblin', 'humanoid']);
    const traits = await getAllTraits();
    expect(dbMock.orderBy).toHaveBeenCalledWith('traits');
    expect(traits).toEqual(['dragon', 'goblin', 'humanoid']);
  });
});

// ---------------------------------------------------------------------------
// getAllPackSources
// ---------------------------------------------------------------------------
describe('getAllPackSources', () => {
  it('returns unique pack source keys from orderBy', async () => {
    dbMock.uniqueKeys.mockResolvedValue(['npc-gallery', 'pathfinder-bestiary']);
    const packs = await getAllPackSources();
    expect(dbMock.orderBy).toHaveBeenCalledWith('packSource');
    expect(packs).toEqual(['npc-gallery', 'pathfinder-bestiary']);
  });
});

// ---------------------------------------------------------------------------
// getAllPackSourcesWithMeta
// ---------------------------------------------------------------------------
describe('getAllPackSourcesWithMeta', () => {
  it('returns metadata for known registry packs without querying creatures', async () => {
    dbMock.uniqueKeys.mockResolvedValue(['monster-core', 'pathfinder-bestiary']);
    const result = await getAllPackSourcesWithMeta();
    expect(dbMock.first).not.toHaveBeenCalled();
    expect(result).toEqual([
      { name: 'monster-core', era: 'remaster', category: 'core' },
      { name: 'pathfinder-bestiary', era: 'legacy', category: 'core' },
    ]);
  });

  it('queries a sample creature for an unknown pack to detect era', async () => {
    dbMock.uniqueKeys.mockResolvedValue(['some-unknown-bestiary']);
    dbMock.equals.mockReturnValue({ filter: dbMock.filter, first: dbMock.first });
    dbMock.where.mockReturnValue({ equals: dbMock.equals, between: dbMock.between, anyOf: dbMock.anyOf });
    dbMock.first.mockResolvedValue({
      data: { system: { details: { publication: { remaster: true } } } },
    });
    const result = await getAllPackSourcesWithMeta();
    expect(dbMock.first).toHaveBeenCalled();
    expect(result[0].era).toBe('remaster');
    expect(result[0].category).toBe('misc'); // ends in -bestiary → misc
  });

  it('defaults unknown pack to legacy when no creature is found', async () => {
    dbMock.uniqueKeys.mockResolvedValue(['orphan-pack']);
    dbMock.equals.mockReturnValue({ filter: dbMock.filter, first: dbMock.first });
    dbMock.where.mockReturnValue({ equals: dbMock.equals, between: dbMock.between, anyOf: dbMock.anyOf });
    dbMock.first.mockResolvedValue(undefined);
    const result = await getAllPackSourcesWithMeta();
    expect(result[0].era).toBe('legacy');
  });

  it('defaults unknown pack to legacy when publication is absent', async () => {
    dbMock.uniqueKeys.mockResolvedValue(['no-pub-pack']);
    dbMock.equals.mockReturnValue({ filter: dbMock.filter, first: dbMock.first });
    dbMock.where.mockReturnValue({ equals: dbMock.equals, between: dbMock.between, anyOf: dbMock.anyOf });
    dbMock.first.mockResolvedValue({ data: { system: { details: {} } } });
    const result = await getAllPackSourcesWithMeta();
    expect(result[0].era).toBe('legacy');
  });
});
