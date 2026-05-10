# EncounterManager.tsx

## Purpose
The encounter tracker and combat management panel. Renders the active encounter's creature list with live HP tracking, conditions, initiative, and inline dice rolling for custom creature attacks and abilities. Also contains the Recall Knowledge DC calculator used by the statblock drawer.

## Location
`src/components/EncounterManager/EncounterManager.tsx`

> **Note:** This file is very large (approximately 1,400+ lines). It contains both business logic constants (all PF2E stat tables), several significant sub-components, and the main manager component.

---

## Contents Overview

### 1. PF2E Stat Tables (data constants)
The file opens with all PF2E creature creation tables embedded directly as constants:
`HP_TABLE`, `AC_TABLE`, `SAVE_TABLE`, `ATTACK_TABLE`, `DAMAGE_TABLE`, `AREA_DAMAGE_TABLE`, `ABILITY_TABLE`, `PERCEPTION_TABLE`, `RES_WEAK_TABLE`

These are the **canonical source** of these tables in the codebase — `levelScaling.ts` imports them from here. This is one of the most significant structural issues in the project (see Cleanup below).

Additional local types: `HpTier`, `AcTier`, `SaveTier`, and `AttackDraft` (used by the custom attack form in the wizard context, though the wizard is a separate component).

`TIER_ABBREV` — maps tier names to single characters (`L`, `M`, `H`, `E`, `T`) used in the wizard's tier selector UI.

### 2. Condition Data
- `CONDITION_CATEGORIES` — the categorized list of conditions shown in the condition picker UI (Circumstantial, Status, Ability Scores, etc.)
- `VALUED_CONDITIONS` — a `Set` of conditions that take a numeric value (Frightened, Sickened, etc.)

### 3. Exported Functions

