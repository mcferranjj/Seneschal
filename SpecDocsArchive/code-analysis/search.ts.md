# search.ts

## Purpose
Implements the creature search and filtering system against the local IndexedDB. Provides the `searchCreatures` function consumed by `App.tsx` and several helper functions for populating filter options in the UI.

## Location
`src/search/search.ts`

## Exports

### Types
| Type | Description |
|---|---|
| `PackSourceInfo` | `{ name: string; era: PackEra; category: PackCategory }` — annotated pack metadata for filter display |
| `SearchFilters` | The full filter state object passed down from `App.tsx` and owned by `SearchPanel` |
| `SearchResult` | `{ results: CreatureRecord[]; totalCount: number }` |

### `DEFAULT_FILTERS`
The initial filter state used on app load:
- Level range: -1 to 25 (all levels)
- Sort: by level, descending
- All other filters: empty (no filter)

### Functions

| Function | Description |
|---|---|
| `searchCreatures(filters)` | Main search function. Returns a `SearchResult`. |
| `getAllTraits()` | Returns all unique trait values from the DB (for trait autocomplete in `SearchPanel`). |
| `getAllPackSources()` | Returns all unique `packSource` values from the DB. |
| `getAllPackSourcesWithMeta()` | Returns all pack sources with `era` and `category` metadata, used to render the source filter tree. |

## `searchCreatures` Implementation

### Index Selection Strategy
Chooses the most selective available index to begin the Dexie query, then applies all remaining filters in-memory:
1. If `traits` filter present → start with `where('traits').equals(traits[0])`
2. Else if `level` range filter → `where('level').between(...)`
3. Else if `rarity` filter → `where('rarity').anyOf(...)`
4. Else if `size` filter → `where('size').anyOf(...)`
5. Else if `packSources` filter → `where('packSource').anyOf(...)`
6. Else → full table scan (`toCollection()`)

### In-Memory Filters Applied
After the index-based query, a `.filter()` call applies all remaining conditions:
- Name substring match (on `nameLower`)
- Additional traits beyond the first (index only covers first trait)
- Level range (if used as fallback after index)
- Creature type (trait-based: filters by `creatureTypes` list)
- Hazard type (trait-based: filters by `hazardTypes` list)
- Size
- Rarity
- Pack source
- Exclude traits (any excluded trait means skip the record)
- Entity type (`npc` vs `hazard`)

### Sorting
After filtering, sorts the raw results array in-memory:
- `sortBy: 'level'`, `sortDir: 'asc'` → ascending level, then name as tiebreaker
- `sortBy: 'level'`, `sortDir: 'desc'` → descending level, then name as tiebreaker
- `sortBy: 'name'`, `sortDir: 'asc'` → ascending name
- `sortBy: 'name'`, `sortDir: 'desc'` → descending name

### `getAllPackSourcesWithMeta`
Fetches all unique `packSource` values from the DB, then looks each one up in `PACK_REGISTRY` (via `packList.ts`). For packs not in the registry, samples one creature record to check the `remaster` flag in its publication data, using that to infer the era.

## Interfaces With
| Module | Purpose |
|---|---|
| `../db/db` | `db` singleton for all queries |
| `../db/schema` | `CreatureRecord` type |
| `../sync/packList` | `getPackMeta`, `packRegistryHas`, `PackEra`, `PackCategory` |

## Cleanup Opportunities
- **`totalCount` is always equal to `results.length`** — the `SearchResult` shape returns both, but since all filtering is done in-memory (there's no server-side pagination), these are always the same value. Either remove `totalCount` from the return type, or implement true count-without-fetch if pagination is ever added.
- The `sortBy: 'name'`, `sortDir: 'desc'` case sorts by `b.nameLower.localeCompare(a.nameLower)` (reverse alpha), which is an unusual sort order. Worth confirming this is intentional.
- The if/else sorting block is written as `if (sortDir === 'asc') { ... } else { ... }` with the sort logic partially duplicated. A cleaner approach: compute the comparator once based on `sortBy` and `sortDir`, then call `raw.sort(comparator)` once.
- `SearchFilters` mixes search state (`name`, `traits`, etc.) with UI sort state (`sortBy`, `sortDir`). These could be split: sort state is a display concern, not a filter concern.
- The `creatureTypes` and `hazardTypes` filters work by checking the creature's `traits` array for membership. This means a "Humanoid" creature type filter is just a trait filter under the hood — the distinction between "creature type" and "trait" is a UI concern only. This dual meaning of the traits array could be documented more clearly.
