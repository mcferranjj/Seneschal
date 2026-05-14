# Codebase Reorganization Plan

**Status:** Approved — decisions recorded below. Ready for implementation.

### Decisions Made
| Question | Decision |
|---|---|
| Top-level folder name | `src/features/` (rename from `components/`) |
| `App.tsx` location | Stay at `src/App.tsx` |
| DB repository layer | Include in first implementation pass |
| Shared CSS | `src/styles/` directory for theme variables and shared styles |
| Barrel files | Yes — each feature folder gets an `index.ts` |

---

## Goals (restated from project brief)

1. Reorganize by **feature** rather than by layer
2. **Reduce redundancies** — eliminate duplicate constants, functions, and patterns
3. **Enforce modularity** — blind interfaces, reusable utilities, clear separation of concerns
4. **Testability** — pure logic should be isolated from UI and DB so Vitest suites can be added easily
5. **Human readability** — every file should have a clear, narrow purpose that is obvious from its location and name

---

## Proposed Directory Structure

```
src/
├── main.tsx                          # Unchanged — app entry point
├── index.css                         # Kept — global CSS reset only (no variables)
│
├── styles/                           # NEW — shared design tokens and global styles
│   ├── variables.css                 # CSS custom properties (colors, spacing, typography)
│   └── global.css                    # Any remaining global styles beyond reset
│
├── data/                             # NEW — pure static data, no logic, no imports
│   ├── pf2eTables.ts                 # All PF2E stat tables (HP, AC, saves, attack, damage, etc.)
│   ├── conditions.ts                 # CONDITION_CATEGORIES, VALUED_CONDITIONS, CONDITIONS list
│   └── pf2eConstants.ts              # CREATURE_TYPES, SIZES, RARITIES, LANGUAGES, DAMAGE_TYPES, etc.
│
├── types/                            # Unchanged location, some additions
│   ├── pf2e.ts                       # Unchanged — raw Foundry JSON types
│   ├── encounter.ts                  # Unchanged — internal encounter domain types
│   ├── diceHistory.ts                # Unchanged — roll history entry type
│   └── conditionEffects.ts           # Unchanged — condition penalty logic + StatPenalties type
│
├── db/                               # Unchanged location, consolidated types + repository layer
│   ├── schema.ts                     # MOVE CharacterRecord and EncounterStateRecord here from db.ts
│   ├── db.ts                         # Database class + singleton + loadEncounterState/saveEncounterState
│   └── repositories/
│       ├── ICreatureRepository.ts    # NEW — interface (blind contract for creature reads/writes)
│       ├── ICharacterRepository.ts   # NEW — interface (blind contract for character reads/writes)
│       ├── CreatureRepository.ts     # NEW — Dexie implementation of ICreatureRepository
│       └── CharacterRepository.ts    # NEW — Dexie implementation of ICharacterRepository
│
├── utils/                            # Pure utility functions — no React, no DB
│   ├── async.ts                      # NEW — runInBatches (moved from sync.ts)
│   ├── dice.ts                       # NEW — parseDice, cryptoD, rollDice, rollCrit (from DiceRoller.tsx)
│   ├── pf2eHelpers.ts                # NEW — getLevel, getSize (canonical, replaces duplicates in sync.ts + statblockHelpers.ts)
│   ├── traitColors.ts                # NEW — traitColor, RARITY_COLORS, TRAIT_COLORS (from StatblockDrawer + CreatureRow)
│   ├── formatters.ts                 # NEW — formatMod, formatTimestamp, formatTime (from TopBar + RollHistory + statblockHelpers)
│   ├── foundryMacros.ts              # NEW — stripFoundryMacros, linkRolls, linkKeywords, applyEliteWeakToHtml, extractDamageGroups
│   ├── importCreature.ts             # Mostly unchanged — importCreatureAsCustom, importSpellcasting
│   └── levelScaling.ts               # Mostly unchanged — now imports tables from data/pf2eTables.ts
│
├── sync/                             # Unchanged location
│   ├── github.ts                     # Unchanged (not analyzed — external API layer)
│   ├── packList.ts                   # Minor cleanup only (remove unused isCorePack)
│   └── sync.ts                       # Minor cleanup — extract runInBatches to utils/async.ts, use pf2eHelpers
│
├── search/
│   └── search.ts                     # Minor cleanup only
│
├── hooks/                            # NEW — shared React hooks extracted from components
│   ├── useOutsideClick.ts            # NEW — replaces repeated window pointerdown pattern
│   ├── useFloatingPanel.ts           # NEW — drag + clamp + outside-click for all roller panels
│   ├── useRollState.ts               # NEW — diceRoll/damageRoll/multiDamageRoll state + handlers
│   └── useTraitKeywords.ts           # NEW — wraps the initTraitDescriptions / linkKeywords singleton
│
├── features/                         # NEW top-level — one folder per major feature
│   │
│   ├── creatures/                    # Everything about looking up and browsing creatures
│   │   ├── SearchPanel/
│   │   │   ├── SearchPanel.tsx       # Trimmed — no more inline data constants
│   │   │   ├── SourceTree.tsx        # NEW — extracted era/category/pack tree UI
│   │   │   └── SearchPanel.module.css
│   │   ├── ResultsList/
│   │   │   ├── ResultsList.tsx       # Unchanged logic
│   │   │   ├── CreatureRow.tsx       # Uses shared traitColors util
│   │   │   └── ResultsList.module.css
│   │   └── index.ts                  # Barrel — exports SearchPanel, ResultsList
│   │
│   ├── statblock/                    # Everything about displaying a creature's statblock
│   │   ├── StatblockDrawer.tsx       # Trimmed outer shell only
│   │   ├── StatblockContent.tsx      # NEW — extracted from StatblockDrawer.tsx (the main body)
│   │   ├── AttackBlock.tsx           # NEW — extracted sub-component
│   │   ├── ItemBlock.tsx             # NEW — extracted sub-component
│   │   ├── SpellcastingBlock.tsx     # NEW — extracted sub-component
│   │   ├── SpellPopup.tsx            # NEW — extracted sub-component
│   │   ├── SpellNameLink.tsx         # NEW — extracted sub-component
│   │   ├── StatblockDrawer.module.css
│   │   └── index.ts                  # Barrel
│   │
│   ├── encounter/                    # Everything about building and running an encounter
│   │   ├── EncounterManager.tsx      # Trimmed — tabs, XP budget, quick-add form, creature list
│   │   ├── CreatureCard.tsx          # NEW — extracted from EncounterManager.tsx
│   │   ├── ConditionPicker.tsx       # NEW — extracted from EncounterManager.tsx
│   │   ├── EncounterManager.module.css
│   │   └── index.ts                  # Barrel — exports EncounterManager, getRecallKnowledge
│   │
│   ├── custom-creature/              # Everything about creating/editing custom creatures
│   │   ├── CustomCreatureWizard.tsx  # Trimmed — step navigation + save logic only
│   │   ├── steps/
│   │   │   ├── BasicsStep.tsx        # NEW
│   │   │   ├── DefensesStep.tsx      # NEW
│   │   │   ├── OffenseStep.tsx       # NEW
│   │   │   ├── SpellcastingStep.tsx  # NEW
│   │   │   └── DetailsStep.tsx       # NEW
│   │   ├── TierSelector.tsx          # NEW — reusable tier button component
│   │   ├── TraitInput.tsx            # NEW — autocomplete trait input
│   │   ├── CustomCreatureWizard.module.css
│   │   └── index.ts                  # Barrel
│   │
│   ├── dice/                         # Everything about rolling dice
│   │   ├── DiceRoller.tsx            # Trimmed — pure UI, uses utils/dice.ts + hooks/useFloatingPanel
│   │   ├── DamageRoller.tsx          # NEW — extracted from DiceRoller.tsx
│   │   ├── MultiDamageRoller.tsx     # NEW — extracted from DiceRoller.tsx
│   │   ├── DiceRoller.module.css
│   │   └── index.ts                  # Barrel
│   │
│   ├── roll-history/
│   │   ├── RollHistory.tsx           # Minor cleanup — uses shared formatters
│   │   ├── RollHistory.module.css
│   │   └── index.ts
│   │
│   ├── rules/
│   │   ├── RulesSection.tsx          # Trimmed — uses data/conditions.ts
│   │   ├── RulesSection.module.css
│   │   └── index.ts
│   │
│   └── characters/
│       ├── CharactersSection.tsx     # Minor cleanup
│       ├── CharactersSection.module.css
│       └── index.ts
│
├── shell/                            # NEW — app chrome (not feature-specific)
│   ├── TopBar.tsx                    # Minor cleanup — formatTimestamp moved to utils/formatters
│   ├── TopBar.module.css
│   └── App.module.css                # Layout CSS for the root App component
│
└── App.tsx                           # Trimmed — imports from features/*, uses extracted hooks
```

