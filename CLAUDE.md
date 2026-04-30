# Seneschal — PF2E GM Assistant

Personal GM assistant web app for Pathfinder 2E. Phase 1: searchable monster/NPC database synced from the official `foundryvtt/pf2e` GitHub repo.

## Stack

- **React 19 + Vite + TypeScript** — pure frontend, no backend
- **Dexie.js** — IndexedDB wrapper for local creature storage
- **CSS Modules** — scoped styles per component; no Tailwind
- **Google Fonts** — Cinzel (headings/creature names), DM Sans (body), DM Mono (numbers)
- **No auth, no server** — runs entirely in the browser at `localhost:5173`

## Running

```
npm install
npm run dev        # dev server
npm run build      # production build
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
├── types/
│   ├── pf2e.ts                # TypeScript interfaces for creature JSON
│   └── encounter.ts           # Section, EncounterCreature, Encounter — shared by App + EncounterManager
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
    ├── TopBar/                # Full-width header: brand + section nav pills + settings button
    ├── SearchPanel/           # Filter sidebar: name, level, trait, size, rarity, source filters
    ├── ResultsList/           # Creature list with toolbar (filter toggle, sort); each row has inline + button
    ├── EncounterManager/      # XP budget tracker + combat turn tracker
    ├── RulesSection/          # Stub — "Coming soon" placeholder
    ├── CharactersSection/     # Stub — "Coming soon" placeholder
    └── StatblockDrawer/       # Always-visible statblock panel
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
┌─────────────────────────────────────────────────────────────────┐
│  TopBar (full width, crimson #5c1414)                           │
│  ⚔ Seneschal  [⚔ GM Assistant] [📖 Rules] [✦ Characters]  [⚙] │
├──────────────┬──────────────┬──────────────────┬───────────────┤
│ SearchPanel  │ ResultsList  │ EncounterManager  │StatblockDrawer│
│ (collapsible)│              │                   │               │
└──────────────┴──────────────┴──────────────────┴───────────────┘
```

- **TopBar** — full-width `<header>` with props `{ activeSection: Section, onSectionChange }`. Section nav pills switch between `'gm'`, `'rules'`, `'characters'`.
- **SearchPanel** — collapsible; toggled by filter button in ResultsList toolbar.
- **ResultsList** — toolbar always visible (filter toggle `‹‹`/`››`, sort by Level/Name). Creature rows are `div[role="button"]` (not `<button>`) to allow an inner `+` add-to-encounter button without invalid nesting.
- **EncounterManager** — manages multiple named encounters via tabs. XP budget bar + difficulty label. Combat mode with initiative order, round tracker, and HP ±1/±5/±10 buttons.
- **StatblockDrawer** — always rendered; shows empty state prompt when no creature is selected. Not a slide-in drawer.

**Rules and Characters** render centered stub panels ("Coming soon") when those nav sections are active. The 4-column GM layout is hidden when those sections are active.

## Design Tokens (CSS custom properties in `src/index.css`)

```css
--bg: #f4ead6          /* warm parchment page background */
--parchment: #faf4e8   /* lighter parchment for panels */
--crimson: #5c1414     /* TopBar, active states, focus rings */
--brown: #7a5c2e
--gold: #9a7228
--border: #d8c8a4
--border-l: #ecddc4
--text: #2a1a0e
--text-mid: #5a3a20
--text-mute: #8a6a4a
--rarity-uncommon: #8a6a18
--rarity-rare: #2a4a8a
--rarity-unique: #6a2a8a
```

Trait chip default background: `#8b4513`. Statblock body background: `var(--parchment)`.

## Section & Encounter State (App.tsx)

`App.tsx` owns all top-level state and passes callbacks down:

- `activeSection: Section` — `'gm' | 'rules' | 'characters'`
- `filtersOpen: boolean` — whether the SearchPanel sidebar is visible
- `encounters: Encounter[]` — array of named encounter tabs
- `activeEnc: number` — index into encounters
- `partySize: number`, `partyLevel: number`

