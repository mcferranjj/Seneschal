# Plan: Custom Level Scaling for Encounter Tracker

## Context
Users need to quickly scale a creature's stats to a different level without permanently altering the source creature. This mirrors the Elite/Weak adjustment pattern already in the codebase, but is more powerful: it recalculates every scalable stat holistically using the PF2e creature creation tables, preserving each stat's relative tier (e.g. "Moderate −1") across any level change. The scaling is applied per-instance in the encounter tracker and is fully reversible — scaling to a level is always computed from the **original** base creature, never stacked on top of a previous scaling.

---

## Key Decisions / Constraints
- **Non-destructive**: Never modifies the `CreatureRecord` in the DB. Works identically to `eliteWeak` — a field stored per `EncounterCreature` instance.
- **Idempotent**: Scaling is always computed from original base stats. Scaling L4→L7→L4 yields the same result as scaling L4→L4 directly.
- **Scope**: Only applies to creatures added to the encounter tracker (the `StatblockDrawer` statblock view of a selected encounter creature).
- **Level range**: Only offer levels −1 through 25 (the bounds of the creature creation tables). Hard-block out-of-range values.
- **Reversible**: A "Remove Scaling" option in the dropdown returns to base.
- **Badge**: Display a "Scaled to Lv X" badge in the statblock header and encounter row.

---

## Stat Scaling Algorithm

For every scalable numeric stat:
1. Look up what each tier equals at the creature's **base level** (from the existing tables).
2. Find the **nearest tier** whose table value is ≤ the creature's actual stat.
3. Compute `differential = actualStat − tableValueAtNearestTier` (a flat integer, e.g. +1 or −2).
4. Look up that same tier's value at the **target level**.
5. `scaledStat = tableValueAtTargetLevel + differential`.

For damage expressions (`XdY+Z`): only scale the flat bonus (`Z`). The dice (`XdY`) come from the DAMAGE_TABLE at the target tier/level. Specifically: look up the nearest damage tier at base level by comparing flat bonuses, apply the differential to the flat bonus from the target level row, keep the dice from the target level's tier entry.

For ability description damage/DCs: reuse the existing `applyEliteWeakToHtml` / `extractDamageGroups` pattern, but with the computed delta instead of a fixed ±2/±4.

---

## Tables Already Available (reuse these)
All tables are already exported from `CustomCreatureWizard.tsx`:
- `HP_TABLE`, `AC_TABLE`, `SAVE_TABLE`, `ATTACK_TABLE`, `DAMAGE_TABLE`
- `ABILITY_TABLE`, `PERCEPTION_TABLE`, `RES_WEAK_TABLE`

And lookup helpers: `lookupHp`, `lookupAc`, `lookupSave`, `lookupAttack`, `lookupDamage`, `lookupAbility`, `lookupPerception`, `lookupResWeak`.

---

## Data Model Changes

### `src/types/encounter.ts`
Add `scaledLevel?: number` to `EncounterCreature`:
```ts
scaledLevel?: number; // Target level for custom scaling; undefined = no scaling
```

---

## New File: `src/utils/levelScaling.ts`
Pure utility — no React, no side effects. Exports:

```ts
/** Find nearest tier and flat differential for a numeric stat */
function findTierAndDiff(value: number, baseLevel: number, table: Record<number, Record<string, number>>, tiers: string[]): { tier: string; diff: number }

/** Scale a single numeric stat */
export function scaleNumericStat(value: number, baseLevel: number, targetLevel: number, table, tiers): number

/** Scale a damage string "XdY+Z" — only flat bonus changes, dice from target table row */
export function scaleDamageExpr(expr: string, baseLevel: number, targetLevel: number): string

/** Scale ability description HTML: adjusts @Damage flat bonuses and @Check dc: values */
export function scaleAbilityHtml(rawHtml: string, baseLevel: number, targetLevel: number): string

/** Master function: given a CreatureRecord and target level, return a full scaled snapshot */
export function buildScaledCreature(creature: CreatureRecord, targetLevel: number): ScaledStats
```

`ScaledStats` is a plain object containing all the re-computed values (ac, hp, fort, ref, will, perception, abilities, saves, attacks, spellcasting dc/attack, resistances, weaknesses) alongside the target level. The statblock and encounter manager consume this instead of raw creature data when `scaledLevel` is set.

---

## Files to Modify

### 1. `src/types/encounter.ts`
- Add `scaledLevel?: number` to `EncounterCreature`.