---

## Key Decisions

### 1. Feature-Based Organization
Components, their styles, and their closely related sub-components live together in a `features/` folder. The folder name describes *what the user is doing*, not *what layer it's in*.

**Before:** `src/components/StatblockDrawer/StatblockDrawer.tsx` (all 1,480 lines)
**After:** `src/features/statblock/` with 7 focused files

### 2. Data Tables Extracted to `src/data/`
`HP_TABLE`, `AC_TABLE`, `SAVE_TABLE`, etc. move from `EncounterManager.tsx` / `CustomCreatureWizard.tsx` to `src/data/pf2eTables.ts`. This is the most impactful single change in the project — it fixes an inverted dependency where a utility (`levelScaling.ts`) imported from a UI component.

### 3. Shared Utilities in `src/utils/`
Pure functions with no React or DB dependencies. Each file has a single clear responsibility. This is where test suites will be easiest to add first.

Priority test targets:
- `utils/dice.ts` — `parseDice`, `rollCrit` (pure math, no side effects)
- `types/conditionEffects.ts` — `computePenalties`, `computeAttackPenalty`, `computeDamagePenalty`
- `utils/levelScaling.ts` — `scaleNumericStat`, `scaleDamageExpr`, `adjustedMaxHp`
- `utils/pf2eHelpers.ts` — `getLevel`, `getSize`, `formatMod`

