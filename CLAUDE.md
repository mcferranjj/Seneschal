# Seneschal — PF2E GM Assistant

Personal GM assistant web app for Pathfinder 2E. Phase 1: searchable monster/NPC database synced from the official `foundryvtt/pf2e` GitHub repo.

## Stack

- **React 19 + Vite + TypeScript** — pure frontend, no backend
- **Dexie.js** — IndexedDB wrapper for local creature storage
- **CSS Modules** — scoped styles per component; no Tailwind
- **Vitest + React Testing Library** — unit/component tests; 239 tests across 10 files
- **No auth, no server** — runs entirely in the browser at `localhost:5173`

## Running

```
npm install
npm run dev        # dev server
npm run build      # production build
npm run test:run   # run all tests once
npm run test       # watch mode
npm run test:ui    # Vitest browser UI
```

## Key Discoveries (verified against live data)

### PF2E repo default branch is `v14-dev`, not `master`
The `foundryvtt/pf2e` repo's default branch is `v14-dev`. The sync engine avoids hardcoding branch names by using the `download_url` field from GitHub API directory listing responses — this always points to the correct branch automatically.

### Creature JSON schema (confirmed field shapes)
These differ from what you might assume from documentation:

| Field | Actual shape |
|---|---|
| `system.details.level` | `{ value: number }` — not a bare number |
| `system.traits.size` | `{ value: string }` — e.g. `{ value: "huge" }` |
| `system.attributes.ac` | `{ value: number, details: string }` |
| `system.attributes.hp` | `{ value, max, temp, details }` |
| `system.skills.[name]` | `{ base: number }` — uses `base`, not `value` |
| `system.perception` | `{ mod, details, senses: [{type, range?}] }` |
| `system.saves.[save]` | `{ value: number, saveDetail: string }` |
| `system.details.languages` | `{ value: string[], details: string }` |

### Items array structure
All creature abilities, attacks, and actions live in `creature.items[]`. Key `type` values:
- `"melee"` — **all** NPC attacks in PF2E v14 data use this type, including ranged attacks. `"ranged"` as an item type does not appear in practice. Ranged attacks are identified by checking (in order): `system.category === 'ranged'`, `system.range.increment != null` (explicit range increment, e.g. rocks/bows), or `system.traits.value` containing a trait starting with `"thrown"` (e.g. `thrown-10` for daggers). Has `system.bonus.value`, `system.damageRolls` (keyed by random UUID strings, each `{ damage, damageType }`), `system.attackEffects.value`, and optionally `system.range.increment` (number of feet).
- `"action"` — active abilities and passives; distinguished by `system.actionType.value`:
  - `"passive"` — always-on traits (Golem Antimagic, Repair Mode, etc.)
  - `"action"` — standard actions; `system.actions.value` = 1, 2, or 3
  - `"reaction"` — reactions; `system.trigger.value` holds the trigger text
  - `"free"` — free actions

### Descriptions contain Foundry macros
`system.description.value` is HTML with Foundry-specific inline syntax:
- `@Damage[9d10[untyped]]` — inline damage roll macros
- `@Localize[PF2E.NPC.Abilities.Glossary.X]` — localization keys
- `@UUID[Compendium...]{Display text}` — compendium links **with** explicit label
- `@UUID[Compendium.pf2e.actionspf2e.Item.Balance]` — compendium links **without** label; the last path segment IS the human-readable name (e.g. `Balance`, `Off-Guard`, `Grab an Edge`)

`stripFoundryMacros()` in [src/components/StatblockDrawer/statblockHelpers.ts](src/components/StatblockDrawer/statblockHelpers.ts) handles these with regex replacements before rendering HTML. UUID links with `{display text}` are replaced by that text; UUID links without it are replaced by the last `.`-delimited segment of the path.

### GitHub API rate limit — only 3 calls needed per sync
Unauthenticated limit: **60 requests/hour**. The original design made ~91 API calls during the listing phase (1 per pack directory), which exceeded the limit and caused silent hangs at ~49/90 packs.

