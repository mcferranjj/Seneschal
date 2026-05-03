import { db } from '../db/db';
import type { CreatureRecord } from '../db/schema';
import type { PF2ECreature } from '../types/pf2e';
import { fetchLatestCommitSha, fetchPf2eTree, fetchCreatureRaw, fetchTraitDescriptions, GithubError } from './github';
import { isCreaturePack } from './packList';

const META_KEY = 'sync_state';
const FETCH_CONCURRENCY = 15;

export type SyncPhase = 'idle' | 'checking' | 'listing' | 'fetching' | 'saving' | 'done' | 'error';

export interface SyncProgress {
  phase: SyncPhase;
  total?: number;
  done?: number;
  message?: string;
}

export type ProgressCallback = (progress: SyncProgress) => void;

function getLevel(creature: PF2ECreature): number {
  const lvl = creature.system?.details?.level;
  if (!lvl) return 0;
  return typeof lvl === 'object' ? lvl.value ?? 0 : (lvl as number);
}

function getSize(creature: PF2ECreature): string {
  const sz = creature.system?.traits?.size;
  if (!sz) return 'med';
  return typeof sz === 'object' ? sz.value ?? 'med' : (sz as string);
}

export function toRecord(creature: PF2ECreature, packSource: string, blobSha: string): CreatureRecord {
  return {
    id: creature._id,
    entityType: creature.type ?? 'npc',
    name: creature.name,
    nameLower: creature.name.toLowerCase(),
    level: getLevel(creature),
    traits: creature.system?.traits?.value ?? [],
    size: getSize(creature),
    rarity: creature.system?.traits?.rarity ?? 'common',
    packSource,
    blobSha,
    data: creature,
  };
}

export async function runInBatches<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let done = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async item => {
        await fn(item);
        onProgress?.(++done, items.length);
      }),
    );
  }
}

export async function runSync(onProgress?: ProgressCallback): Promise<void> {
  try {
    // --- Step 1: check if anything changed ---
    onProgress?.({ phase: 'checking' });
    const meta = await db.meta.get(META_KEY);
    const storedCommitSha = meta?.commitSha;
    const storedFileShas: Record<string, string> = meta?.fileShas ?? {};

    const latestCommitSha = await fetchLatestCommitSha();

    if (storedCommitSha === latestCommitSha) {
      // Creature data is current — but still fetch trait descriptions if missing
      // (e.g. first launch after a DB version upgrade that added the table)
      await ensureTraitDescriptions(latestCommitSha);
      onProgress?.({ phase: 'done', message: 'Up to date' });
      return;
    }

    // --- Step 2: get full file index (2 API calls via Git Trees API) ---
    onProgress?.({ phase: 'listing' });
    const { entries, truncated } = await fetchPf2eTree();

    if (truncated) {
      // Tree was truncated by GitHub (>100k entries). Shouldn't happen for
      // just the packs/pf2e subtree, but handle it rather than silently missing files.
      console.warn('GitHub tree response truncated — some files may be missing from this sync.');
    }

    type FileEntry = { packName: string; fileName: string; blobSha: string };
    const fileEntries: FileEntry[] = [];

    for (const entry of entries) {
      if (entry.type !== 'blob') continue;
      if (!entry.path.endsWith('.json')) continue;
      // Paths are relative to packs/pf2e/, so format is "pack-name/creature.json"
      const slash = entry.path.indexOf('/');
      if (slash === -1) continue; // skip any top-level files
      const packName = entry.path.slice(0, slash);
      const fileName = entry.path.slice(slash + 1);
      if (!isCreaturePack(packName)) continue;
      fileEntries.push({ packName, fileName, blobSha: entry.sha });
    }

    // --- Step 3: diff against stored SHAs ---
    const toFetch = fileEntries.filter(e => storedFileShas[`${e.packName}/${e.fileName}`] !== e.blobSha);
    const currentKeys = new Set(fileEntries.map(e => `${e.packName}/${e.fileName}`));
    const removedKeys = Object.keys(storedFileShas).filter(k => !currentKeys.has(k));

    if (toFetch.length === 0 && removedKeys.length === 0) {
      // Creature data is current — but still fetch trait descriptions if missing
      await ensureTraitDescriptions(latestCommitSha);
      await db.meta.put({ key: META_KEY, commitSha: latestCommitSha, lastSynced: Date.now(), fileShas: storedFileShas });
      onProgress?.({ phase: 'done', message: 'Up to date' });
      return;
    }

    // --- Step 4: fetch changed/new creature files from raw CDN (no rate limit) ---
    onProgress?.({ phase: 'fetching', done: 0, total: toFetch.length });
    const records: CreatureRecord[] = [];

    await runInBatches(
      toFetch,
      FETCH_CONCURRENCY,
      async ({ packName, fileName, blobSha }) => {
        try {
          const raw = (await fetchCreatureRaw(latestCommitSha, `${packName}/${fileName}`)) as PF2ECreature;
          if (raw?._id && raw?.name && (raw?.type === 'npc' || raw?.type === 'hazard')) {
            records.push(toRecord(raw, packName, blobSha));
          }
        } catch {
          // Individual file failures are skipped — don't abort the whole sync
        }
      },
      (done, total) => onProgress?.({ phase: 'fetching', done, total }),
    );

    // --- Step 5: persist ---
    onProgress?.({ phase: 'saving' });
    await db.creatures.bulkPut(records);
    await ensureTraitDescriptions(latestCommitSha);

    const newFileShas = { ...storedFileShas };
    for (const { packName, fileName, blobSha } of fileEntries) {
      newFileShas[`${packName}/${fileName}`] = blobSha;
    }
    for (const key of removedKeys) delete newFileShas[key];

    await db.meta.put({ key: META_KEY, commitSha: latestCommitSha, lastSynced: Date.now(), fileShas: newFileShas });
    onProgress?.({ phase: 'done', total: records.length });
  } catch (err) {
    let message: string;
    if (err instanceof GithubError && err.isRateLimit) {
      if (err.rateLimitResetsAt) {
        const time = err.rateLimitResetsAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        message = `GitHub rate limit reached. Resets at ${time} — retry then.`;
      } else {
        message = 'GitHub API rate limit reached (60 req/hr). Wait ~1 hour and try again.';
      }
    } else if (err instanceof Error && err.name === 'TimeoutError') {
      message = 'Request timed out. Check your connection and try again.';
    } else {
      message = `Sync failed: ${err instanceof Error ? err.message : String(err)}`;
    }
    onProgress?.({ phase: 'error', message });
    throw err;
  }
}

/**
 * Fetch and store trait descriptions if we don't already have them for this commit.
 * Silently swallows errors — trait tooltips are non-critical.
 */
async function ensureTraitDescriptions(commitSha: string): Promise<void> {
  try {
    const existing = await db.traitDescriptions.get('trait_descriptions');
    if (existing?.commitSha === commitSha) return; // already up to date
    const descriptions = await fetchTraitDescriptions(commitSha);
    await db.traitDescriptions.put({ key: 'trait_descriptions', commitSha, descriptions });
  } catch {
    // Non-critical — trait tooltips will fall back to built-in descriptions
  }
}

export async function loadTraitDescriptions(): Promise<Record<string, string>> {
  const rec = await db.traitDescriptions.get('trait_descriptions');
  return rec?.descriptions ?? {};
}

export async function getLastSynced(): Promise<number | null> {
  const meta = await db.meta.get(META_KEY);
  return meta?.lastSynced ?? null;
}

export async function getCreatureCount(): Promise<number> {
  return db.creatures.count();
}
