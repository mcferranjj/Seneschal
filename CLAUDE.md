# Seneschal — PF2E GM Assistant

Personal GM assistant web app for Pathfinder 2E. Searchable monster/NPC/hazard database synced from the `mcferranjj/pf2e-for-seneschal` GitHub repo, with encounter management, party tracking, rules reference, and in-app dice rolling.

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
The `mcferranjj/pf2e-for-seneschal` repo's default branch is `v14-dev`. The sync engine avoids hardcoding branch names by using the `download_url` field from GitHub API directory listing responses — this always points to the correct branch automatically.

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
- `@Damage[9d10[untyped]]` — inline damage roll macros (one level of bracket nesting allowed)
- `@Check[type:will|dc:22]` — save checks; extracted as `"DC 22 will"`
- `@Template[...]` — area templates; replaced with `"an area"`
- `@Localize[PF2E.NPC.Abilities.Glossary.X]` — localization keys
- `@UUID[Compendium...]{Display text}` — compendium links **with** explicit label
- `@UUID[Compendium.pf2e.actionspf2e.Item.Balance]` — compendium links **without** label; the last path segment IS the human-readable name

`stripFoundryMacros()` in [src/components/StatblockDrawer/statblockHelpers.ts](src/components/StatblockDrawer/statblockHelpers.ts) handles these. After stripping, `linkKeywords()` wraps ~40 PF2E terms in `.pf2kw` spans with tooltip text, and `linkRolls()` wraps dice expressions and modifiers in `.pf2roll` spans that trigger the DiceRoller on click.

### GitHub API rate limit — only 3 calls needed per sync
Unauthenticated limit: **60 requests/hour**. The listing phase uses the Git Trees API — 2 API calls get every file path and SHA under `packs/pf2e` at once:
1. `GET /repos/mcferranjj/pf2e-for-seneschal/contents/packs` → find the `pf2e/` entry, read its tree SHA
2. `GET /repos/mcferranjj/pf2e-for-seneschal/git/trees/{treeSha}?recursive=1` → full file listing

Combined with the commit SHA check (1 call), the entire sync costs **3 API calls** against the rate limit. Creature file content is fetched from `raw.githubusercontent.com` using the commit SHA as the ref — no rate limit on that CDN.

All API fetches now have a 30-second timeout (`AbortSignal.timeout`). On a 403/429 rate-limit response, `githubGet` reads the `X-RateLimit-Reset` header and stores it on `GithubError.rateLimitResetsAt`. The error handler formats this as a local clock time ("Resets at 3:42 PM — retry then.").

### Pack scope
Everything under `packs/pf2e/` is synced **except**:
- `bestiary-ability-glossary-srd`
- `bestiary-family-ability-glossary`
- `bestiary-effects`
- `paizo-pregens`
- `iconics`

SF2E (Starfinder 2E) packs are synced but classified with `era: 'sf2e'` and displayed in their own section in SearchPanel. Previously excluded; now included.

Only entities with `type === 'npc'` or `type === 'hazard'` are stored. `CreatureRecord.entityType` stores this value, indexed in Dexie for filtering.

Allowlist logic lives in [src/sync/packList.ts](src/sync/packList.ts). `PackEra` is `'remaster' | 'legacy' | 'sf2e'`.

### Actual PF2E pack naming conventions (verified against live DB)
- **Remaster core books** carry a `pathfinder-` prefix: `pathfinder-monster-core`, `pathfinder-monster-core-2`, `pathfinder-npc-core`.
- **Supplemental books** ship as `<slug>-bestiary` packs: `howl-of-the-wild-bestiary`, `rage-of-elements-bestiary`, etc.
- **Dark Archive** is `pathfinder-dark-archive` — tagged remaster despite pre-remaster publication.
- **Lost Omens** creature content consolidated into `lost-omens-bestiary` (remaster only).
- Any pack not in `PACK_REGISTRY` falls through to `inferCategory()`: packs ending in `-bestiary` or containing `society` → `misc`; everything else → `supplemental`.

