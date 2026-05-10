# Database Layer

## Files Covered
- `src/db/db.ts`
- `src/db/schema.ts`

---

## schema.ts

### Purpose
Defines TypeScript interfaces for every record type stored in the IndexedDB database. This is the app's persistence schema.

### Types

#### `CreatureRecord`
The primary data record for a creature stored in the database.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Foundry VTT `_id`, or `custom-{timestamp}-{random}` for custom creatures |
| `entityType` | `string` | `'npc'` or `'hazard'` |
| `name` | `string` | Display name |
| `nameLower` | `string` | Lowercase name for indexed case-insensitive search |
| `level` | `number` | Creature level (-1 to 25) |
| `traits` | `string[]` | Multi-value indexed trait list |
| `size` | `string` | Size code: `'tiny'`, `'sm'`, `'med'`, `'lg'`, `'huge'`, `'grg'` |
| `rarity` | `string` | `'common'`, `'uncommon'`, `'rare'`, `'unique'` |
| `packSource` | `string` | Pack name (e.g., `'pathfinder-monster-core'`) or `'custom'` |
| `blobSha` | `string` | GitHub blob SHA for sync diffing; empty string for custom creatures |
| `data` | `PF2ECreature` | Full raw Foundry JSON data |
| `customData?` | object | Custom creature overrides (attacks, abilities, speeds, spells, etc.) |

The `customData` object uses the `Custom*` types from `encounter.ts`:
- `attacks`, `abilities`, `speeds`, `senses`, `immunities`, `resistances`, `weaknesses`, `spellcasting`, `skills`, `languages`, `flavorText`, `allSavesNote`

#### `MetaRecord`
Tracks sync state. One record with key `'sync_state'`.

| Field | Description |
|---|---|
| `key` | Always `'sync_state'` |
| `commitSha` | The GitHub commit SHA of the last successful sync |
| `lastSynced` | Unix timestamp of last sync |
| `fileShas` | Map of `"packName/fileName"` → blob SHA for per-file diffing |

#### `TraitDescriptionsRecord`
Stores trait tooltip text fetched from the pf2e repo. One record with key `'trait_descriptions'`.

| Field | Description |
|---|---|
| `key` | Always `'trait_descriptions'` |
| `commitSha` | Repo commit SHA this was fetched at |
| `descriptions` | Map of lowercase trait name → description text |

---

## db.ts

### Purpose
Defines the Dexie database class (`SeneschalDatabase`), exports the singleton `db` instance, defines the `CharacterRecord` and `EncounterStateRecord` types, and provides helper functions for encounter state persistence.

### Database Class: `SeneschalDatabase`

Extends `Dexie`. Current version: **5**.

#### Tables
| Table | Key type | Indexes |
|---|---|---|
| `creatures` | `string` (id) | `id`, `entityType`, `nameLower`, `level`, `rarity`, `size`, `packSource`, `*traits` (multi-value) |
| `meta` | `string` (key) | `key` |
| `encounterState` | `string` (key) | `key` |
| `characters` | `string` (id) | `id` |
| `traitDescriptions` | `string` (key) | `key` |

#### Version History
- **v1**: `creatures`, `meta`
- **v2**: Added `encounterState`
- **v3**: Added `entityType` index to `creatures`; migration sets `entityType = 'npc'` on all existing records
- **v4**: Added `characters`
- **v5**: Added `traitDescriptions`

### Types Defined Here (not in schema.ts)

#### `CharacterRecord`
Player character data for the Characters section. Fields: `id`, `name`, `playerName`, `ancestry`, `class`, `level`, `hp`, `maxHp`, `ac`, `fort`, `ref`, `will`, `perception`.

#### `EncounterStateRecord`
Persisted encounter state. Fields: `key` (always `ENCOUNTER_STATE_KEY`), `encounters`, `activeEnc`, `partySize`, `partyLevel`.

### Exported Functions

| Function | Description |
|---|---|
| `loadEncounterState()` | Reads the single `EncounterStateRecord` from the DB; returns `null` if not found |
| `saveEncounterState(state)` | Upserts the single `EncounterStateRecord` via `db.encounterState.put` |

### Singleton
`export const db = new SeneschalDatabase()` — imported directly by any file that needs database access.

---

## Interfaces With
- `schema.ts` imports from `types/encounter.ts` (`Custom*` types) and `types/pf2e.ts` (`PF2ECreature`).
- `db.ts` imports from `schema.ts` (`CreatureRecord`, `MetaRecord`, `TraitDescriptionsRecord`) and `types/encounter.ts` (`Encounter`).
- `db.ts` is imported by: `App.tsx`, `sync/sync.ts`, `search/search.ts`, `utils/levelScaling.ts`, `components/CharactersSection/CharactersSection.tsx`, `components/CustomCreatureWizard/CustomCreatureWizard.tsx`, `components/SearchPanel/SearchPanel.tsx`.

---

## Cleanup Opportunities
- **`CharacterRecord` is defined in `db.ts`**, not `schema.ts`. This is inconsistent — `CharacterRecord` is a persistence schema type and should live alongside `CreatureRecord`, `MetaRecord`, etc. in `schema.ts`.
- **`EncounterStateRecord` is also in `db.ts`** and should be in `schema.ts` for the same reason.
- `loadEncounterState` and `saveEncounterState` are clean, simple wrappers — keep them but consider whether they belong in a `db/encounterState.ts` submodule as the app grows.
- The versioned migration pattern is correct for Dexie — no changes needed there, but each version upgrade should have a comment explaining *why* it was bumped, not just *what* changed.
- The `db` singleton being imported directly by many files is fine for now, but creates tight coupling to Dexie. A thin repository abstraction layer (e.g., `CreatureRepository`, `CharacterRepository`) would make the app easier to test and would allow swapping the storage backend without touching business logic.