**Fixed:** The listing phase now uses the Git Trees API — 2 API calls get every file path and SHA under `packs/pf2e` at once:
1. `GET /repos/foundryvtt/pf2e/contents/packs` → find the `pf2e/` entry, read its tree SHA
2. `GET /repos/foundryvtt/pf2e/git/trees/{treeSha}?recursive=1` → full file listing

Combined with the commit SHA check (1 call), the entire sync costs **3 API calls** against the rate limit. Creature file content is fetched from `raw.githubusercontent.com` using the commit SHA as the ref — no rate limit on that CDN.

All API fetches now have a 30-second timeout (`AbortSignal.timeout`). Timeouts surface as `TimeoutError` and are caught by the error handler with a user-friendly message.

On a 403/429 rate-limit response, `githubGet` reads the `X-RateLimit-Reset` header (Unix timestamp) and stores it on `GithubError.rateLimitResetsAt`. The error handler in `sync.ts` formats this as a local clock time ("Resets at 3:42 PM — retry then.") so the user knows exactly when to try again.

### Pack scope
Everything under `packs/pf2e/` is included **except**:
- `bestiary-ability-glossary-srd`
- `bestiary-family-ability-glossary`
- `bestiary-effects`
- `paizo-pregens`
- `iconics`
- anything prefixed `sf2e` (Starfinder 2E)

Allowlist logic lives in [src/sync/packList.ts](src/sync/packList.ts). That file also contains `PACK_REGISTRY` — a lookup table that classifies each known pack by era (`remaster` | `legacy`) and category (`core` | `supplemental` | `misc`). Use `getPackMeta(packName)` to query it; unknown packs fall back to pattern-based inference.

### Actual PF2E pack naming conventions (verified against live DB)
Pack names differ significantly from what you'd guess from book titles:

- **Remaster core books** carry a `pathfinder-` prefix: `pathfinder-monster-core`, `pathfinder-monster-core-2`, `pathfinder-npc-core`. Not bare names like `monster-core`.
- **Supplemental books** (Howl of the Wild, Rage of Elements, etc.) ship as `<slug>-bestiary` packs: `howl-of-the-wild-bestiary`, `rage-of-elements-bestiary`, `war-of-immortals-bestiary`, `battlecry-bestiary`. Not the bare book-slug.
- **Dark Archive** is `pathfinder-dark-archive` and is tagged remaster in the DB despite being published before the remaster cut.
- **Lost Omens legacy books** (World Guide, Character Guide, etc.) do **not** have separate creature packs in the PF2E system. All Lost Omens creature content is consolidated into the single `lost-omens-bestiary` pack (remaster era only). Do not add Lost Omens legacy entries to `PACK_REGISTRY` — they will never match anything in the DB.
- Any pack not in `PACK_REGISTRY` falls through to `inferCategory()`: packs ending in `-bestiary` or containing `society` → `misc`; everything else → `supplemental`.

## Project Structure

```
src/
├── types/pf2e.ts              # TypeScript interfaces for creature JSON
├── db/
│   ├── schema.ts              # CreatureRecord + MetaRecord interfaces
│   └── db.ts                  # Dexie instance (database name: SeneschalGMAssistant)
├── sync/
│   ├── github.ts              # GitHub API client (fetchLatestCommitSha, fetchPf2eTree, fetchCreatureRaw)
│   ├── packList.ts            # Pack include/exclude filter; PACK_REGISTRY + getPackMeta() for era/category metadata
│   └── sync.ts                # Sync orchestration: initial load + incremental diff
├── search/
│   └── search.ts              # Multi-criteria Dexie query builder; getAllPackSourcesWithMeta() returns PackSourceInfo[]
└── components/
    ├── TopBar/                # Brand header (Seneschal / PF2E GM Assistant); no props; sits above SearchPanel in the left column
    ├── SearchPanel/           # Left column: name, level, trait, size, rarity, source filters
    ├── ResultsList/           # Center column: scrollable creature rows
    └── StatblockDrawer/       # Right drawer: PF2E-style statblock
        ├── StatblockDrawer.tsx
        ├── StatblockDrawer.module.css
        └── statblockHelpers.ts  # Data extraction + Foundry macro stripping
```

