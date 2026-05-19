import { db } from '../db/db';
import { fetchLatestCommitSha, fetchPf2eTree, fetchCreatureRaw, GithubError } from './github';
import { runInBatches } from '../utils/async';
import { ancestryRepository } from '../db/repositories/AncestryRepository';
import { heritageRepository } from '../db/repositories/HeritageRepository';
import { backgroundRepository } from '../db/repositories/BackgroundRepository';
import { classRepository } from '../db/repositories/ClassRepository';
import { featRepository } from '../db/repositories/FeatRepository';
import type { SyncPhase, SyncProgress, ProgressCallback } from './sync';
import type {
  AncestryRecord,
  HeritageRecord,
  BackgroundRecord,
  ClassRecord,
  FeatRecord,
  AbilityKey,
  BackgroundBoostOption,
} from '../db/schema';

export type { SyncPhase, SyncProgress, ProgressCallback };

const META_KEY = 'char_builder_sync_state';
const FETCH_CONCURRENCY = 15;

// Prefixes (relative to packs/pf2e/) that we want to sync
const INCLUDED_PREFIXES = [
  'ancestries/',
  'heritages/',
  'backgrounds/',
  'classes/',
  'feats/ancestry/',
  'feats/class/',
  'feats/general/',
  'feats/skill/',
];

