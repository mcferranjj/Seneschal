# Sync Layer

## Files Covered
- `src/sync/sync.ts`
- `src/sync/packList.ts`

> **Note:** `sync.ts` also imports from `./github` (a `github.ts` file in the same directory). That file was not present in the working tree at the time of this analysis — it may be gitignored or generated. Its exported symbols are: `fetchLatestCommitSha`, `fetchPf2eTree`, `fetchCreatureRaw`, `fetchTraitDescriptions`, `GithubError`.

---

## packList.ts

### Purpose
A static registry of known PF2E content packs, plus utility functions for classifying packs by era (Remaster / Legacy / SF2E) and category (Core / Supplemental / Misc). Used by `sync.ts` to decide which packs to index, and by `search.ts` to annotate search results with pack metadata.

### Key Exports

| Export | Description |
|---|---|
| `isCreaturePack(packName)` | Returns `false` for packs that don't contain creatures (ability glossaries, effects, pregens). Returns `true` for everything else. |
| `isCorePack(packName)` | Returns `true` for packs starting with `'pathfinder-'` or equal to `'npc-gallery'`. |
| `packRegistryHas(packName)` | Returns `true` if the pack is in the static `PACK_REGISTRY`. |
| `getPackMeta(packName, isRemasterFromDb?)` | Returns `{ era, category }` for any pack. Falls back to inference if not in registry. |

### Types
- `PackEra = 'remaster' | 'legacy' | 'sf2e'`
- `PackCategory = 'core' | 'supplemental' | 'misc'`
- `PackMeta = { era: PackEra; category: PackCategory }`

### PACK_REGISTRY
A static `Record<string, PackMeta>` with ~60 named packs organized by era and category. Packs not in the registry are handled by `inferCategory()` and an `isRemasterFromDb` flag (sampled from the DB if available).

### EXCLUDED_PACKS
A `Set` of pack names that are never indexed: `bestiary-ability-glossary-srd`, `bestiary-family-ability-glossary`, `bestiary-effects`, `paizo-pregens`, `iconics`, `pf2e-pregenerated-characters`.

### Cleanup Opportunities
- `isCorePack` is defined but **never imported or used** anywhere in the codebase. It can be removed or documented as reserved for future use.
- The `PACK_REGISTRY` is a pure data structure — it could be split into a separate JSON or data file to make the code file shorter and the data easier to maintain.
- The `inferCategory` fallback is a rough heuristic (`endsWith('-bestiary')` → misc). For packs not in the registry, the category assignment could be wrong. Consider making the registry exhaustive and removing the fallback, or logging a warning when an unknown pack is encountered.

---

## sync.ts

### Purpose
Implements the full data synchronization pipeline between the GitHub `foundryvtt/pf2e` repository and the local IndexedDB. Also provides supporting utility functions and manages the trait descriptions cache.

### Key Exports

| Export | Description |
|---|---|
| `runSync(onProgress?)` | Main sync function. Runs the 5-step pipeline (check → list → diff → fetch → save). |
| `toRecord(creature, packSource, blobSha)` | Transforms a raw `PF2ECreature` JSON object into a `CreatureRecord` for the DB. |
| `runInBatches(items, concurrency, fn, onProgress?)` | Generic batched async runner. Processes `items` in groups of `concurrency`, calling `fn` on each. |
| `loadTraitDescriptions()` | Reads cached trait descriptions from the DB. Used by `statblockHelpers.ts`. |
| `getLastSynced()` | Returns the Unix timestamp of the last sync, or `null`. |
| `getCreatureCount()` | Returns total count of creatures in the DB. |
| `resetDatabase()` | Clears the `creatures`, `meta`, and `traitDescriptions` tables. Does **not** touch `encounterState` or `characters`. |

### Types
- `SyncPhase = 'idle' | 'checking' | 'listing' | 'fetching' | 'saving' | 'done' | 'error'`
- `SyncProgress = { phase, total?, done?, message? }`
- `ProgressCallback = (progress: SyncProgress) => void`

### Sync Pipeline (5 steps)

1. **Check** (`checking`): Fetch the latest GitHub commit SHA. If it matches the stored SHA, data is current — skip to trait descriptions check and return `done`.
2. **List** (`listing`): Fetch the full file tree from `packs/pf2e/` via the Git Trees API (2 API calls). Filters to only creature pack entries (`.json` files, non-excluded packs).
3. **Diff**: Compare each file's blob SHA against stored SHAs. Builds `toFetch` (new/changed files) and `removedKeys` (deleted files). If no changes, update meta and return `done`.
4. **Fetch** (`fetching`): Download changed creature files from the GitHub raw CDN (no rate limit). Uses `runInBatches` with concurrency of 15. Each file is validated (`_id`, `name`, `type === 'npc' | 'hazard'`). Individual failures are silently skipped.
5. **Save** (`saving`): Bulk-upserts records to `db.creatures`. Updates file SHAs in meta. Ensures trait descriptions are up to date.

### Helper Functions (internal)
- `getLevel(creature)` — extracts level from `system.details.level`, handling both object and number form.
- `getSize(creature)` — extracts size from `system.traits.size`, handling both object and string form.
- `ensureTraitDescriptions(commitSha)` — fetches and caches trait descriptions if not already current. Silently swallows errors (non-critical).

### Error Handling
- `GithubError` with `isRateLimit` → user-friendly rate limit message with reset time if available.
- `TimeoutError` → connection error message.
- All other errors → generic message.
- Individual file fetch failures → silently skipped (don't abort sync).

### Interfaces With
| Module | Purpose |
|---|---|
| `../db/db` | `db` singleton for all DB reads/writes |
| `../db/schema` | `CreatureRecord` type |
| `../types/pf2e` | `PF2ECreature` type |
| `./github` | All GitHub API calls (external, not analyzed) |
| `./packList` | `isCreaturePack` |

---

## Cross-File Notes
- `runInBatches` is a general-purpose utility that has nothing to do with syncing specifically. It could live in a `utils/async.ts` file and be reused elsewhere.
- `toRecord` is a data transformation function — it could also live in `utils/` rather than `sync/`, since it's about mapping the external format to the internal schema, not about the sync process itself.
- `loadTraitDescriptions` is consumed by `statblockHelpers.ts`, creating a cross-cutting dependency: the statblock rendering layer depends on the sync layer for trait data. A cleaner design would have the trait data read via a neutral repository interface rather than a sync-specific export.
- `getLevel` and `getSize` in `sync.ts` are duplicates of the same logic in `statblockHelpers.ts`. There should be one canonical implementation in a shared utility.
