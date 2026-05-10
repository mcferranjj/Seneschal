# App.tsx

## Purpose
The root React component and central orchestrator for the entire application. It owns all shared state, coordinates communication between all major sections of the UI, and renders the top-level layout.

## Location
`src/App.tsx`

## What It Does
- Renders the app shell: `TopBar`, optional `RollHistory` banner, and the content area.
- The content area switches between three sections based on `activeSection`: `'gm'` (the main encounter-building view), `'rules'`, and `'characters'`.
- In `'gm'` mode, renders a five-column horizontal layout: filters, results, encounter manager, statblock drawer — each separated by draggable resize handles.
- Owns all state for: search filters, search results, sync progress, encounter list, party info, roll history, wizard (custom creature form), selected creature, column widths, and sidebar open/closed states.
- Handles all encounter CRUD: add, remove, rename, reorder, duplicate creature, update HP, set HP directly, apply conditions, apply elite/weak adjustment, apply level scaling.
- Handles all creature workflow: add to encounter, open wizard, save wizard, delete creature, copy as custom, select from encounter.
- Wires the database persistence layer: loads encounter state on mount, saves on every state change.
- Kicks off the data sync on mount (syncing creatures from GitHub via `runSync`).

## Key State Groups (all in `App`)
| Group | State variables |
|---|---|
| Navigation | `activeSection` |
| Search | `filters`, `results`, `totalCount`, `selected`, `searchLoading`, `creatureCount`, `lastSynced`, `syncProgress` |
| Layout | `filtersOpen`, `resultsOpen`, `wizardOpen`, `wizardEditCreature`, `filtersWidth`, `resultsWidth`, `encounterWidth` |
| Roll history | `rollHistory`, `historyOpen` |
| Encounter | `encounters`, `activeEnc`, `partySize`, `partyLevel`, `selectedEncounterUid` |

## Key Callbacks (defined in App, passed down as props)
- `addToEncounter`, `addEncounter`, `renameEncounter`, `reorderEncounters`, `deleteEncounter`
- `removeCreature`, `updateHP`, `setHPDirect`, `updateConditions`, `setEliteWeak`, `setScaledLevel`, `duplicateCreature`
- `addCustomCreature`, `openWizard`, `openEditWizard`, `handleWizardSave`
- `handleDeleteCreature`, `handleCopyCreature`, `handleResetDatabase`
- `addRollEntry`, `selectCreatureById`, `selectEncounterCreature`
- `triggerSync`, `refreshCount`

## Notable Implementation Details
- **Column drag-to-resize**: Uses `pointer capture` + direct DOM writes (`style.setProperty`) during drag to avoid per-frame React re-renders. React state is only updated once on pointer-up. Uses `widthsRef` and `dragRef` to keep handlers stable (no dependencies, never recreated).
- **Debounced search**: `useEffect` on `filters` fires the search after a 200ms debounce.
- **Encounter persistence**: `loadEncounterState` on mount, `saveEncounterState` on every change to the encounter state group. A `encounterStateLoaded` ref guards against saving before the initial load completes.
- **Sync flow**: `triggerSync` → `runSync` → callback updates `syncProgress` → on done, refreshes count and re-runs search. `initTraitDescriptions` is called after sync.
- `setScaledLevel` is the most complex callback — it reads from the DB to get original creature data, then scales stats and updates the encounter creature record.
- `SyncProgressBar` is a file-local component (not exported) that renders the sync progress UI inside the results column.

## Interfaces With
| Module | What it imports/uses |
|---|---|
| `./db/schema` | `CreatureRecord` type |
| `./db/db` | `db`, `loadEncounterState`, `saveEncounterState` |
| `./search/search` | `searchCreatures`, `DEFAULT_FILTERS`, `SearchFilters` |
| `./sync/sync` | `runSync`, `getLastSynced`, `getCreatureCount`, `resetDatabase`, `SyncProgress` |
| `./types/pf2e` | `PF2ECreature` |
| `./types/encounter` | `Section`, `Encounter`, `EncounterCreature`, `Condition`, `CustomAttack`, `CustomAbility` |
| `./types/diceHistory` | `RollHistoryEntry` |
| `./utils/importCreature` | `importCreatureAsCustom` |
| `./utils/levelScaling` | `buildScaledCreature`, `adjustedMaxHp` |
| `./components/StatblockDrawer/statblockHelpers` | `initTraitDescriptions` |
| All child components | `TopBar`, `SearchPanel`, `ResultsList`, `StatblockDrawer`, `EncounterManager`, `RulesSection`, `CharactersSection`, `RollHistory` |

## Cleanup Opportunities
- **App.tsx is doing too much.** All encounter state + callbacks could be extracted into a `useEncounter` custom hook, and all search + sync state + callbacks into a `useSearch` hook. This would dramatically reduce the file's length and make each concern independently testable.
- The `addToEncounter` callback extracts many fields from `PF2ECreature` inline — this transformation could be a standalone utility function.
- `selectEncounterCreature` is a no-op stub — either implement or remove it.
- The `void lastSynced` line suppresses an unused-variable warning — `lastSynced` should either be used (e.g., displayed in the UI) or removed from state.
- The inline `import('./db/schema').CreatureRecord` type references in several callbacks should be moved to top-level imports.
- `SyncProgressBar` is a strong candidate to be extracted to its own file (it's used only inside the results column area and has its own rendering logic).
