# Types Directory

## Files Covered
- `src/types/pf2e.ts`
- `src/types/encounter.ts`
- `src/types/diceHistory.ts`
- `src/types/conditionEffects.ts`

---

## pf2e.ts

### Purpose
TypeScript type definitions that mirror the raw JSON structure of Pathfinder 2E creature data as it comes from the Foundry VTT pf2e system repository. These types describe the *external data format* — they are not the app's internal representation.

### Key Types
- `PF2ECreature` — top-level creature document (`_id`, `name`, `type`, `items`, `system`)
- `PF2ESystem` — the `system` block containing all creature stats (details, attributes, abilities, saves, skills, perception, traits, etc.)
- `PF2EItem` — a single item on the creature (attack, action, spell, etc.)
- `PF2EItemSystem` — the `system` block of an item

### Notes
- All fields are marked optional (`?`) because the Foundry data is inconsistently structured depending on the creature type and era (legacy vs. remaster).
- `size` in `PF2ESystem.traits` can be either `{ value: string }` (object form) or a plain string — this dual shape is handled by accessor utilities like `getSize()` in `statblockHelpers.ts`.
- Languages can be a `string`, `null`, or an object — same dual-shape pattern.

---

## encounter.ts

### Purpose
Defines all types for the app's *internal* encounter and creature-management domain. This is the app's own data model, distinct from the raw PF2E JSON format.

### Key Types
| Type | Description |
|---|---|
| `Section` | `'gm' \| 'rules' \| 'characters'` — top-level navigation sections |
| `Condition` | A named condition with an optional numeric value (e.g., Frightened 2) |
| `EncounterCreature` | A creature instance *within* an encounter — tracks live HP, conditions, elite/weak, scaling, and custom stat overrides |
| `Encounter` | A named collection of `EncounterCreature[]` |
| `CustomAttack` | A melee or ranged attack defined for a custom creature |
| `CustomAbility` | An action, reaction, or passive ability for a custom creature |
| `CustomSpell` | A single spell entry for a custom creature |
| `CustomSpellcastingEntry` | A full spellcasting block (tradition, type, DC, attack, spells) |
| `CustomSkill` | A skill with name and modifier |
| `CustomSpeed` | A movement speed with type and value |
| `CustomSense` | A sense (e.g., darkvision) with optional range |
| `CustomImmunity` | A damage/condition immunity |
| `CustomResistance` | A resistance or weakness with type, value, and optional exceptions |

### Notes on `EncounterCreature`
- `uid` — a unique instance identifier (format: `${creatureId}-${Date.now()}-${Math.random()}`). Not the same as `creatureId`.
- `creatureId` — optional FK to the `CreatureRecord` in the DB (undefined for placeholder/custom creatures).
- `custom: boolean` — true for creatures created via the wizard or added as placeholders.
- `isEnemy: boolean` — false for ally/neutral placeholders; these don't count toward the XP budget.
- `eliteWeak` — applies a ±2 flat modifier to stats and adjusts HP via the elite/weak tables.
- `scaledLevel` — when set, all stats are recomputed from the original DB record using the level scaling tables.
- `baseMaxHp` — stores the pre-elite/weak HP so that toggling elite/weak multiple times doesn't stack. Reset when `scaledLevel` changes.

### Type Union Complexity
- `SpeedType`, `SpellTradition`, `SpellcastingType`, `SpellFrequency`, `AbilityActionType` are all string union types used across the custom creature wizard and statblock renderer.

---

## diceHistory.ts

### Purpose
Defines the shape of a single roll history entry stored in memory (not persisted to DB).

### Type: `RollHistoryEntry`
| Field | Description |
|---|---|
| `id` | Auto-incremented integer (assigned in `App.tsx` via `rollIdRef`) |
| `expression` | Normalized dice expression, e.g., `"2d6+3"` or `"CRIT 2d6+3"` |
| `label` | Optional human label, e.g., `"Fortitude"`, `"Bite attack"` |
| `rolls` | Array of individual die results |
| `modifier` | The flat modifier (integer) |
| `total` | Final result |
| `timestamp` | `Date.now()` at time of roll |

---

## conditionEffects.ts

### Purpose
Implements the PF2E Remaster condition penalty system. Computes numeric penalties to stats based on a creature's active conditions. Used by the statblock drawer and encounter manager to show debuffed values in the UI.

### Exports
| Function | Description |
|---|---|
| `computePenalties(conditions)` | Returns broad penalties: AC, Fort, Ref, Will, Perception, a baseline attack, and an `offGuard` flag |
| `computeAttackPenalty(conditions, attackType, traits, strMod?, dexMod?)` | Returns the total attack roll penalty for a specific attack, accounting for trait-specific rules (Clumsy vs. Dex attacks, Enfeebled vs. Str attacks, Finesse, Brutal) |
| `computeDamagePenalty(conditions, attackType, traits)` | Returns the flat damage penalty (currently only Enfeebled, for melee or thrown attacks) |

### `StatPenalties` interface
Fields: `ac`, `fort`, `ref`, `will`, `perception`, `attack` (all numbers, typically negative or zero), plus `offGuard: boolean`.

### Notable Logic
- **Clumsy** applies to Dex-based attacks: all ranged (unless brutal), and melee finesse where Dex > Str.
- **Enfeebled** applies to Str-based attacks: melee without finesse, melee finesse where Str ≥ Dex, and ranged brutal.
- **Finesse tie-breaking**: if `dexMod === strMod`, neither penalty is applied (favors the player).
- Flat-check conditions (Concealed, Hidden) are intentionally *not* in these tables — they are binary and require a separate check rather than a modifier.

### Cleanup Opportunities
- This file contains pure business logic with no React or DB dependencies — it is an ideal candidate for the first test suite.
- `computePenalties` and `computeAttackPenalty` both iterate `conditions` in a `switch` — they could share a helper for the conditions that appear in both (Frightened, Grabbed, Prone, Restrained, Sickened, Blinded, Dazzled).

---

## Cross-File Notes
- `conditionEffects.ts` imports `Condition` from `encounter.ts`. All other type files are pure declarations with no imports.
- The `Custom*` types in `encounter.ts` serve double duty: they are both the in-memory format used during encounter play and the persisted format stored in `CreatureRecord.customData`. This tight coupling means any schema change to custom creature data requires updating both `encounter.ts` and `schema.ts`.
- There is **no shared type for PF2E stat tiers** (`'low' | 'moderate' | 'high' | 'extreme'`, etc.) — these are redefined locally in `EncounterManager.tsx`, `CustomCreatureWizard.tsx`, and `levelScaling.ts`. This is a prime redundancy to eliminate.