`addToEncounter(c: CreatureRecord)` extracts `level`, `hp` (from `attributes.hp.max`), and `ac` from the creature's PF2E data and appends an `EncounterCreature` to the active encounter.

`addCustomCreature(name, level)` creates a placeholder with `hp: 20`, `maxHp: 20`, `ac: 10`.

## Encounter Manager Logic

XP per monster: `xpFor(monsterLevel, partyLevel)` — level difference mapped to fixed XP values (10/15/20/30/40/60/80/120/160). Anything more than 4 levels below party level returns 0 XP. The raw total XP is displayed as-is; party size does NOT change the XP values of monsters.

Difficulty thresholds (Table 10-1, GM Core) assume a party of 4. For each party member above or below 4, the thresholds shift by the Character Adjustment for each tier: Low ±20, Moderate ±20, Severe ±30, Extreme ±40. Formula: `threshold = base + (adjustment * (partySize - 4))`. Base thresholds: Trivial (<60), Low (60), Moderate (80), Severe (120), Extreme (160).

Combat mode: on `startCombat()`, each creature gets a random initiative (1–20). Creatures are sorted descending by initiative and stored in local component state. HP during combat is kept in sync with parent encounter state via `liveCombatCreatures` mapping.

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

**Pack display names:** `packDisplayName(packName)` in [src/components/SearchPanel/SearchPanel.tsx](src/components/SearchPanel/SearchPanel.tsx) converts raw pack names to readable labels: replaces dashes with spaces, strips the `" bestiary"` suffix (except `pathfinder-bestiary`, `pathfinder-bestiary-2`, `pathfinder-bestiary-3`), strips the `"pathfinder "` prefix, then applies title case with standard prepositions/conjunctions lowercased and `NPC`/`PFS` uppercased. Examples: `pathfinder-bestiary` → `"Bestiary"`, `npc-gallery` → `"NPC Gallery"`, `howl-of-the-wild-bestiary` → `"Howl of the Wild"`.

**Default selection:** On first load (empty `packSources`), `SearchPanel` auto-selects all Remaster **Core and Supplemental** packs (Adventure Paths & Misc are unchecked by default). "Clear filters" resets `packSources` to `[]` (show all).

## Exported Symbols Worth Knowing

| Symbol | File | Note |
|---|---|---|
| `toRecord` | `sync/sync.ts` | Core creature-to-record transform |
| `runInBatches` | `sync/sync.ts` | Concurrency/progress logic |
| `formatTimestamp` | `components/TopBar/TopBar.tsx` | Date formatting utility; exported but not used in the component itself |
| `traitColor` | `components/StatblockDrawer/StatblockDrawer.tsx` | Trait chip color logic |

## Testing

Tests were removed during the Phase 2 UI redesign. Vitest + React Testing Library remain configured in `vite.config.ts` and `src/test-setup.ts` — the framework is ready but `src/__tests__/` does not exist. When re-adding tests, note:

- `CreatureRow` outer element is `div[role="button"]` (not `<button>`), with an inner `<button>` for the add action. `getAllByRole('button')[0]` is the outer row; use `getByRole('button', { name: /add .* to encounter/i })` for the inner button.
- `StatblockDrawer` is always rendered (not a conditional slide-in). It requires `onAddToEncounter` prop.
- `TopBar` requires `activeSection` and `onSectionChange` props.
- `ResultsList` requires `onAddToEncounter`, `filtersOpen`, and `onToggleFilters` props.
- Pack display names are title-cased — query by rendered text, not raw pack names (e.g. `"NPC Gallery"` not `"npc-gallery"`).
- Level badges render as `+7` / `-1` (not `Lvl 7`). Trait display cap is 3 (no overflow badge).
- Rarity colors: uncommon `#8a6a18`, rare `#2a4a8a`, unique `#6a2a8a`.

## Current Phase

**Phase 2 UI redesign complete.** 4-column GM layout with EncounterManager implemented. Rules and Characters sections stubbed. Tests cleared; framework remains configured for future re-addition.