## Project Structure

```
src/
├── types/
│   ├── pf2e.ts                # TypeScript interfaces for creature JSON
│   └── encounter.ts           # Section, EncounterCreature (with conditions, attacks, abilities), Encounter, Condition, CustomAttack, CustomAbility
├── db/
│   ├── schema.ts              # CreatureRecord (with entityType, customData) + MetaRecord interfaces
│   └── db.ts                  # Dexie v4 instance; CharacterRecord, EncounterStateRecord, helpers
├── sync/
│   ├── github.ts              # GitHub API client
│   ├── packList.ts            # Pack filter; PACK_REGISTRY; PackEra includes 'sf2e'
│   └── sync.ts                # Sync orchestration; toRecord() sets entityType
├── search/
│   └── search.ts              # SearchFilters (with excludeTraits, entityTypes); query builder
└── components/
    ├── TopBar/                # Header: brand + "Encounters / Rules / Characters" nav pills
    ├── SearchPanel/           # Filters: name, level, trait include/exclude, size, rarity, entity type, source
    ├── ResultsList/           # Creature list; sticky toolbar with filter toggle + sort; scrollable "＋ Custom Creature" button
    ├── EncounterManager/      # XP tracker + combat tracker with conditions and creature wizard
    ├── RulesSection/          # Tabbed conditions + basic actions reference with accordion + search
    ├── CharactersSection/     # PC party tracker: card grid, HP tracking, persistent Dexie storage
    ├── DiceRoller/            # Floating dice roller; triggered by clicking .pf2roll spans
    ├── CustomCreatureWizard/  # Two-step wizard for building persistent custom creatures; saves to db.creatures
    └── StatblockDrawer/       # Always-visible statblock panel; also hosts CustomCreatureWizard when wizardOpen
        ├── StatblockDrawer.tsx  # AoN link, creature image, keyword tooltips, dice roller trigger; custom statblock for packSource='custom'
        ├── StatblockDrawer.module.css
        └── statblockHelpers.ts  # stripFoundryMacros + linkKeywords + linkRolls
```

## Database Schema (Dexie v4)

**Table `creatures`** — indexed on: `id`, `entityType`, `nameLower`, `level`, `rarity`, `size`, `packSource`, `*traits` (multi-entry)

**Table `meta`** — key `"sync_state"` stores `{ commitSha, lastSynced, fileShas: Record<path, blobSha> }`

**Table `encounterState`** — key `"encounter_state"` stores `{ encounters, activeEnc, partySize, partyLevel }` — auto-persisted on every change

**Table `characters`** — key `id` stores `CharacterRecord` — PC party members

`CreatureRecord.customData?: { attacks?: CustomAttack[]; abilities?: CustomAbility[] }` — present only on custom creatures (`packSource === 'custom'`); holds the wizard-authored attacks and abilities since those don't live in the PF2E items array.

Schema migration history:
- v1: creatures + meta
- v2: + encounterState
- v3: creatures gains `entityType` index; upgrade backfills `entityType: 'npc'` on existing rows
- v4: + characters

The `fileShas` map (`packName/fileName → blobSha`) enables incremental sync: only changed/added/removed files are re-fetched.

## Sync Flow

**Initial (no prior sync):**
1. Fetch latest commit SHA (1 API call) — compare against stored; if same, skip
2. Fetch `packs/pf2e` directory listing via Git Trees API (2 API calls total)
3. Fetch creature JSONs from `raw.githubusercontent.com` in batches of 15
4. Filter to `type === 'npc' | 'hazard'`, transform via `toRecord()`, `bulkPut` into IndexedDB

