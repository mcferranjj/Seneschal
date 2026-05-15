const GITHUB_API = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com/mcferranjj/pf2e-for-seneschal';
const REPO = 'mcferranjj/pf2e-for-seneschal';
const PACKS_SUBPATH = 'packs/pf2e';

const API_TIMEOUT_MS = 30_000;
const RAW_TIMEOUT_MS = 20_000;

export interface TreeEntry {
  path: string;
  sha: string;
  type: 'blob' | 'tree';
  size?: number;
}

export class GithubError extends Error {
  status: number;
  rateLimitResetsAt: Date | null;
  constructor(status: number, message: string, rateLimitResetsAt: Date | null = null) {
    super(message);
    this.name = 'GithubError';
    this.status = status;
    this.rateLimitResetsAt = rateLimitResetsAt;
  }
  get isRateLimit() {
    return this.status === 403 || this.status === 429;
  }
}

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined;

async function githubGet<T>(url: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(url, {
    headers,
    signal: withTimeout(API_TIMEOUT_MS),
  });
  if (!res.ok) {
    const resetHeader = res.headers.get('X-RateLimit-Reset');
    const resetsAt = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000) : null;
    const text = await res.text().catch(() => '');
    throw new GithubError(res.status, text, resetsAt);
  }
  return res.json() as Promise<T>;
}

export async function fetchLatestCommitSha(): Promise<string> {
  const commits = await githubGet<Array<{ sha: string }>>(
    `${GITHUB_API}/repos/${REPO}/commits?path=${PACKS_SUBPATH}&per_page=1`,
  );
  if (!commits.length) throw new Error('No commits found');
  return commits[0].sha;
}

/**
 * Fetch all files under packs/pf2e using the Git Trees API.
 * 2 API calls total instead of one per pack directory (~90).
 *
 * Returns entries with paths relative to packs/pf2e/,
 * e.g. "pathfinder-bestiary/goblin-warrior.json"
 */
export async function fetchPf2eTree(): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  // Call 1: get the tree SHA for the packs/pf2e directory
  type ContentsEntry = { name: string; sha: string; type: string };
  const packsContents = await githubGet<ContentsEntry[]>(
    `${GITHUB_API}/repos/${REPO}/contents/packs`,
  );
  const pf2eEntry = packsContents.find(e => e.name === 'pf2e' && e.type === 'dir');
  if (!pf2eEntry) throw new Error('Could not find packs/pf2e directory in repo');

  // Call 2: fetch the full recursive tree for that directory
  const tree = await githubGet<{ tree: TreeEntry[]; truncated: boolean }>(
    `${GITHUB_API}/repos/${REPO}/git/trees/${pf2eEntry.sha}?recursive=1`,
  );

  return { entries: tree.tree, truncated: tree.truncated };
}

/**
 * Fetch a creature JSON file from raw.githubusercontent.com using a stable commit SHA.
 * raw.githubusercontent.com is a CDN with no rate limit.
 */
export async function fetchCreatureRaw(commitSha: string, relativePath: string): Promise<unknown> {
  const url = `${RAW_BASE}/${commitSha}/${PACKS_SUBPATH}/${relativePath}`;
  const res = await fetch(url, { signal: withTimeout(RAW_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.json();
}

/**
 * Fetch trait descriptions from the PF2e system's en.json lang file.
 * Extracts all TraitDescription* keys and returns a map of
 * lowercase trait name → description string.
 */
export async function fetchTraitDescriptions(commitSha: string): Promise<Record<string, string>> {
  const url = `${RAW_BASE}/${commitSha}/static/lang/en.json`;
  const res = await fetch(url, { signal: withTimeout(RAW_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  const data = await res.json() as { PF2E?: Record<string, string> };
  const pf2e = data?.PF2E ?? {};
  const result: Record<string, string> = {};
  const PREFIX = 'TraitDescription';
  for (const [key, value] of Object.entries(pf2e)) {
    if (key.startsWith(PREFIX) && typeof value === 'string') {
      // e.g. "TraitDescriptionAgile" → "agile"
      const traitName = key.slice(PREFIX.length).toLowerCase();
      result[traitName] = value;
    }
  }
  return result;
}