#### `getRecallKnowledge(level, traits, rarity): { dc: number; skills: string[] }`
Computes the Recall Knowledge DC and relevant skills for a creature based on:
- Base DC from the `SAVE_TABLE` (moderate tier at the creature's level + 2)
- Rarity adjustment: uncommon +2, rare +5, unique +10
- Skills: determined by creature traits (e.g., Undead → Religion, Dragon → Arcana, etc.)

This function is exported and used by `StatblockDrawer.tsx`.

### 4. Sub-Components

#### `ConditionPicker`
A categorized dropdown UI for adding conditions to an encounter creature. Grouped by `CONDITION_CATEGORIES`. Valued conditions (Frightened, Stunned, etc.) show a number input. Closes on outside click.

#### `CreatureCard`
Renders a single encounter creature row. Shows:
- Name, level, elite/weak badge, scaled level badge, custom/enemy badge
- HP bar and HP value (editable inline)
- HP adjustment buttons (−10, −5, −1, +1, +5, +10)
- Direct HP input (click the HP number to edit)
- AC, Fort, Ref, Will saves with condition penalty overlays
- Conditions (with remove button)
- Add condition button → opens `ConditionPicker`
- Initiative value (editable)
- Elite/Weak toggle buttons
- Level scale button (opens a dropdown to set scaled level)
- Attack and ability rollers for custom creatures (inline dice rolling)
- Remove / Duplicate buttons
- "View statblock" button

`CreatureCard` is a fully self-contained component with its own state for:
- `editingHp`, `hpInput` — inline HP editing
- `condPickerOpen` — condition picker visibility
- `scaleOpen` — scale dropdown visibility

#### Inline Attack Rolling (inside `CreatureCard`)
Custom creature attacks and abilities are rolled directly from `CreatureCard` using `DiceRoller`, `DamageRoller`, and `MultiDamageRoller`. This requires `CreatureCard` to maintain `diceRoll`, `damageRoll`, `multiDamageRoll` state and implement the same `roll`, `rollAttack`, `rollDamage`, `rollAllDamage` callbacks that `StatblockContent` in `StatblockDrawer.tsx` also implements.

### 5. Main Component: `EncounterManager`

**Props (passed from `App.tsx`):**
- Encounter list: `encounters`, `activeEnc`
- Party: `partySize`, `partyLevel`
- Encounter CRUD: `onActiveEncChange`, `onAddEncounter`, `onRenameEncounter`, `onDeleteEncounter`, `onReorderEncounters`
- Creature actions: `onRemoveCreature`, `onDuplicateCreature`, `onUpdateHP`, `onSetHP`, `onAddCustomCreature`, `onSelectCreature`, `onSelectEncounterCreature`, `onUpdateConditions`, `onSetEliteWeak`, `onSetScaledLevel`
- Roll: `onRoll`
- Layout: `resultsOpen`, `onToggleResults`

**State:**
- `renamingIdx` — which encounter tab is being renamed
- `addCustomOpen` — whether the quick-add custom creature form is open
- `addCustomForm` — the draft state for the quick-add form

**Encounter Tabs:** Renders one tab per encounter. Tabs are draggable for reordering (uses `dragStart`/`dragOver`/`drop` events). Active tab shows the creature list.

**XP Budget Display:** Computes total XP of all enemy creatures in the active encounter using the PF2E XP budget table. Shows budget category (Trivial/Low/Moderate/Severe/Extreme/Impossible). Budget is based on `partySize` and `partyLevel`.

**Quick-Add Custom Creature Form:** A compact inline form for adding a placeholder creature (name + level required; HP, AC, saves optional). Accessible via a "+" button.

**Creature List:** Maps encounter creatures to `CreatureCard` components, passing all necessary callbacks. Includes condition management, initiative, HP, scaling, and elite/weak handling.

---

## Interfaces With
| Module | Purpose |
|---|---|
| `../../types/encounter` | `Encounter`, `EncounterCreature`, `Condition`, `CustomAttack`, `CustomAbility` |
| `../../types/diceHistory` | `RollHistoryEntry` |
| `../../types/conditionEffects` | `computePenalties`, `computeAttackPenalty`, `computeDamagePenalty` |
| `../DiceRoller/DiceRoller` | `DiceRoller`, `cryptoD` |
| `./EncounterManager.module.css` | Styles |

---

## Cleanup Opportunities

### Critical — Stat Tables
- **All PF2E stat tables should be moved out of this file** into a dedicated `src/data/pf2eTables.ts` (or similar). These tables are pure data with no React dependency. Having a utility file (`levelScaling.ts`) import them from a UI component (`EncounterManager.tsx`) is an inverted dependency that will cause confusion and hinder testing.

### Component Decomposition
- **`CreatureCard` should be its own file.** At its current size it qualifies as a standalone component. Moving it to `EncounterManager/CreatureCard.tsx` would make both files significantly more manageable.
- **`ConditionPicker` should be its own file** (`EncounterManager/ConditionPicker.tsx`). It has no dependencies on `EncounterManager`-specific logic.
- **The inline attack/ability rolling in `CreatureCard`** duplicates the same logic in `StatblockDrawer.tsx`. Both use the same `roll`, `rollAttack`, `rollDamage`, `rollAllDamage` pattern. This could be extracted into a `useRollState()` hook used by both.

### Logic
- **`getRecallKnowledge`** is exported from `EncounterManager.tsx` but is purely a rules-calculation function with no UI dependency. It should live in `utils/pf2eRules.ts` or similar.
- The **XP budget calculation** is inline in the component JSX. This is non-trivial math (level-relative XP values) that deserves to be extracted as a testable utility function.
- **The condition penalty display** in `CreatureCard` recalculates `computePenalties` locally for each card. This is fine for now (it's cheap), but is worth noting as a duplication of the same computation in `StatblockContent`.
- `CONDITION_CATEGORIES` and `VALUED_CONDITIONS` are pure data constants that could live in `src/data/conditions.ts` alongside the condition effects logic.

### Naming
- `AttackDraft` type is defined here but only used within the wizard context. It should be co-located with the wizard or the shared types.
- The `TIER_ABBREV` constant is defined here but the wizard is a separate component — this constant likely belongs with the wizard or the tables.
