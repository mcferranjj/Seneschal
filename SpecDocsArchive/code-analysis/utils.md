# Utils Directory

## Files Covered
- `src/utils/importCreature.ts`
- `src/utils/levelScaling.ts`

These two files are closely related: `levelScaling.ts` imports `importSpellcasting` from `importCreature.ts`, and both operate on `CreatureRecord` data to produce derived stat objects.

---

## importCreature.ts

### Purpose
Transforms a `CreatureRecord` (backed by raw Foundry VTT PF2E JSON) into a new `CreatureRecord` in the custom creature format — ready to be saved to the DB and edited by the user. Also exports `importSpellcasting`, a sub-transformation used independently by `levelScaling.ts` and `StatblockDrawer.tsx`.

### Exports

#### `importSpellcasting(creature: CreatureRecord): CustomSpellcastingEntry[]`
Extracts spellcasting entries from a creature's `items` array and converts them into `CustomSpellcastingEntry[]` (the app's internal format). Handles:
- Tradition mapping (`arcane`, `divine`, `occult`, `primal`)
- Type mapping (`prepared`, `spontaneous`, `innate`)
- DC and attack modifier extraction from `spelldc` field
- Spell grouping by their `location.value` (which entry they belong to)
- Frequency detection for innate spells: checks `location.uses` object, then falls back to description text pattern matching
- Focus point detection

Internal helpers:
- `mapActionCost(raw)` — converts raw action cost values to `AbilityActionType`
- `mapTradition(raw)` → `SpellTradition`
- `mapPreparedType(raw)` → `SpellcastingType`
- `detectInnateFrequency(spellSystem)` → `SpellFrequency | undefined` (checks structured data, then regex on description)

#### `importCreatureAsCustom(source: CreatureRecord): CreatureRecord`
The main export. Reads every stat from `source.data` (raw PF2E JSON) and produces a new `CreatureRecord` where:
- `id` is freshly generated (`custom-{timestamp}-{random}`)
- `packSource` is `'custom'`
- `name` gets `' (Custom)'` appended
- `data` is a reconstructed `PF2ECreature` object with all raw values copied in
- `customData` contains all the structured overrides (attacks, abilities, speeds, senses, immunities, resistances, weaknesses, spellcasting, skills, languages, flavorText, allSavesNote)

Fields extracted and converted:
- Core stats: HP, AC, Fort, Ref, Will, all ability mods, Perception, level
- Speeds: `land` (from `speed.value`) + `otherSpeeds` (climb, swim, burrow, fly)
- Senses: from `perception.senses`
- Immunities, resistances, weaknesses: from `attributes.*`
- Skills: from `system.skills`, filtered to non-zero mods
- Languages: from `details.languages` or `traits.languages` (handles string or object form)
- Attacks: via `getAttacks(c)` → maps items to `CustomAttack[]`. Uses `getDamageString` for the damage expression.
- Abilities: via `getPassives(c)` + `getActions(c)` → maps items to `CustomAbility[]`. Extracts trigger and requirements from description HTML via regex.
- Spellcasting: via `importSpellcasting(source)`
- Flavor text: `system.details.publicNotes`

### Interfaces With
| Module | Purpose |
|---|---|
| `../db/schema` | `CreatureRecord` type |
| `../types/encounter` | All `Custom*` types, `AbilityActionType`, etc. |
| `../components/StatblockDrawer/statblockHelpers` | `getDamageString`, `getAttacks`, `getActions`, `getPassives`, `stripFoundryMacros` |

### Cleanup Opportunities
- `importCreatureAsCustom` reconstructs a full `PF2ECreature` object in its `data` field (with many `as any` casts). This is done so the custom creature can be rendered by the same `StatblockContent` component as official creatures. A cleaner approach would be to have the statblock renderer prefer `customData` fields over raw `data` fields when present — eliminating the need to reconstruct the raw PF2E blob at all.
- `mapActionCost`, `mapTradition`, `mapPreparedType` are private helpers duplicating logic that partially exists in `StatblockDrawer.tsx` (the `actionSymbol` function) and `encounter.ts` (`AbilityActionType` union). These mappings should be consolidated into one canonical location.
- Trigger and requirements are extracted from raw HTML via regex (`<strong>Trigger<\/strong>...`). This is fragile and tied to Foundry's HTML format. It works for official creatures but could break on differently formatted descriptions.
- The function uses `as any` in two places to work around the `PF2ESystem` type being strict. This points to a gap in the type definitions — `PF2ESystem` could have a broader `Record<string, unknown>` escape hatch for fields not yet typed.

---

## levelScaling.ts

### Purpose
Implements the PF2E creature level-scaling algorithm, plus elite/weak adjustment helpers. Scales any numeric stat or damage expression from a creature's base level to a target level using the official PF2E creature creation tables.

### Algorithm (core)
For each scalable stat:
1. Find which tier (e.g., 'low', 'moderate', 'high') the base value falls into at the creature's native level.
2. Compute the flat differential: `actual value − table value at that tier`.
3. Look up the same tier at the target level.
4. Return `table value at target level + differential`.

