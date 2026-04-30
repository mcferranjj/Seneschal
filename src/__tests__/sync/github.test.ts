import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GithubError, fetchLatestCommitSha, fetchPf2eTree, fetchCreatureRaw } from '../../sync/github';

// ---------------------------------------------------------------------------
// GithubError
// ---------------------------------------------------------------------------
describe('GithubError', () => {
  it('stores status and message', () => {
    const err = new GithubError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('GithubError');
  });

  it('isRateLimit is true for 403', () => {
    expect(new GithubError(403, '').isRateLimit).toBe(true);
  });

  it('isRateLimit is true for 429', () => {
    expect(new GithubError(429, '').isRateLimit).toBe(true);
  });

  it('isRateLimit is false for other status codes', () => {
    expect(new GithubError(404, '').isRateLimit).toBe(false);
    expect(new GithubError(500, '').isRateLimit).toBe(false);
  });

  it('stores rateLimitResetsAt when provided', () => {
    const date = new Date('2026-01-01T12:00:00Z');
    const err = new GithubError(429, 'rate limited', date);
    expect(err.rateLimitResetsAt).toEqual(date);
  });

  it('rateLimitResetsAt defaults to null', () => {
    expect(new GithubError(429, '').rateLimitResetsAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(response: { ok: boolean; status?: number; json?: () => unknown; text?: () => string; headers?: Record<string, string> }) {
  const headers = new Headers(response.headers ?? {});
  const mock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: response.json ? vi.fn().mockResolvedValue(response.json()) : vi.fn(),
    text: vi.fn().mockResolvedValue(response.text ?? ''),
    headers,
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

beforeEach(() => {
  vi.stubGlobal('AbortSignal', {
    timeout: vi.fn().mockReturnValue(new AbortController().signal),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// fetchLatestCommitSha
// ---------------------------------------------------------------------------
describe('fetchLatestCommitSha', () => {
  it('returns the sha from the first commit', async () => {
    mockFetch({ ok: true, json: () => [{ sha: 'abc123' }] });
    const sha = await fetchLatestCommitSha();
    expect(sha).toBe('abc123');
  });

  it('throws when the commits array is empty', async () => {
    mockFetch({ ok: true, json: () => [] });
    await expect(fetchLatestCommitSha()).rejects.toThrow('No commits found');
  });

  it('throws GithubError on 403 (rate limit)', async () => {
    mockFetch({ ok: false, status: 403 });
    const err = await fetchLatestCommitSha().catch(e => e);
    expect(err).toBeInstanceOf(GithubError);
    expect((err as GithubError).isRateLimit).toBe(true);
  });

  it('throws GithubError on 429', async () => {
    mockFetch({ ok: false, status: 429 });
    const err = await fetchLatestCommitSha().catch(e => e);
    expect(err).toBeInstanceOf(GithubError);
    expect((err as GithubError).isRateLimit).toBe(true);
  });

  it('parses X-RateLimit-Reset header into rateLimitResetsAt', async () => {
    const resetTs = Math.floor(Date.now() / 1000) + 3600;
    mockFetch({ ok: false, status: 403, headers: { 'X-RateLimit-Reset': String(resetTs) } });
    const err = await fetchLatestCommitSha().catch(e => e) as GithubError;
    expect(err.rateLimitResetsAt).toBeInstanceOf(Date);
    expect(err.rateLimitResetsAt!.getTime()).toBe(resetTs * 1000);
  });

  it('throws GithubError on 500', async () => {
    mockFetch({ ok: false, status: 500, text: 'Internal Server Error' });
    const err = await fetchLatestCommitSha().catch(e => e);
    expect(err).toBeInstanceOf(GithubError);
    expect((err as GithubError).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// fetchPf2eTree
// ---------------------------------------------------------------------------
describe('fetchPf2eTree', () => {
  it('returns entries and truncated flag', async () => {
    const mockFetchFn = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([
          { name: 'pf2e', sha: 'tree-sha-123', type: 'dir' },
        ]),
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          tree: [{ path: 'pathfinder-bestiary/goblin.json', sha: 'file-sha', type: 'blob' }],
          truncated: false,
        }),
        headers: new Headers(),
      });
    vi.stubGlobal('fetch', mockFetchFn);

    const result = await fetchPf2eTree();
    expect(result.truncated).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].path).toBe('pathfinder-bestiary/goblin.json');
  });

  it('throws when pf2e directory is not found in packs listing', async () => {
    mockFetch({ ok: true, json: () => [{ name: 'other', sha: 'sha', type: 'dir' }] });
    await expect(fetchPf2eTree()).rejects.toThrow('Could not find packs/pf2e directory');
  });

  it('throws GithubError on API failure', async () => {
    mockFetch({ ok: false, status: 403 });
    const err = await fetchPf2eTree().catch(e => e);
    expect(err).toBeInstanceOf(GithubError);
  });
});

// ---------------------------------------------------------------------------
// fetchCreatureRaw
// ---------------------------------------------------------------------------
describe('fetchCreatureRaw', () => {
  it('returns parsed JSON on success', async () => {
    const creature = { _id: 'abc', name: 'Goblin', type: 'npc' };
    mockFetch({ ok: true, json: () => creature });
    const result = await fetchCreatureRaw('sha123', 'pathfinder-bestiary/goblin.json');
    expect(result).toEqual(creature);
  });

  it('throws on non-ok response', async () => {
    mockFetch({ ok: false, status: 404 });
    await expect(fetchCreatureRaw('sha123', 'missing.json')).rejects.toThrow('Fetch failed 404');
  });

  it('constructs URL from commitSha and relativePath', async () => {
    const fetchMock = mockFetch({ ok: true, json: () => ({}) });
    await fetchCreatureRaw('commit-abc', 'bestiary/creature.json');
    const calledUrl: string = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('commit-abc');
    expect(calledUrl).toContain('bestiary/creature.json');
    expect(calledUrl).toContain('packs/pf2e');
  });
});