// ── Shared helpers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveSlug(raw: any): string {
  return raw.system?.slug ?? (raw.name as string | undefined)?.toLowerCase().replace(/\s+/g, '-') ?? (raw._id as string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRemaster(raw: any): boolean {
  return raw?.system?.publication?.remaster === true;
}

// ── Transform functions ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAncestryRecord(raw: any, blobSha: string): AncestryRecord | null {
  if (raw?.type !== 'ancestry') return null;

  const boostsRaw: Record<string, { value: string[] }> = raw.system.boosts ?? {};
  const fixed: AbilityKey[][] = [];
  let freeCount = 0;

  for (const entry of Object.values(boostsRaw)) {
    const vals = entry.value ?? [];
    if (vals.length === 1) {
      fixed.push([vals[0] as AbilityKey]);
    } else if (vals.length === 6) {
      freeCount++;
    }
    // length === 0: skip placeholder
  }

  const flawRaw: Record<string, { value: string[] }> = raw.system.flaws ?? {};
  const flaw = (flawRaw?.['0']?.value?.[0] ?? null) as AbilityKey | null;

  const itemsRaw: Record<string, { name: string; uuid: string }> = raw.system.items ?? {};
  const grantedItems = Object.values(itemsRaw).map(i => ({ name: i.name, uuid: i.uuid }));

  return {
    id: raw._id,
    name: raw.name,
    nameLower: raw.name.toLowerCase(),
    slug: deriveSlug(raw),
    hp: raw.system.hp ?? 0,
    speed: raw.system.speed ?? 25,
    size: raw.system.size ?? 'med',
    reach: raw.system.reach ?? 5,
    vision: raw.system.vision ?? 'normal',
    traits: raw.system.traits?.value ?? [],
    rarity: raw.system.traits?.rarity ?? 'common',
    boosts: { fixed, freeCount, flaw },
    languages: raw.system.languages?.value ?? [],
    additionalLanguages: {
      count: raw.system.additionalLanguages?.count ?? 0,
      options: raw.system.additionalLanguages?.value ?? [],
    },
    grantedItems,
    publication: raw.system.publication?.title ?? '',
    remaster: isRemaster(raw),
    blobSha,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toHeritageRecord(raw: any, blobSha: string): HeritageRecord | null {
  if (raw?.type !== 'heritage') return null;

  const ancestryRef = raw.system.ancestry ?? null;
  const ancestrySlug = ancestryRef?.slug ?? null;
  const isVersatile = ancestryRef === null;

  return {
    id: raw._id,
    name: raw.name,
    nameLower: raw.name.toLowerCase(),
    slug: deriveSlug(raw),
    ancestrySlug,
    isVersatile,
    versatileAncestrySlug: null, // parsing rules engine is deferred
    description: raw.system.description?.value ?? '',
    traits: raw.system.traits?.value ?? [],
    rarity: raw.system.traits?.rarity ?? 'common',
    publication: raw.system.publication?.title ?? '',
    remaster: isRemaster(raw),
    blobSha,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBackgroundRecord(raw: any, blobSha: string): BackgroundRecord | null {
  if (raw?.type !== 'background') return null;

  const boostsRaw: Record<string, { value?: string[] }> = raw.system.boosts ?? {};
  let freeBoostCount = 0;
  const constrainedOptions: BackgroundBoostOption[] = [];
  for (const entry of Object.values(boostsRaw)) {
    const vals = (entry.value ?? []) as AbilityKey[];
    if (vals.length === 0) continue;
    if (vals.length === 6) {
      freeBoostCount++;
    } else {
      constrainedOptions.push({ choices: vals });
    }
  }

  const itemsRaw: Record<string, { name: string; uuid: string }> = raw.system.items ?? {};
  const itemValues = Object.values(itemsRaw);
  const grantedFeat = itemValues.length > 0
    ? { name: itemValues[0].name, uuid: itemValues[0].uuid }
    : null;

  return {
    id: raw._id,
    name: raw.name,
    nameLower: raw.name.toLowerCase(),
    slug: deriveSlug(raw),
    boostOptions: constrainedOptions,
    freeBoostCount,
    trainedSkills: raw.system.trainedSkills?.value ?? [],
    trainedLoreSkills: raw.system.trainedSkills?.lore ?? [],
    grantedFeat,
    description: raw.system.description?.value ?? '',
    traits: raw.system.traits?.value ?? [],
    rarity: raw.system.traits?.rarity ?? 'common',
    publication: raw.system.publication?.title ?? '',
    remaster: isRemaster(raw),
    blobSha,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toClassRecord(raw: any, blobSha: string): ClassRecord | null {
  if (raw?.type !== 'class') return null;

  const itemsRaw: Record<string, { name: string; uuid: string; level?: number }> = raw.system.items ?? {};
  const features = Object.values(itemsRaw)
    .map(i => ({ level: i.level ?? 1, name: i.name, uuid: i.uuid }))
    .sort((a, b) => a.level - b.level);

  return {
    id: raw._id,
    name: raw.name,
    nameLower: raw.name.toLowerCase(),
    slug: deriveSlug(raw),
    hp: raw.system.hp ?? 0,
    keyAbilityOptions: (raw.system.keyAbility?.value ?? []) as AbilityKey[],
    perception: raw.system.perception ?? 1,
    savingThrows: {
      fortitude: raw.system.savingThrows?.fortitude ?? 1,
      reflex: raw.system.savingThrows?.reflex ?? 1,
      will: raw.system.savingThrows?.will ?? 1,
    },
    attacks: {
      simple: raw.system.attacks?.simple ?? 1,
      martial: raw.system.attacks?.martial ?? 0,
      advanced: raw.system.attacks?.advanced ?? 0,
      unarmed: raw.system.attacks?.unarmed ?? 1,
    },
    defenses: {
      unarmored: raw.system.defenses?.unarmored ?? 1,
      light: raw.system.defenses?.light ?? 0,
      medium: raw.system.defenses?.medium ?? 0,
      heavy: raw.system.defenses?.heavy ?? 0,
    },
    spellcasting: raw.system.spellcasting ?? 0,
    trainedSkills: raw.system.trainedSkills?.value ?? [],
    additionalSkills: raw.system.trainedSkills?.additional ?? 0,
    ancestryFeatLevels: raw.system.ancestryFeatLevels?.value ?? [],
    classFeatLevels: raw.system.classFeatLevels?.value ?? [],
    generalFeatLevels: raw.system.generalFeatLevels?.value ?? [],
    skillFeatLevels: raw.system.skillFeatLevels?.value ?? [],
    skillIncreaseLevels: raw.system.skillIncreaseLevels?.value ?? [],
    features,
    traits: raw.system.traits?.value ?? [],
    rarity: raw.system.traits?.rarity ?? 'common',
    publication: raw.system.publication?.title ?? '',
    remaster: isRemaster(raw),
    blobSha,
  };
}

const ALLOWED_FEAT_CATEGORIES = new Set<string>([
  'ancestry', 'class', 'general', 'skill', 'heritage', 'classfeature', 'ancestryfeature',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFeatRecord(raw: any, blobSha: string): FeatRecord | null {
  if (raw?.type !== 'feat') return null;

  const category = raw.system.category as string;
  if (!ALLOWED_FEAT_CATEGORIES.has(category)) return null;

  const prerequisites = (raw.system.prerequisites?.value ?? []).map((p: { value: string }) => p.value);

  return {
    id: raw._id,
    name: raw.name,
    nameLower: raw.name.toLowerCase(),
    slug: deriveSlug(raw),
    level: raw.system.level?.value ?? 1,
    category: category as FeatRecord['category'],
    traits: raw.system.traits?.value ?? [],
    rarity: raw.system.traits?.rarity ?? 'common',
    actionType: raw.system.actionType?.value ?? null,
    actions: raw.system.actions?.value ?? null,
    prerequisites,
    description: raw.system.description?.value ?? '',
    publication: raw.system.publication?.title ?? '',
    remaster: isRemaster(raw),
    blobSha,
  };
}

// ── Main sync function ───────────────────────────────────────────────────────

export async function runCharBuilderSync(onProgress?: ProgressCallback, force = false): Promise<void> {
  try {
    // Step 1: check if anything changed
    onProgress?.({ phase: 'checking' });
    const meta = await db.meta.get(META_KEY);
    const storedCommitSha = meta?.commitSha;
    const storedFileShas: Record<string, string> = meta?.fileShas ?? {};

    const latestCommitSha = await fetchLatestCommitSha();

    if (!force && storedCommitSha === latestCommitSha) {
      onProgress?.({ phase: 'done', message: 'Up to date' });
      return;
    }

    // Step 2: get full file index
    onProgress?.({ phase: 'listing' });
    const { entries, truncated } = await fetchPf2eTree();
    if (truncated) {
      console.warn('charBuilderSync: GitHub tree response truncated — some builder data files may be missing.');
    }

    type FileEntry = { path: string; blobSha: string };
    const fileEntries: FileEntry[] = [];

    for (const entry of entries) {
      if (entry.type !== 'blob') continue;
      if (!entry.path.endsWith('.json')) continue;

      const included = INCLUDED_PREFIXES.some(prefix => entry.path.startsWith(prefix));
      if (!included) continue;

      fileEntries.push({ path: entry.path, blobSha: entry.sha });
    }

    // Step 3: diff against stored SHAs
    const toFetch = fileEntries.filter(e => storedFileShas[e.path] !== e.blobSha);
    const currentKeys = new Set(fileEntries.map(e => e.path));
    const removedKeys = Object.keys(storedFileShas).filter(k => !currentKeys.has(k));

    if (toFetch.length === 0 && removedKeys.length === 0) {
      await db.meta.put({
        key: META_KEY,
        commitSha: latestCommitSha,
        lastSynced: Date.now(),
        fileShas: storedFileShas,
      });
      onProgress?.({ phase: 'done', message: 'Up to date' });
      return;
    }

    // Step 4: fetch changed/new files
    onProgress?.({ phase: 'fetching', done: 0, total: toFetch.length });

    const ancestries: AncestryRecord[] = [];
    const heritages: HeritageRecord[] = [];
    const backgrounds: BackgroundRecord[] = [];
    const classes: ClassRecord[] = [];
    const feats: FeatRecord[] = [];

    const succeededPaths = new Set<string>();

    await runInBatches(
      toFetch,
      FETCH_CONCURRENCY,
      async ({ path, blobSha }) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = (await fetchCreatureRaw(latestCommitSha, path)) as any;
          if (!raw?._id) return;

          let pushed = false;
          if (path.startsWith('ancestries/')) {
            const r = toAncestryRecord(raw, blobSha);
            if (r) { ancestries.push(r); pushed = true; }
          } else if (path.startsWith('heritages/')) {
            const r = toHeritageRecord(raw, blobSha);
            if (r) { heritages.push(r); pushed = true; }
          } else if (path.startsWith('backgrounds/')) {
            const r = toBackgroundRecord(raw, blobSha);
            if (r) { backgrounds.push(r); pushed = true; }
          } else if (path.startsWith('classes/')) {
            const r = toClassRecord(raw, blobSha);
            if (r) { classes.push(r); pushed = true; }
          } else if (path.startsWith('feats/')) {
            const r = toFeatRecord(raw, blobSha);
            if (r) { feats.push(r); pushed = true; }
          }

          if (pushed) {
            succeededPaths.add(path);
          }
        } catch (err) {
          console.warn('charBuilderSync: failed to process', path, err);
        }
      },
      (done, total) => onProgress?.({ phase: 'fetching', done, total }),
    );

    // Step 5: persist
    onProgress?.({ phase: 'saving' });
    await Promise.all([
      ancestries.length > 0 ? ancestryRepository.bulkPut(ancestries) : Promise.resolve(),
      heritages.length > 0 ? heritageRepository.bulkPut(heritages) : Promise.resolve(),
      backgrounds.length > 0 ? backgroundRepository.bulkPut(backgrounds) : Promise.resolve(),
      classes.length > 0 ? classRepository.bulkPut(classes) : Promise.resolve(),
      feats.length > 0 ? featRepository.bulkPut(feats) : Promise.resolve(),
    ]);

    const newFileShas = { ...storedFileShas };
    for (const { path, blobSha } of fileEntries) {
      if (succeededPaths.has(path)) {
        newFileShas[path] = blobSha;
      }
    }
    for (const key of removedKeys) delete newFileShas[key];

    await db.meta.put({
      key: META_KEY,
      commitSha: latestCommitSha,
      lastSynced: Date.now(),
      fileShas: newFileShas,
    });

    onProgress?.({
      phase: 'done',
      total: ancestries.length + heritages.length + backgrounds.length + classes.length + feats.length,
    });
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
 * Wipe all character builder reference data and metadata so the next sync starts fresh.
 */
export async function resetCharBuilderDatabase(): Promise<void> {
  await Promise.all([
    ancestryRepository.clear(),
    heritageRepository.clear(),
    backgroundRepository.clear(),
    classRepository.clear(),
    featRepository.clear(),
    db.meta.delete(META_KEY),
  ]);
}

/**
 * Returns the current row counts for all character-builder tables
 * and the last synced timestamp from meta (if available).
 */
export async function getCharBuilderSyncStatus(): Promise<{
  lastSynced: number | null;
  counts: {
    ancestries: number;
    heritages: number;
    backgrounds: number;
    classes: number;
    feats: number;
  };
}> {
  const [ancestries, heritages, backgrounds, classes, feats, meta] = await Promise.all([
    ancestryRepository.count(),
    heritageRepository.count(),
    backgroundRepository.count(),
    classRepository.count(),
    featRepository.count(),
    db.meta.get(META_KEY),
  ]);

  return {
    lastSynced: meta?.lastSynced ?? null,
    counts: { ancestries, heritages, backgrounds, classes, feats },
  };
}