### 4. Shared React Hooks in `src/hooks/`
Repeated patterns extracted once:
- `useOutsideClick(ref, onClose)` — used in 5+ components currently
- `useFloatingPanel(anchorX, anchorY, onClose)` — the drag + clamp + keyboard + outside-click logic shared by all three dice rollers
- `useRollState()` — the `diceRoll`/`damageRoll`/`multiDamageRoll` state + setter callbacks, currently duplicated between `StatblockContent` and `CreatureCard`

### 5. Consolidated Constants
Duplicate data constants (CREATURE_TYPES, SIZES, RARITIES, color maps, etc.) are consolidated into `src/data/pf2eConstants.ts`. Each piece of data has one home.

### 6. The Two Dice Rollers Become One
`DiceRoller.tsx` currently contains three separate exported components. The core damage display logic is nearly identical between `DiceRoller` (damage sub-panel) and `DamageRoller` (standalone). After extracting each to its own file and sharing `useFloatingPanel`, the remaining duplicate rendering should naturally consolidate into a shared `DamagePanel` internal component used by both.

### 7. `App.tsx` Slimmed Down
After extracting hooks and moving callbacks to where they belong, `App.tsx` should shrink significantly. The encounter state + callbacks become `useEncounter()`. The search/sync state + callbacks become `useSearch()`. `App.tsx` becomes a composition root — it wires features together, not a dumping ground for all state.

### 8. `StatblockDrawer` Two-Branch Merge
The `StatblockDrawer` outer shell currently has two identical branches for custom vs. official creatures. These are merged into one — `StatblockContent` already handles both cases internally.

---

## Files That Don't Move

| File | Reason |
|---|---|
| `src/main.tsx` | Already minimal and correct |
| `src/index.css` | Global baseline, must be at root |
| `src/test-setup.ts` | Vitest convention — must match `setupFiles` in vite.config.ts |
| `src/types/*.ts` | Already well-organized; only `schema.ts` and `db.ts` get internal changes |
| `src/search/search.ts` | Minor cleanup only; location is fine |
| `src/sync/*.ts` | Minor cleanup only; location is fine |

---

## Redundancies to Eliminate

| Redundancy | Current Location | Resolved By |
|---|---|---|
| `getLevel`, `getSize` | `sync/sync.ts` + `statblockHelpers.ts` | `utils/pf2eHelpers.ts` |
| `formatMod` | `statblockHelpers.ts` (only) | `utils/formatters.ts` |
| `formatTime` / `formatTimestamp` | `RollHistory.tsx` + `TopBar.tsx` | `utils/formatters.ts` |
| Trait color maps | `StatblockDrawer.tsx` + `CreatureRow.tsx` | `utils/traitColors.ts` |
| `CREATURE_TYPES` | `SearchPanel.tsx` + `CustomCreatureWizard.tsx` | `data/pf2eConstants.ts` |
| `SIZES` | `SearchPanel.tsx` + `CustomCreatureWizard.tsx` + `CreatureRow.tsx` | `data/pf2eConstants.ts` |
| All PF2E stat tables | `EncounterManager.tsx` + `CustomCreatureWizard.tsx` | `data/pf2eTables.ts` |
| `isLimitedUse` / `isLimitedUseText` | `statblockHelpers.ts` + `levelScaling.ts` | `utils/foundryMacros.ts` (or `utils/pf2eHelpers.ts`) |
| `processHtml` (the `strip→link→link` pipeline) | `StatblockDrawer.tsx` + `CustomCreatureWizard.tsx` | `utils/foundryMacros.ts` |
| Attack rendering JSX | `StatblockContent` (scaled) + `StatblockContent` (custom) + `AttackBlock` | Single `AttackLine` component |
| Outside-click `useEffect` | `DiceRoller`, `MultiDamageRoller`, `DamageRoller`, `TopBar`, `RollHistory`, `SpellPopup` | `hooks/useOutsideClick.ts` |
| Drag + clamp logic | `DiceRoller`, `MultiDamageRoller`, `DamageRoller` | `hooks/useFloatingPanel.ts` |
| Roll state + handlers | `StatblockContent` + `CreatureCard` | `hooks/useRollState.ts` |
| `runInBatches` | `sync/sync.ts` (only, but generic) | `utils/async.ts` |

