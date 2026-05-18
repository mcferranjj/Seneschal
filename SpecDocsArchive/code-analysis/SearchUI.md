# Search UI

## Files Covered
- `src/components/SearchPanel/SearchPanel.tsx`
- `src/components/ResultsList/ResultsList.tsx`
- `src/components/ResultsList/CreatureRow.tsx`

These three components form the creature search and browsing UI — the left two columns of the GM view.

---

## SearchPanel.tsx

### Purpose
The filter sidebar. Renders all search filter controls and calls `onChange` with updated filter state whenever any filter changes. Stateless with respect to the actual search results — it only manages filter UI state (collapse states, trait input, pack groupings).

### Props
| Prop | Description |
|---|---|
| `filters: SearchFilters` | Current filter state (owned by `App.tsx`) |
| `onChange: (filters) => void` | Callback to update filter state in `App.tsx` |
| `disabled: boolean` | True while syncing with no creatures yet — disables all controls |
| `partyLevel: number` | Used by the "Use party level" button to set level range |

### Internal State
- `allTraits` — all unique trait values from DB (for autocomplete)
- `allPacksWithMeta` — all pack sources with era/category (for the source tree)
- `traitInput` — the current text in the trait search input
- `collapsedEras`, `collapsedCategories` — which sections of the source tree are collapsed
- `packsInitialized` — ref flag to only set default pack selections once

### Default Pack Selection
On first load (after the disabled state lifts), automatically selects all Remaster core + supplemental packs plus `'custom'` as the default `packSources`. This only runs once thanks to the `packsInitialized` ref.

### Filter Sections (in order)
1. **Name** — text input
2. **Level Range** — two number inputs (min/max) + "Use party level" button
3. **Traits** — include/exclude chips with autocomplete. Right-click a chip to toggle include/exclude mode. Press Enter or click +/− buttons to add. Suggestions show up to 12 matching traits.
4. **Entity Type** — checkboxes for Creature / Hazard
5. **Hazard Type** — shown only when hazards are included; checkboxes for trap, haunt, environmental, etc.
6. **Creature Type** — checkboxes for all 21 creature types (Aberration, Animal, etc.)
7. **Size** — checkboxes for 6 sizes
8. **Rarity** — checkboxes for common/uncommon/rare/unique
9. **Source** — a three-level collapsible tree: Era → Category → individual packs. Each level has a tri-state checkbox (all/none/some).
10. **Clear filters** button

