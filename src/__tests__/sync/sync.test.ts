import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PF2ECreature } from '../../types/pf2e';
import { toRecord, runInBatches, runSync } from '../../sync/sync';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../db/db', () => ({
  db: {
    meta: {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    },
    creatures: {
      bulkPut: vi.fn().mockResolvedValue(undefined),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock('../../sync/github', () => ({
  fetchLatestCommitSha: vi.fn(),
  fetchPf2eTree: vi.fn(),
  fetchCreatureRaw: vi.fn(),
  GithubError: class GithubError extends Error {
    status: number;
    rateLimitResetsAt: null;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'GithubError';
      this.status = status;
      this.rateLimitResetsAt = null;
    }
    get isRateLimit() { return this.status === 403 || this.status === 429; }
  },
}));

vi.mock('../../sync/packList', () => ({
  isCreaturePack: vi.fn().mockReturnValue(true),
}));

import { db } from '../../db/db';
import { fetchLatestCommitSha, fetchPf2eTree, fetchCreatureRaw } from '../../sync/github';

const mockFetchLatestCommitSha = vi.mocked(fetchLatestCommitSha);
const mockFetchPf2eTree = vi.mocked(fetchPf2eTree);
const mockFetchCreatureRaw = vi.mocked(fetchCreatureRaw);
const mockMetaGet = vi.mocked(db.meta.get);
const mockMetaPut = vi.mocked(db.meta.put);
const mockBulkPut = vi.mocked(db.creatures.bulkPut);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCreature(overrides: Partial<PF2ECreature> = {}): PF2ECreature {
  return {
    _id: 'creature-1',
    name: 'Goblin Warrior',
    type: 'npc',
    items: [],
    system: {
      details: { level: { value: 1 } },
      traits: { size: { value: 'sm' }, value: ['goblin', 'humanoid'], rarity: 'common' },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// toRecord
// ---------------------------------------------------------------------------
describe('toRecord', () => {
  it('maps creature fields to CreatureRecord', () => {
    const creature = makeCreature();
    const record = toRecord(creature, 'pathfinder-bestiary', 'sha-abc');
    expect(record.id).toBe('creature-1');
    expect(record.name).toBe('Goblin Warrior');
    expect(record.nameLower).toBe('goblin warrior');
    expect(record.level).toBe(1);
    expect(record.size).toBe('sm');
    expect(record.rarity).toBe('common');
    expect(record.traits).toEqual(['goblin', 'humanoid']);
    expect(record.packSource).toBe('pathfinder-bestiary');
    expect(record.blobSha).toBe('sha-abc');
    expect(record.data).toBe(creature);
  });

  it('defaults level to 0 when missing', () => {
    const creature = makeCreature({ system: {} });
    expect(toRecord(creature, 'pack', 'sha').level).toBe(0);
  });

  it('defaults size to "med" when missing', () => {
    const creature = makeCreature({ system: {} });
    expect(toRecord(creature, 'pack', 'sha').size).toBe('med');
  });

  it('defaults traits to empty array when missing', () => {
    const creature = makeCreature({ system: {} });
    expect(toRecord(creature, 'pack', 'sha').traits).toEqual([]);
  });

  it('defaults rarity to "common" when missing', () => {
    const creature = makeCreature({ system: {} });
    expect(toRecord(creature, 'pack', 'sha').rarity).toBe('common');
  });

  it('lowercases name for nameLower', () => {
    const creature = makeCreature({ name: 'Ancient RED Dragon' });
    expect(toRecord(creature, 'pack', 'sha').nameLower).toBe('ancient red dragon');
  });
});

// ---------------------------------------------------------------------------
// runInBatches
// ---------------------------------------------------------------------------
describe('runInBatches', () => {
  it('processes all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const processed: number[] = [];
    await runInBatches(items, 2, async item => { processed.push(item); });
    expect(processed.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles empty items array', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    await runInBatches([], 5, fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls onProgress after each item', async () => {
    const items = ['a', 'b', 'c'];
    const progressCalls: Array<[number, number]> = [];
    await runInBatches(items, 10, async () => {}, (done, total) => {
      progressCalls.push([done, total]);
    });
    expect(progressCalls).toHaveLength(3);
    expect(progressCalls.every(([, total]) => total === 3)).toBe(true);
    const doneValues = progressCalls.map(([done]) => done).sort();
    expect(doneValues).toEqual([1, 2, 3]);
  });

  it('processes items in batches respecting concurrency', async () => {
    const items = [1, 2, 3, 4, 5];
    const concurrent: number[] = [];
    let maxConcurrent = 0;

    await runInBatches(items, 2, async item => {
      concurrent.push(item);
      maxConcurrent = Math.max(maxConcurrent, concurrent.length);
      await new Promise(r => setTimeout(r, 1));
      concurrent.splice(concurrent.indexOf(item), 1);
    });

    // Within each batch of 2, at most 2 run simultaneously
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// runSync
// ---------------------------------------------------------------------------
describe('runSync', () => {
  it('reports done immediately when commit SHA is unchanged', async () => {
    mockMetaGet.mockResolvedValue({ key: 'sync_state', commitSha: 'same-sha', lastSynced: 0, fileShas: {} });
    mockFetchLatestCommitSha.mockResolvedValue('same-sha');

    const phases: string[] = [];
    await runSync(p => phases.push(p.phase));

    expect(phases).toContain('checking');
    expect(phases).toContain('done');
    expect(mockFetchPf2eTree).not.toHaveBeenCalled();
  });

  it('fetches tree and syncs when SHA changes', async () => {
    mockMetaGet.mockResolvedValue({ key: 'sync_state', commitSha: 'old-sha', lastSynced: 0, fileShas: {} });
    mockFetchLatestCommitSha.mockResolvedValue('new-sha');
    mockFetchPf2eTree.mockResolvedValue({
      entries: [
        { path: 'pathfinder-bestiary/goblin.json', sha: 'file-sha-1', type: 'blob' },
      ],
      truncated: false,
    });
    const creature = makeCreature();
    mockFetchCreatureRaw.mockResolvedValue(creature);

    const phases: string[] = [];
    await runSync(p => phases.push(p.phase));

    expect(phases).toContain('listing');
    expect(phases).toContain('fetching');
    expect(phases).toContain('saving');
    expect(phases).toContain('done');
    expect(mockBulkPut).toHaveBeenCalledOnce();
    expect(mockMetaPut).toHaveBeenCalledWith(expect.objectContaining({ commitSha: 'new-sha' }));
  });

  it('skips non-npc creatures', async () => {
    mockMetaGet.mockResolvedValue({ key: 'sync_state', commitSha: 'old-sha', lastSynced: 0, fileShas: {} });
    mockFetchLatestCommitSha.mockResolvedValue('new-sha');
    mockFetchPf2eTree.mockResolvedValue({
      entries: [{ path: 'pack/character.json', sha: 'sha1', type: 'blob' }],
      truncated: false,
    });
    mockFetchCreatureRaw.mockResolvedValue({ _id: 'x', name: 'Hero', type: 'character', items: [], system: {} });

    await runSync();

    const bulkPutArg = mockBulkPut.mock.calls[0][0] as unknown[];
    expect(bulkPutArg).toHaveLength(0);
  });

  it('skips files whose SHA matches stored value (incremental sync)', async () => {
    mockMetaGet.mockResolvedValue({
      key: 'sync_state',
      commitSha: 'old-sha',
      lastSynced: 0,
      fileShas: { 'pack/creature.json': 'same-file-sha' },
    });
    mockFetchLatestCommitSha.mockResolvedValue('new-sha');
    mockFetchPf2eTree.mockResolvedValue({
      entries: [{ path: 'pack/creature.json', sha: 'same-file-sha', type: 'blob' }],
      truncated: false,
    });

    await runSync();

    expect(mockFetchCreatureRaw).not.toHaveBeenCalled();
  });

  it('reports error phase on failure and re-throws', async () => {
    mockMetaGet.mockResolvedValue(undefined);
    mockFetchLatestCommitSha.mockRejectedValue(new Error('Network error'));

    const phases: string[] = [];
    await expect(runSync(p => phases.push(p.phase))).rejects.toThrow('Network error');
    expect(phases).toContain('error');
  });

  it('works when there is no prior sync state (first sync)', async () => {
    mockMetaGet.mockResolvedValue(undefined);
    mockFetchLatestCommitSha.mockResolvedValue('first-sha');
    mockFetchPf2eTree.mockResolvedValue({
      entries: [{ path: 'bestiary/goblin.json', sha: 'sha1', type: 'blob' }],
      truncated: false,
    });
    mockFetchCreatureRaw.mockResolvedValue(makeCreature());

    await runSync();

    expect(mockBulkPut).toHaveBeenCalledOnce();
    expect(mockMetaPut).toHaveBeenCalledWith(expect.objectContaining({ commitSha: 'first-sha' }));
  });
});
