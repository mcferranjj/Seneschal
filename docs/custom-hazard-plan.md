# Custom Hazard Wizard — Implementation Plan

Support for creating and editing custom hazards, using the same wizard as custom creatures. Hazard-specific fields, tables, and rendering are added alongside the existing creature path with no changes to creature behaviour.

---

## 1. New Data — `pf2eTables.ts`

Add four new hazard-building tables sourced from **GM Core Tables 2-13 through 2-16**.

### New tier type aliases

```ts
export type HazardDCTier      = 'low' | 'high' | 'extreme';
export type HazardDefenseTier = 'low' | 'high' | 'extreme';
export type HazardSaveDCTier  = 'high' | 'extreme';
export type HazardAttackTier  = 'simple' | 'complex';
```

### `HAZARD_STEALTH_DISABLE_TABLE` (Table 2-13)
Stealth and Disable DCs at `extreme`, `high`, and `low` tiers, levels −1 through 24.

### `HAZARD_DEFENSE_TABLE` (Table 2-15)
Per level: AC (`extreme`/`high`/`low`), Save (`extreme`/`high`/`low`), Hardness, and HP range (midpoint used as default). Broken Threshold is always HP ÷ 2 and is calculated, not stored in the table.

### `HAZARD_OFFENSE_TABLE` (Table 2-16)
Per level: Simple attack bonus (`S. Atk`), Complex attack bonus (`C. Atk`), Simple damage, Complex damage, Extreme DC (`EDC`), Hard DC (`HDC`).

---

## 2. Schema — `schema.ts`

### `CreatureRecord` — new top-level indexed field
```ts
isComplex?: boolean;   // indexed for filtering; set for hazards only
```

### `CreatureRecord.customData` — new hazard-specific fields
```ts
hardness?: number;
hasHealth?: boolean;       // false = no physical component; suppresses AC/saves/HP/hardness
stealthDC?: number;
stealthDetails?: string;   // e.g. "legendary", "or detect magic"
isComplex?: boolean;       // mirrored from top-level for wizard round-trips
disable?: string;          // HTML or plain text
reset?: string;            // HTML or plain text
routine?: string;          // HTML or plain text; complex hazards only
```

---

## 3. `pf2eConstants.ts`

No changes required. `HAZARD_TYPES` (Trap, Haunt, Environmental, Magical, Mechanical) already exists.

---

## 4. `sync.ts` — `toRecord()`

When `entityType === 'hazard'`, read `creature.system?.details?.isComplex` and set the top-level `isComplex` field on the resulting `CreatureRecord`.

---

## 5. `CreatureRepository.ts`

Add `isComplex?: boolean` to `SearchFilters`. When the filter is set, include only hazards where `c.isComplex === filterValue`.

---

## 6. `CustomCreatureWizard.tsx`

### Step 0 (first page)

New field order:

1. **Name** (unchanged)
2. **Level** (unchanged)
3. **Building a…** toggle — `Creature` (default) | `Hazard`
4. *(Hazard only)* **Complexity** toggle — `Simple` (default) | `Complex`
5. *(Creature only)* **Size** grid
6. **Type** grid — Creature Types in creature mode; Hazard Types (Trap, Haunt, Environmental, Magical, Mechanical) in hazard mode

**Next →** requires name + a selected type (creature type or hazard type). For hazards, `goNext()` calls `applyHazardTiers()` instead of `applyTiers()`, which sets tier-based stat defaults from the new tables appropriate to the selected complexity.

---

### Step 1 (stats page) — Hazard mode layout