## Database Schema (Dexie v1)

**Table `creatures`** — indexed on: `id`, `nameLower`, `level`, `rarity`, `size`, `packSource`, `*traits` (multi-entry)

**Table `meta`** — key `"sync_state"` stores `{ commitSha, lastSynced, fileShas: Record<path, blobSha> }`

The `fileShas` map (`packName/fileName → blobSha`) enables incremental sync: only files whose blob SHA changed since last sync are re-fetched.

## Sync Flow

**Initial (no prior sync):**
1. Fetch latest commit SHA (1 API call) — compare against stored; if same, skip
2. Fetch `packs/pf2e` directory listing (1 API call) — get pack subdirectory names
3. Fetch each pack's file listing (up to ~50 API calls) — get filenames + blob SHAs
4. Fetch all creature JSONs from `raw.githubusercontent.com` in batches of 15
5. `bulkPut` into IndexedDB; store updated `fileShas` + new commit SHA

**Incremental (prior sync exists):**
Steps 1–3 same, then diff `fileShas` to find only changed/added/removed files, fetch only those.

## UI Layout

```
[TopBar 280px — dark red #6b1a1a] | [ResultsList flex] | [StatblockDrawer 440px slide-in]
[SearchPanel 280px              ] |
```

The TopBar and SearchPanel share a left column (`.leftCol`, 280px wide) in `App.tsx`. There is no full-width header row — the brand lives only above the filters. The `.leftCol` owns the `border-right: 1px solid #c8b98a` separator; `SearchPanel` does not set its own border or width.

**Statblock colors:** header `#6b1a1a`, body background `#f5eed9` (parchment), trait chip default `#8b4513`.

## Search Filters

`SearchFilters` (in [src/search/search.ts](src/search/search.ts)) uses arrays for multi-select fields:

| Field | Type | Empty / default means |
|---|---|---|
| `sizes` | `string[]` | any size |
| `rarities` | `string[]` | any rarity |
| `packSources` | `string[]` | all sources |
| `sortBy` | `'level' \| 'name'` | default `'level'` |

`DEFAULT_FILTERS` has the three array fields as `[]` (no filter) and `sortBy: 'level'`. The Dexie query uses `anyOf()` when any of the array fields has values, falling through to `toCollection()` when all are empty.

`searchCreatures` returns `{ results: CreatureRecord[], totalCount: number }`. It fetches all matching creatures with no cap, sorts them in JS (level-then-name or name-only), and returns the full list. There is no display cap — `results` and `totalCount` always match. The sort toggle lives in `ResultsList`'s toolbar; `onSortChange` updates `filters.sortBy` in `App.tsx` which re-triggers the search.

**Source filter UI:** The source section in `SearchPanel` renders a two-level collapsible tree: **Remaster / Legacy** at the top, then **Core / Supplemental / Adventure Paths & Misc** within each era. Era and category headers have tri-state checkboxes that select/deselect all children. Pack lists come from `getAllPackSourcesWithMeta()` in [src/search/search.ts](src/search/search.ts), which classifies each pack using `PACK_REGISTRY` in [src/sync/packList.ts](src/sync/packList.ts); for packs not in the registry it samples one creature from the DB and reads `publication.remaster`.

**Pack display names:** `packDisplayName(packName)` in [src/components/SearchPanel/SearchPanel.tsx](src/components/SearchPanel/SearchPanel.tsx) converts raw pack names to readable labels: strips the `" bestiary"` suffix (except `pathfinder-bestiary`, `pathfinder-bestiary-2`, `pathfinder-bestiary-3`), strips the `"pathfinder "` prefix, then applies title case with standard prepositions/conjunctions lowercased and `NPC`/`PFS` uppercased.

**Default selection:** On first load (empty `packSources`), `SearchPanel` auto-selects all Remaster **Core and Supplemental** packs (Adventure Paths & Misc are unchecked by default). "Clear filters" resets `packSources` to `[]` (show all).