This ensures the creature's relative power position within its tier is preserved across level changes, and that scaling is always idempotent (reads from original data, never from a prior scaled snapshot).

### Tables Used
All PF2E creature creation tables are imported from `CustomCreatureWizard.tsx`:
`HP_TABLE`, `AC_TABLE`, `SAVE_TABLE`, `ATTACK_TABLE`, `DAMAGE_TABLE`, `AREA_DAMAGE_TABLE`, `ABILITY_TABLE`, `PERCEPTION_TABLE`, `RES_WEAK_TABLE`

> **Note**: This is a significant design issue. The authoritative source of these tables is `CustomCreatureWizard.tsx` (a UI component), but `levelScaling.ts` (a utility) imports them from there. The tables are pure data and should live in their own file (e.g., `data/pf2eTables.ts`).

### Key Exports

#### Scaling Functions
| Function | Description |
|---|---|
| `scaleDamageExpr(expr, baseLevel, targetLevel)` | Scales a single-target damage expression (e.g., `"2d8+9"`) using the strike damage table |
| `scaleAreaDamageExpr(expr, baseLevel, targetLevel, isLimited)` | Scales a multi-target (area) damage expression using the area damage table |
| `scaleAbilityHtml(rawHtml, baseLevel, targetLevel)` | Scales all damage and DC values embedded in a Foundry HTML ability description |
| `buildScaledCreature(creature, targetLevel)` | Master function: scales all stats for a creature and returns a `ScaledStats` object |

#### Elite/Weak Helpers
| Function | Description |
|---|---|
| `eliteWeakLevel(baseLevel, adjustment)` | Returns the effective displayed level after elite/weak (elite: +1 or +2, weak: -1 or -2) |
| `eliteWeakHpDelta(startingLevel, adjustment)` | Returns the HP delta (e.g., +15, -20) based on level |
| `adjustedMaxHp(c)` | Returns the final max HP accounting for both scaled level and elite/weak adjustment |

### `ScaledStats` Interface
Returned by `buildScaledCreature`. Contains:
- `targetLevel`, `ac`, `hp`, `fort`, `ref`, `will`, `perception`
- `str`, `dex`, `con`, `int`, `wis`, `cha`
- `skills: Array<{ name, mod }>`
- `attacks: Array<{ name, bonus, damage, traits, type, range? }>`
- `spellcasting: CustomSpellcastingEntry[]`
- `resistances`, `weaknesses: Array<{ type, value, exceptions? }>`

### `scaleAbilityHtml` — Detailed Behavior
This is the most complex function. It scales three types of values embedded in raw Foundry HTML:
1. **`@Damage[...]` macros** — scales the dice expression. Detects area vs. single-target via `options:area-damage` tag or keyword patterns in the HTML (`each creature in the swarm's space`, etc.).
2. **`@Check[dc:N]` macros** — scales the DC value. Flat checks (`@Check[flat|...]`) are never scaled.
3. **Plain-text `DC N` and bare dice expressions** — scaled using a "masked" approach: macro bodies are replaced with spaces so that bare-text patterns inside macros are not double-scaled.

### Internal Helpers
- `findTierAndDiff` — core tier-matching algorithm
- `scaleNumericStat` — applies `findTierAndDiff` and looks up the target level value
- `exprToAvg` / `applyDiffToEntry` — damage expression average calculation and reconstruction
- `isAreaByKeyword` — detects area-effect abilities by HTML keyword patterns
- `isLimitedUseText` — detects limited-use abilities from description text
- `applyMaskedReplacements` — applies regex replacements to original text using match positions found in a "masked" copy

### Interfaces With
| Module | Purpose |
|---|---|
| `../db/schema` | `CreatureRecord` type |
| `../types/pf2e` | `PF2ECreature` type |
| `../types/encounter` | `CustomSpellcastingEntry` type |
| `../components/CustomCreatureWizard/CustomCreatureWizard` | All stat tables (the critical import issue) |
| `./importCreature` | `importSpellcasting` |

### Cleanup Opportunities
- **Move stat tables out of `CustomCreatureWizard.tsx`**. They are pure data constants with no React dependency. Moving them to `src/data/pf2eTables.ts` (or similar) would break the circular-feeling import, make the tables importable by any file that needs them, and make `CustomCreatureWizard.tsx` significantly shorter.
- **`isLimitedUseText`** in `levelScaling.ts` duplicates the logic of **`isLimitedUse`** in `statblockHelpers.ts`. These should be one function.
- **`AC_TIERS`** is reused as the tier list for the damage table** (which also has `low/moderate/high/extreme` tiers). This is confusing — the damage table tiers and AC tiers happen to share the same names, but they're logically distinct. A comment or rename would help.
- `buildScaledCreature` handles both official (PF2E item) attacks and custom (customData) attacks separately. The two code paths are nearly identical and could be unified.
- The `as Record<number, Record<string, number>>` casts throughout are a workaround for the table types being strongly typed with specific tier string literals. If the tables were moved to a shared file, this cast could be replaced with proper generics.