---

## Dead Code to Remove

| Item | Location | Action |
|---|---|---|
| `getActionCostLabel` | `statblockHelpers.ts` | Remove — never called |
| `isCorePack` | `sync/packList.ts` | Remove — never imported |
| `selectEncounterCreature` | `App.tsx` | Remove or implement — currently a no-op stub |
| `void lastSynced` | `App.tsx` | Remove state or use it |
| `Confused` (duplicate) | `RulesSection.tsx` CONDITIONS array | Remove one entry |
| `formatTimestamp` | `TopBar.tsx` | Move to `utils/formatters.ts`, remove from TopBar |

---

## Blind Interface Opportunities

These are places where the internal implementation could change without callers needing to know:

### 1. DB Repository Pattern
Currently every feature imports `db` directly and calls Dexie methods inline. A thin repository layer would let us swap storage backends and write tests without a real IndexedDB:

```ts
// src/db/repositories/CreatureRepository.ts
export interface ICreatureRepository {
  get(id: string): Promise<CreatureRecord | undefined>;
  search(filters: SearchFilters): Promise<SearchResult>;
  bulkPut(records: CreatureRecord[]): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
```

Callers use `ICreatureRepository` — tests inject a mock, production injects the Dexie implementation. This is the most impactful testability improvement beyond code organization.

### 2. `ITraitKeywordService`
The `_keywordMap` / `_keywordRegex` module-level globals in `statblockHelpers.ts` are effectively a singleton service. Wrapping this in an interface (even a simple one) would allow the statblock renderer to work without trait descriptions loaded (tests, first render):

```ts
export interface ITraitKeywordService {
  link(html: string): string;
  isReady(): boolean;
}
```

### 3. Dice Engine Interface
`parseDice` and the roll functions could be behind an interface so the roller UI doesn't care whether it's using `crypto.getRandomValues` or a seeded test RNG:

```ts
export interface IDiceEngine {
  parse(expr: string): ParsedDice | null;
  roll(parsed: ParsedDice): RollResult;
  rollCrit(parsed: ParsedDice, traits: string[]): CritResult;
}
```

---

## Implementation Order

Implementation proceeds in this order to minimize breakage at each step. Each step should leave the app fully functional before moving to the next.

1. **`src/styles/`** — create `variables.css` and `global.css`, migrate CSS custom properties out of `index.css`. Update `main.tsx` imports. No behavior change.
2. **`src/data/pf2eTables.ts`** — move all stat tables, update imports in `EncounterManager`, `CustomCreatureWizard`, `levelScaling`. No behavior change.
3. **`src/data/pf2eConstants.ts` and `src/data/conditions.ts`** — move constants, update all import sites. No behavior change.
4. **`src/utils/` files** — extract pure functions from components (`dice.ts`, `pf2eHelpers.ts`, `traitColors.ts`, `formatters.ts`, `foundryMacros.ts`, `async.ts`). Update all import sites. No behavior change.
5. **`src/db/schema.ts`** — move `CharacterRecord` and `EncounterStateRecord` into schema. Update `db.ts` and all consumers. No behavior change.
6. **`src/db/repositories/`** — create interfaces and Dexie implementations. Wire them into `App.tsx` and all consumers that currently call `db.*` directly. No behavior change (same Dexie under the hood).
7. **`src/hooks/`** — extract `useOutsideClick`, `useFloatingPanel`, `useRollState`, `useTraitKeywords`. Update components. No behavior change.
8. **Decompose large components** — split `StatblockDrawer`, `EncounterManager`, `CustomCreatureWizard` into sub-files within `src/features/`. Rename `src/components/` → `src/features/`. Update all imports. No behavior change.
9. **Consolidate attack rendering** — unify the three attack rendering paths into one `AttackLine` component.
10. **Merge `StatblockDrawer` two branches** — collapse the identical custom/official `StatblockContent` rendering paths.
11. **Slim down `App.tsx`** — extract `useEncounter` and `useSearch` hooks.
12. **Remove dead code** — `getActionCostLabel`, `isCorePack`, `selectEncounterCreature` stub, `void lastSynced`, duplicate `Confused` entry, `formatTimestamp` from TopBar.

---

## Questions for Implementation — RESOLVED

All decisions recorded in the "Decisions Made" table at the top of this document.