## Testing

**Framework:** Vitest 4 + jsdom + React Testing Library. Configured via the `test` block in [vite.config.ts](vite.config.ts). A global setup file at [src/test-setup.ts](src/test-setup.ts) imports `@testing-library/jest-dom` for DOM matchers.

### Test file layout

All tests live under `src/__tests__/`, mirroring the source tree:

```
src/__tests__/
├── statblockHelpers.test.ts       # 14 pure functions in statblockHelpers.ts
├── search/
│   └── search.test.ts             # searchCreatures, getAllTraits, getAllPackSources, getAllPackSourcesWithMeta
├── sync/
│   ├── packList.test.ts           # isCreaturePack, getPackMeta, packRegistryHas
│   ├── github.test.ts             # GithubError, fetchLatestCommitSha, fetchPf2eTree, fetchCreatureRaw
│   └── sync.test.ts               # toRecord, runInBatches, runSync
└── components/
    ├── TopBar.test.tsx
    ├── ResultsList.test.tsx
    ├── CreatureRow.test.tsx
    ├── SearchPanel.test.tsx
    └── StatblockDrawer.test.tsx
```

### Exported-for-testing functions

Several private functions were exported so they can be unit-tested directly. If you see these exports and wonder why they exist, it is for testability — do not remove them:

| Symbol | File | Why exported |
|---|---|---|
| `toRecord` | `sync/sync.ts` | Core creature-to-record transform |
| `runInBatches` | `sync/sync.ts` | Concurrency/progress logic |
| `formatTimestamp` | `components/TopBar/TopBar.tsx` | Date formatting utility; no longer used inside TopBar itself (sync status was removed from the header) but kept exported so the test coverage survives |
| `traitColor` | `components/StatblockDrawer/StatblockDrawer.tsx` | Trait chip color logic |

### Key mocking patterns

**Dexie (search.ts, sync.ts):** The `db` module is mocked with `vi.mock('../../db/db', ...)`. Because the mock factory is hoisted before variable declarations, all mock function references inside the factory must be created with `vi.hoisted()` first — otherwise you get a `Cannot access 'x' before initialization` error. See `search.test.ts` for the pattern. The mock chain for `searchCreatures` is `filter → toArray` (sorting happens in JS after the array is returned). The mock chain for `where().equals()` returns `{ filter, first }` — `first` is needed by `getAllPackSourcesWithMeta` to sample one creature per unknown pack.

**`fetch` (github.ts):** `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(...))` in each test; `vi.unstubAllGlobals()` in `afterEach`. `AbortSignal.timeout` is also stubbed since jsdom doesn't implement it.

**GitHub modules (sync.ts):** `fetchLatestCommitSha`, `fetchPf2eTree`, `fetchCreatureRaw` are mocked with `vi.mock('../../sync/github', ...)`. The `GithubError` class is re-implemented inline in the mock factory (not imported from the real module) to avoid circular dependency issues with the mock.

**Controlled React inputs:** Inputs wired to a mock `onChange` don't reflect changes in the DOM (React re-renders with the original prop value). Use `fireEvent.change(input, { target: { value: 'x' } })` instead of `userEvent.type` for these — see `SearchPanel.test.tsx`.

### Known quirks

- `stripFoundryMacros` does not fully strip nested brackets in `@Damage[9d10[untyped]]`: the outer regex `[^\]]+` stops at the first `]`, leaving a residual `]` in the output (`9d10[untyped]` not `9d10`). Tests document the actual behavior, not the ideal behavior.
- Pack display names in `SearchPanel` are rendered via `packDisplayName()` — dashes become spaces, " bestiary" suffix is stripped (with three exceptions), "pathfinder " prefix is stripped, and title case is applied. Test queries must match the final rendered text (e.g. `pathfinder-bestiary-2` → `"Bestiary 2"`, `howl-of-the-wild-bestiary` → `"Howl of the Wild"`).

## Current Phase

**Phase 1 complete.** Future phases planned but not yet scoped.