| Section | Hazard behaviour |
|---|---|
| **Traits** | Hazard type chip fixed (like creature type chip) + extras input |
| **Stealth** | Replaces Perception. Tier buttons (E/H/L from Table 2-13). Numeric DC input. Small `details` text field (e.g. "legendary", "or detect magic") |
| **Has Physical Component** | Toggle. When off, suppresses AC, saves, HP, and Hardness from output entirely (models purely magical / formless hazards) |
| **Defenses** | AC and each save use tier buttons (E/H/L from Table 2-15). **Hardness** numeric field added between AC and saves. Only shown when *Has Physical Component* is on |
| **HP** | Tier buttons (E/H/L from Table 2-15 HP midpoints). Only shown when *Has Physical Component* is on. **Broken Threshold** shown as read-only calculated value (HP ÷ 2) |
| **Hazard Details** | Dedicated section: `isComplex` shown read-only (set in step 0). **Disable** textarea (HTML). **Reset** textarea (HTML). **Routine** textarea (HTML) — shown only when `isComplex = true` |
| **Attacks** | Present. Tier buttons use Table 2-16: Simple Atk / Complex Atk for bonus; Simple Dmg / Complex Dmg for damage. Defaults chosen based on complexity set in step 0 |
| **Abilities** | Present and unchanged (used for reactions, passive effects, etc.) |
| **Immunities / Resistances / Weaknesses** | Present and unchanged |
| **Description** | Present and unchanged |
| **Skills** | **Removed** |
| **Languages** | **Removed** |
| **Ability Modifiers** | **Removed** |
| **Speed** | **Removed** |
| **Spellcasting** | **Removed** |

---

### `handleSave()` — hazard mode

- `entityType: 'hazard'`
- `data.type: 'hazard'`
- `size: 'med'` (fixed, not user-chosen)
- Top-level `isComplex` set from wizard state
- Mirror hazard fields into `data.system`:
  - `attributes.hardness`
  - `attributes.hasHealth`
  - `attributes.stealth = { value: stealthDC, details: stealthDetails }`
  - `attributes.hp` / `attributes.ac` / `saves` — only when `hasHealth = true`
  - `details.isComplex`
  - `details.disable`
  - `details.reset`
  - `details.routine`
- Store the same fields in `customData` for round-trip editing
- Omit: ability scores, speeds, senses, languages, spellcasting, allSavesNote

---

## 7. `importCreature.ts` — `importCreatureAsCustom()`

When `source.entityType === 'hazard'`, extract from `source.data.system`:
- `attributes.hardness`
- `attributes.hasHealth`
- `attributes.stealth.value` / `.details`
- `details.isComplex` → also set top-level `isComplex` on the new record
- `details.disable`
- `details.reset`
- `details.routine`
- Still extract: immunities, resistances, weaknesses, attacks, abilities (actions/reactions), publicNotes as flavorText
- Omit: speeds, skills, languages, ability scores, spellcasting
- `data.type: 'hazard'`

The wizard reads `editCreature.entityType` on load to restore the `entityKind` toggle to `'hazard'` and reads `customData.isComplex` to restore the complexity toggle.

---

## 8. `StatblockDrawer.tsx` — Custom hazard rendering

When `creature.packSource === 'custom'` and `creature.entityType === 'hazard'`:

- **Header**: show "Complex Hazard" or "Simple Hazard" label instead of just "Hazard"
- **Traits row**: show "complex" trait chip when `isComplex = true`
- **Stealth line**: show `Stealth DC X (details)` instead of Perception
- **Defenses**: show `Hardness X` before HP (when `hasHealth` and `hardness > 0`); show `BT X` (HP ÷ 2) after HP value; suppress AC/saves/HP block entirely when `hasHealth = false`
- **Omit**: ability scores paragraph, languages, skills, speed
- **Disable block**: bold "Disable" header + rendered HTML content (after defenses, before abilities)
- **Routine block**: shown when `isComplex = true` and routine is non-empty
- **Reset block**: shown when non-empty
- Level scaling button already suppressed for all hazards — no change needed

---

## What does not change

- Existing creature wizard path is 100% untouched
- Official hazard rendering is unaffected (reads from `data.system` directly)
- Search panel hazard type filter already works
- `entityType` already stored and read correctly throughout