### `TristateCheckbox`
A small helper component that wraps a standard `<input type="checkbox">` with `indeterminate` state support (React can't set `indeterminate` directly via JSX). Used at the era and category levels in the source tree.

### Helper Functions (internal)
- `packDisplayName(packName)` — converts pack IDs to readable names (removes `-bestiary` suffix, title-cases with exceptions for `NPC`, `PFS`, `PF2E`)
- `groupPacks(packs)` — organizes packs into a `Record<PackEra, Record<PackCategory, PackSourceInfo[]>>` structure
- `checkState(packs, selected)` — returns `'all'`, `'none'`, or `'some'` for tri-state display

### Interfaces With
| Module | Purpose |
|---|---|
| `../../search/search` | `SearchFilters`, `PackSourceInfo`, `getAllTraits`, `getAllPackSourcesWithMeta` |
| `../../sync/packList` | `PackEra`, `PackCategory` |

### Cleanup Opportunities
- The `eslint-disable-next-line react-hooks/exhaustive-deps` on the `useEffect` suppresses a real warning — `filters` and `onChange` are dependencies but are intentionally excluded to only run on `disabled` change. This should be refactored: extract the "initialize default packs" logic into a separate `useEffect` with an explicit ref guard, keeping it clearly separated from the data loading effect.
- The source tree rendering is complex but the logic is correct. Consider extracting `SourceTree`, `EraSection`, and `CategorySection` into sub-components to improve readability.
- `CREATURE_TYPES`, `SIZES`, `RARITIES`, `HAZARD_TYPES` are pure data that could live in a shared constants file (they are duplicated in `CustomCreatureWizard.tsx`).
- `packDisplayName` is a display formatting utility that could live in a shared `utils/display.ts`.
- The `sortBy` and `sortDir` fields are part of `SearchFilters` but the `SearchPanel` component's "Clear filters" button resets `sortBy` but omits `sortDir`. This should reset both or neither.

---

## ResultsList.tsx

### Purpose
Renders the list of creature search results. Handles empty/loading/syncing states and provides the toolbar (result count, filter toggle, sort controls). Delegates individual row rendering to `CreatureRow`.

### Props
| Prop | Description |
|---|---|
| `results` | Array of `CreatureRecord` from the current search |
| `totalCount` | Total result count (always equals `results.length` currently) |
| `selectedId` | Currently selected creature ID (for highlighting) |
| `onSelect` | Called when a row is clicked |
| `onAddToEncounter` | Called when the + button on a row is clicked |
| `loading` | True while a search is in progress |
| `syncing` | True while a sync is running |
| `creatureCount` | Total creatures in DB (to distinguish "no results" from "not synced yet") |
| `sortBy`, `sortDir` | Current sort state |
| `onSortChange`, `onSortDirChange` | Sort change callbacks |
| `filtersOpen` | Whether the filter panel is visible |
| `onToggleFilters` | Toggle filter panel callback |
| `onOpenWizard` | Opens the custom creature wizard |

### Behavior
- Shows the toolbar in all states (including empty/loading).
- Sort buttons: clicking the active sort button toggles direction; clicking an inactive button switches sort field.
- Empty states: "Syncing…" (sync in progress + no creatures), "Searching…" (loading), "No creatures yet" (DB empty), "No results" (search returned nothing).
- When results exist: renders a `CreatureRow` for each result, with a "＋ Custom Creature" button at the top of the list.

### Interfaces With
| Module | Purpose |
|---|---|
| `../../db/schema` | `CreatureRecord` type |
| `./CreatureRow` | Row sub-component |
| `./ResultsList.module.css` | Styles |

### Cleanup Opportunities
- The toolbar `const toolbar = (...)` is created unconditionally and inserted into every return branch. This is a reasonable pattern but could be simplified by lifting the toolbar outside the conditional returns.
- `totalCount` prop is always equal to `results.length` and could be removed (or the component could just use `results.length` internally).

---

## CreatureRow.tsx

### Purpose
Renders a single creature result row: name, rarity chip, level badge, up to 3 trait chips, size label, and an "Add to encounter" button.

### Props
| Prop | Description |
|---|---|
| `creature` | `CreatureRecord` |
| `isSelected` | Whether this row is the currently selected creature |
| `onClick` | Called on row click |
| `onAddToEncounter` | Called on "+" button click (stops propagation) |

### Visual Details
- Rarity chip shown only for non-common creatures.
- Up to 3 traits shown as colored chips (color from `TRAIT_COLORS` dict or default brown).
- Size label from `SIZE_LABELS` map.
- Level badge changes color when selected.
- Keyboard accessible: responds to Enter and Space.

### Constants (file-local)
- `RARITY_COLORS` — hex colors for uncommon/rare/unique
- `TRAIT_COLORS` — hex colors for common creature types
- `SIZE_LABELS` — size code to display name map

### Interfaces With
| Module | Purpose |
|---|---|
| `../../db/schema` | `CreatureRecord` type |
| `./ResultsList.module.css` | Styles (shared with `ResultsList`) |

### Cleanup Opportunities
- `RARITY_COLORS` and `TRAIT_COLORS` are partially duplicated in `StatblockDrawer.tsx` (`TRAIT_RARITY_COLORS`, `TRAIT_ALIGNMENT_COLORS`, `traitColor`). A single shared color utility (`utils/traitColors.ts`) should own all trait/rarity color mapping.
- `SIZE_LABELS` is duplicated in `SearchPanel.tsx` (as `SIZES` with `{ value, label }` pairs). The size label mapping should be one canonical source.
- The component is well-focused and clean as-is. The main opportunity is consolidating the constants into shared files.