### 2. `src/App.tsx`
- Add `onSetScaledLevel: (uid: string, level: number | undefined) => void` handler (same pattern as `setEliteWeak`).
- Pass it down through `EncounterManager` and `StatblockDrawer`.
- Pass `activeScaledLevel` (from `selectedEncounterUid` lookup) to `StatblockDrawer`.

### 3. `src/components/EncounterManager/EncounterManager.tsx`
- Add `onSetScaledLevel` to `EncounterManagerProps`.
- In the creature row, show a small "Lv X ↕" badge when `scaledLevel` is set (styled like the Elite/Weak badge).
- XP calculation uses `scaledLevel ?? c.level` (scaled level directly, unlike Elite/Weak which uses ±1).

### 4. `src/components/StatblockDrawer/StatblockDrawer.tsx`
- Add props: `activeScaledLevel?: number`, `onSetScaledLevel?: (level: number | undefined) => void`.
- In `StatblockContent`, render a **scale button** (⇅ icon) in `headerActions`, adjacent to the copy button.
  - Clicking opens a dropdown showing levels −1 through 25, excluding the creature's current base level.
  - Selecting a level calls `onSetScaledLevel(level)`.
  - Dropdown also has a "Remove Scaling" item at top when scaling is active.
- When `activeScaledLevel` is set:
  - Call `buildScaledCreature(creature, activeScaledLevel)` to get `ScaledStats`.
  - Use scaled values everywhere the statblock currently reads raw creature data.
  - Show a **"⇅ Scaled to Lv X"** badge in the header (styled similarly to the Elite/Weak banner, distinct color — e.g. teal/purple).
  - Show a scaled-level banner below the header (like Elite/Weak banner) noting the base level.
- Scaling and Elite/Weak are **independent and additive**: if both are active, Elite/Weak's ±2 modifiers apply on top of scaled stats (same as today, no change needed to Elite/Weak logic).

### 5. `src/components/StatblockDrawer/StatblockDrawer.module.css`
- Add styles for the scale button, dropdown, and "scaled" badge/banner.

---

## Stat Coverage

| Stat | Table | Tiers |
|------|-------|-------|
| AC | `AC_TABLE` | low/moderate/high/extreme |
| HP | `HP_TABLE` | low/moderate/high |
| Fortitude, Reflex, Will | `SAVE_TABLE` | terrible/low/moderate/high/extreme |
| Perception | `PERCEPTION_TABLE` | terrible/low/moderate/high/extreme |
| Str/Dex/Con/Int/Wis/Cha mods | `ABILITY_TABLE` | low/moderate/high/extreme |
| Attack bonus | `ATTACK_TABLE` | low/moderate/high/extreme |
| Attack damage flat bonus | `DAMAGE_TABLE` (flat part) | low/moderate/high/extreme |
| Skills | `SAVE_TABLE` (same scale) | terrible/low/moderate/high/extreme |
| Spellcasting DC | `SAVE_TABLE` | same tiers |
| Spellcasting attack mod | `ATTACK_TABLE` | same tiers |
| Resistances/Weaknesses values | `RES_WEAK_TABLE` | low/moderate/high |
| Ability description damage | `scaleAbilityHtml()` | derived from @Damage macros |
| Ability description DCs | `scaleAbilityHtml()` | derived from @Check dc: |

**Not scaled**: HP detail text, AC detail text, speed, size, traits, immunities (type-only), language, senses, flavor text, save detail notes.

---

## Reversibility Guarantee
`buildScaledCreature` always reads from `creature.data` (original base stats) — never from a previously-scaled snapshot. Therefore, scaling the same creature to any level always produces the identical result regardless of history.

---

## Verification / Testing
1. Add a creature to the encounter tracker (e.g. a level 4 creature).
2. Click ⇅ in the statblock header → select level 7.
3. Verify: AC, saves, perception, HP, attacks, damage, skills, abilities all update correctly relative to the level 7 table.
4. Switch to level 12 → verify stats update again from the original base, not from the level 7 values.
5. Switch back to level 7 → verify identical to step 3 (idempotency).
6. Click "Remove Scaling" → verify all stats return to original.
7. Test with Elite adjustment also active → verify Elite ±2 applies on top of scaled stats.
8. Verify the encounter row shows the "Lv X ↕" badge and XP is calculated at the scaled level.
9. Verify the statblock drawer shows the "⇅ Scaled to Lv X" badge.
10. Test boundary levels: level −1 and level 25.
11. Test a creature with spellcasting — verify DC and attack mod scale correctly.
12. Test a creature with ability descriptions containing @Damage and @Check macros.