**Incremental (prior sync exists):**
Steps 1–2 same, then diff `fileShas` to find only changed/added/removed files, fetch only those.

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TopBar (full width, crimson #5c1414)                           │
│  ⚔ Seneschal  [⚔ Encounters] [📖 Rules] [✦ Characters]  [⚙]   │
├──────────────┬──────────────┬──────────────────┬───────────────┤
│ SearchPanel  ┊ ResultsList  ┊ EncounterManager  ┊StatblockDrawer│
│ (collapsible)┊   (resize)   ┊    (resize)       ┊               │
└──────────────┴──────────────┴──────────────────┴───────────────┘
```

- **TopBar** — section nav pills: `'gm'` → "Encounters", `'rules'` → "Rules", `'characters'` → "Characters".
- **SearchPanel** — collapsible; includes trait include/exclude (green/red chips), entity type filter (Creature/Hazard), SF2E source section.
- **ResultsList** — sticky toolbar (filter toggle, sort). Creature rows are `div[role="button"]`. A non-sticky "＋ Custom Creature" button sits at the top of the scrollable list and opens the wizard in the statblock column.
- **EncounterManager** — multi-encounter tabs; XP budget + difficulty; combat mode with conditions, saves display, auto-reducing conditions, clickable creature names (jumps to statblock), custom creature wizard (separate use case from the persistent wizard).
- **StatblockDrawer** — three display modes: (1) normal PF2E statblock, (2) custom creature statblock (when `packSource === 'custom'`), (3) `CustomCreatureWizard` (when `wizardOpen`). Custom statblock shows AC/HP/saves/attacks/abilities with a delete button (confirm step). AoN link in header, creature image (from GitHub raw URL), flavor text box, keyword tooltips on hover (`.pf2kw`), clickable dice/modifiers (`.pf2roll`) that open DiceRoller.
- **DiceRoller** — floating panel; `parseDice()` handles `NdM±mod` expressions; keyboard: `Escape` closes, `R` re-rolls; crit/fumble highlighting.
- **RulesSection** — tabbed (Conditions / Basic Actions), searchable, accordion-expand entries.
- **CharactersSection** — card grid of PCs; modal add/edit form; HP ±1/±5/±10 buttons; HP bar; persists to `characters` Dexie table.

Rules and Characters sections replace the full 4-column GM layout when active.

## Resizable Columns (App.tsx)

The `resultsCol` and `encounterCol` widths are controlled via React state (`resultsWidth`, `encounterWidth`). Drag handles (`.resizeHandle`, 4px wide, `cursor: col-resize`) sit between columns; they use `setPointerCapture` so dragging continues even when the mouse moves fast. Encounter state is persisted to IndexedDB on every change; an `encounterStateLoaded` ref prevents the save effect from firing before the initial load completes.

## Trait Exclude Mode (SearchPanel)

`SearchFilters` has both `traits: string[]` (include) and `excludeTraits: string[]`. The trait input has two buttons: green `+` (filter-in) and red `−` (filter-out). Enter key defaults to filter-in. Existing trait chips can be right-clicked to toggle between include and exclude mode — include chips are green, exclude chips are red. CSS variables `--trait-include: #3a7a3a` and `--trait-exclude: #8a2a18` are defined in `src/index.css`.

## Design Tokens (CSS custom properties in `src/index.css`)

```css
--bg: #f4ead6
--parchment: #faf4e8
--crimson: #5c1414
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
--trait-include: #3a7a3a
--trait-exclude: #8a2a18
```

Global `.pf2kw` spans have `::after` tooltips via `content: attr(data-tip)`. Global `.pf2roll` spans are styled as clickable gold text.

## Section & Encounter State (App.tsx)

`App.tsx` owns all top-level state:

- `activeSection: Section` — `'gm' | 'rules' | 'characters'`
- `filtersOpen: boolean`
- `encounters: Encounter[]`, `activeEnc: number`
- `partySize: number`, `partyLevel: number`
- `resultsWidth: number`, `encounterWidth: number` — column widths in px
- `selectedCreature: CreatureRecord | null`

Key callbacks: `addToEncounter(c)`, `updateConditions(uid, conditions)`, `selectCreatureById(id)`, `openWizard()`, `handleWizardSave(creature)`, `handleDeleteCreature(id)`.

## Encounter Manager Logic

XP per monster: `xpFor(monsterLevel, partyLevel)` — level difference mapped to fixed XP values (10/15/20/30/40/60/80/120/160). Anything more than 4 levels below party level returns 0 XP.

Difficulty thresholds (Table 10-1, GM Core) assume a party of 4. For each party member above/below 4: Low ±20, Moderate ±20, Severe ±30, Extreme ±40.

Combat mode: random initiative (1–20) on `startCombat()`. `nextTurn()` auto-reduces valued conditions (Frightened, Stunned, Slowed, etc.) by 1 on the ending creature. Condition chips shown on each combat card; `+ cond` button with text input to add. Clicking a creature's name (when `creatureId` exists) calls `onSelectCreature` to jump to its statblock.

EncounterManager also contains a quick inline custom creature wizard (separate from the persistent one) — kept for a different use case TBD.

**Stat tiers by category:**
- HP: Low / Moderate / High (Table 9-7, HP uses midpoints of per-level ranges)
- AC: Low / Moderate / High / Extreme (Table 9-5)
- Saves (Fort/Ref/Will): Terrible / Low / Moderate / High / Extreme (Table 9-6)
- Attack bonus: Low / Moderate / High / Extreme (Table 9-9)
- Damage: Low / Moderate / High / Extreme (Table 9-10, stored as dice expression string e.g. `2d8+9`)

All tables cover levels -1..24 from the source; level 25 is extrapolated.

**Attacks:** Multiple attacks supported. Each attack has name, type (melee ⚔ / ranged 🏹), bonus, damage, and optional range (ranged only). Type toggle switches melee↔ranged and auto-sets range to 30ft. Attacks are stored as `CustomAttack[]` on `EncounterCreature`.

**Abilities:** Free-form entries with name + description text. Stored as `CustomAbility[]` on `EncounterCreature`. Description shows as tooltip on combat card.

**Combat card display:** Custom creatures show attacks as rows (icon · name · bonus · damage · range) and ability names as chips with description tooltips.

## Custom Creature System

Custom creatures are authored via `CustomCreatureWizard` and **permanently stored in `db.creatures`** (not just in encounter state). This distinguishes them from the EncounterManager's inline wizard which adds temporary entries to the active encounter.

**Entry point:** "＋ Custom Creature" button at the top of the ResultsList scrollable area (not sticky). Clicking it sets `wizardOpen = true` in App.tsx and clears the selected creature, causing StatblockDrawer to render the wizard.

**Wizard flow (two steps):**
1. Name + level
2. Stats (HP/AC/Fort/Ref/Will with tier buttons) + attacks + abilities — same tier system as the EncounterManager wizard

**On save:** wizard calls `db.creatures.put(record)` directly, then calls `onWizardSave(record)` which closes the wizard, sets the new creature as selected (showing the custom statblock), and refreshes search results.

**Custom creature record shape:**
- `packSource: 'custom'` — used to detect custom creatures throughout the app and will appear as a filterable source in SearchPanel
- `entityType: 'npc'`, `rarity: 'common'`, `size: 'med'`, `traits: []`, `blobSha: ''`
- `data.system` — minimal PF2E shape with `attributes.hp/ac` and `saves.fortitude/reflex/will` so `addToEncounter` can read stats normally
- `customData: { attacks?, abilities? }` — wizard-authored attacks/abilities stored here since the PF2E items array is empty

**Custom statblock:** StatblockDrawer detects `packSource === 'custom'` and renders `CustomStatblock` instead of the normal PF2E renderer. Shows AC, HP, saves, attacks, abilities, "+ Add to Encounter", and a "Delete Custom Creature" button with a confirmation step. Deletion calls `db.creatures.delete(id)` and refreshes search.

**Stat tiers (in `CustomCreatureWizard`):**
- HP: Low / Moderate / High (Table 9-7, midpoints)
- AC: Low / Moderate / High / Extreme (Table 9-5)
- Saves (Fort/Ref/Will): Terrible / Low / Moderate / High / Extreme (Table 9-6)
- Attack bonus: Low / Moderate / High / Extreme (Table 9-9)
- Damage: Low / Moderate / High / Extreme (Table 9-10, dice expression string)

## Search Filters

`SearchFilters` fields:

| Field | Type | Empty means |
|---|---|---|
| `sizes` | `string[]` | any size |
| `rarities` | `string[]` | any rarity |
| `packSources` | `string[]` | all sources |
| `traits` | `string[]` | no trait filter |
| `excludeTraits` | `string[]` | no exclusions |
| `entityTypes` | `string[]` | creature + hazard |
| `sortBy` | `'level' \| 'name'` | default `'level'` |

**Source filter UI:** Three-level tree: **Remaster / Legacy / SF2E** → **Core / Supplemental / Misc** → individual packs. Era and category headers have tri-state checkboxes. SF2E packs get their own top-level era section.

**Default selection:** Auto-selects all Remaster Core and Supplemental packs on first load. "Clear filters" resets `packSources` to `[]`.

## Exported Symbols Worth Knowing

| Symbol | File | Note |
|---|---|---|
| `toRecord` | `sync/sync.ts` | Core creature-to-record transform; sets `entityType` |
| `runInBatches` | `sync/sync.ts` | Concurrency/progress logic |
| `formatTimestamp` | `components/TopBar/TopBar.tsx` | Date formatting utility |
| `traitColor` | `components/StatblockDrawer/StatblockDrawer.tsx` | Trait chip color logic |
| `HP_TABLE`, `AC_TABLE`, `SAVE_TABLE`, `ATTACK_TABLE`, `DAMAGE_TABLE` | `components/CustomCreatureWizard/CustomCreatureWizard.tsx` | GM Core Remaster stat tables, all tiers, levels -1..25 |
| `linkRolls` | `components/StatblockDrawer/statblockHelpers.ts` | Wraps dice/modifiers in `.pf2roll` spans |
| `linkKeywords` | `components/StatblockDrawer/statblockHelpers.ts` | Wraps ~40 PF2E terms in `.pf2kw` tooltip spans |

## Testing

Tests were removed during the Phase 2 UI redesign. Vitest + React Testing Library remain configured in `vite.config.ts` and `src/test-setup.ts` — the framework is ready but `src/__tests__/` does not exist. When re-adding tests:

- `CreatureRow` outer element is `div[role="button"]`; inner add button: `getByRole('button', { name: /add .* to encounter/i })`
- `StatblockDrawer` always rendered; requires `onAddToEncounter` prop
- `TopBar` requires `activeSection` and `onSectionChange` props
- `ResultsList` requires `onAddToEncounter`, `filtersOpen`, `onToggleFilters` props
- Pack display names are title-cased; level badges render as `+7` / `-1`
- Rarity colors: uncommon `#8a6a18`, rare `#2a4a8a`, unique `#6a2a8a`

## Current Phase

**Phase 3 complete + post-phase additions.** Core 19 planned features plus:
- Resizable columns (drag handles between ResultsList / EncounterManager / StatblockDrawer)
- Encounter state persistence (auto-saved to IndexedDB)
- SF2E sources synced and filterable in their own era section
- Hazard entity type synced and filterable
- Trait exclude mode (green include / red exclude chips, right-click to toggle)
- Statblock: AoN external link, creature image, keyword tooltips (`.pf2kw`), clickable dice (`.pf2roll`)
- In-app DiceRoller (floating panel, keyboard shortcuts, crit highlighting)
- Encounter condition tracking with auto-reduction on turn end
- Custom creature wizard (two-step: name/level → stats/attacks/abilities with full tier selection from GM Core tables)
- Encounter creature saves display (Fort/Ref/Will)
- Clickable creature names in combat (jumps to statblock)
- Rules Reference section (Conditions + Basic Actions, searchable accordion)
- Party tracker / Characters section (card grid, HP tracking, Dexie persistence)
- Persistent custom creature builder (wizard in StatblockDrawer column, saves to IndexedDB, custom statblock view, delete with confirmation)
