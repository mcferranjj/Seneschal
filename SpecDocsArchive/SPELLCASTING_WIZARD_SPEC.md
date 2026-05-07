# Spellcasting Support — CustomCreatureWizard Agent Spec

## Repository & Branch
- Repo: `C:/Users/mcfer/Projects/Seneschal`
- Working branch: `encounter-tracker-additions`
- All changes go on this branch; do NOT push or create a PR

---

## Context: What already exists

### Key files to read first (in order):
1. `src/types/encounter.ts` — all custom creature types (`CustomAttack`, `CustomAbility`, etc.)
2. `src/db/schema.ts` — `CreatureRecord` with `customData` field
3. `src/types/pf2e.ts` — official PF2E creature types (`PF2ECreature`, `PF2EItem`, etc.)
4. `src/components/CustomCreatureWizard/CustomCreatureWizard.tsx` — the full wizard (read entirely)
5. `src/components/StatblockDrawer/StatblockDrawer.tsx` — statblock rendering (read entirely)
6. `src/components/StatblockDrawer/statblockHelpers.ts` — helpers including `processHtml`, `stripFoundryMacros`, `linkKeywords`, `linkRolls`, `extractDamageGroups`, `isLimitedUse`, `applyEliteWeakToHtml`

### Existing custom creature data flow:
- Custom creatures are saved as `CreatureRecord` with `packSource: 'custom'`
- Their extra data lives in `customData: { attacks?, abilities?, flavorText?, speeds?, senses?, immunities?, resistances?, weaknesses? }`
- The statblock drawer renders `customData.attacks` and `customData.abilities` separately from official item rendering

---

## Your Task: Add Spellcasting to the Wizard

Add full spellcasting support to the custom creature wizard and ensure it renders correctly in the statblock.

---

## Part 1: Type Changes

### 1a. Add to `src/types/encounter.ts`:

```typescript
export type SpellTradition = 'arcane' | 'divine' | 'occult' | 'primal';
export type SpellcastingType = 'prepared' | 'spontaneous' | 'innate';
export type SpellFrequency = 'at-will' | 'cantrip' | '1/day' | '2/day' | '3/day' | 'focus' | 'constant';

export interface CustomSpell {
  name: string;
  actionCost?: AbilityActionType;  // reuse existing type
  description: string;             // raw Foundry HTML (same as CustomAbility)
  rank?: number;                   // spell rank 1–10; undefined = cantrip (rank 0)
  frequency?: SpellFrequency;      // for innate; undefined = uses slot (prepared/spontaneous)
  traits?: string[];
}

export interface CustomSpellcastingEntry {
  id: string;                      // unique local id, e.g. `spell-${Date.now()}`
  name: string;                    // e.g. "Arcane Innate Spells", "Divine Prepared Spells"
  tradition: SpellTradition;
  type: SpellcastingType;
  dc: number;
  attackMod: number;
  focusPoints?: number;            // only for entries that contain focus spells; simple user number
  spells: CustomSpell[];
}
```

### 1b. Add to `customData` in `src/db/schema.ts`:
```typescript
spellcasting?: CustomSpellcastingEntry[];
```

---

## Part 2: Wizard UI

### 2a. New "Spellcasting" section in the wizard (step 1, after Abilities)

Add a **Spellcasting** section heading with a `+ Add Spellcasting Block` button.

Each spellcasting block is a collapsible card showing:

**Block header (always visible):**
- Name text input (e.g. "Arcane Innate Spells") — placeholder: "e.g. Arcane Innate Spells"
- Tradition selector: 4 buttons `Arcane | Divine | Occult | Primal` (same style as existing type chip buttons)
- Type selector: 3 buttons `Prepared | Spontaneous | Innate`
- DC field: tier buttons (T/L/M/H/E using SAVE_TABLE for the creature's level) + number input
- Atk field: tier buttons (L/M/H/E using ATTACK_TABLE) + number input
- Focus Points field: only shown when the block contains at least one spell with `frequency: 'focus'`; simple `−/number/+` stepper (min 1, max 3)
- Remove block button (×)

**Spell list (below header):**
- Each spell shows: name input, action cost selector (same 6 buttons as abilities: ◆ ◆◆ ◆◆◆ ↺ ⟳ Passive), rank input (number 0–10; label shows "Cantrip" when 0), frequency selector (only shown for innate type — dropdown or chip buttons: At-Will / Cantrip / 1/day / 2/day / 3/day / Focus / Constant), description textarea (raw HTML; same style as ability description), remove spell button (×)
- `+ Add Spell` button at the bottom of each block

**Cantrips**: rank 0. For prepared/spontaneous, cantrips are always at-will — no frequency field needed. For innate, frequency = 'cantrip'.

**Focus spells**: frequency = 'focus'. When any spell in a block has frequency 'focus', the Focus Points stepper appears on the block header.

**Prepared spells**: The same spell name can appear multiple times in the list (to represent preparing the same spell in multiple slots). No slot enforcement needed.

### 2b. Tier button wiring
- DC tier buttons: use `lookupSave(level, tier)` (same as Fort/Ref/Will)
- Attack tier buttons: use `lookupAttack(level, tier)` (same as attack bonus)

### 2c. State
```typescript
const [spellcasting, setSpellcasting] = useState<CustomSpellcastingEntry[]>(
  initFromEdit(editCreature?.customData?.spellcasting ?? [], [])
);
```

### 2d. Save
Include `spellcasting: spellcasting.length ? spellcasting : undefined` in the `customData` of the saved `CreatureRecord`.

Also include in `data.system` for completeness (for any code that reads official fields):
```typescript
// Inside the system blob, mirror spellcasting DCs so elite/weak adjustments can find them
// (optional — only if straightforward; otherwise skip)
```

---

## Part 3: Statblock Rendering

In `src/components/StatblockDrawer/StatblockDrawer.tsx`, in the `StatblockContent` function, add spellcasting rendering for custom creatures.

### 3a. Where to insert
Currently custom creature rendering order in the statblock body is:
1. Passives (official items — empty for custom)
2. Reactions (official items — empty for custom)
3. Divider + Speed
4. Attacks (official items — empty for custom)
5. Custom attacks (`customData.attacks`)
6. Offense actions (official items — empty for custom)
7. Elite/Weak ability note + custom abilities (`customData.abilities`)

**Insert spellcasting between step 6 and 7** — i.e. after official offense actions, before custom abilities. This mirrors where official spellcasting appears.

### 3b. Spellcasting block rendering

For each `CustomSpellcastingEntry`:

```
[Tradition] [Name]                    (e.g. "Arcane Innate Spells")
DC [dc] attack +[attackMod]          (one line, same style as .infoLine)
[spell list]
```

**Spell list grouping:**

- **Innate**: Group by frequency. Render groups in this order:
  - Constant: "Constant" header, then spell names
  - Cantrips (At Will): "Cantrips (At Will)" header
  - At-will (non-cantrip): "At Will" header  
  - Focus: "Focus [N]" header (N = focusPoints)
  - 1/day, 2/day, 3/day: "[N]/Day" header, list spells under each

- **Prepared**: Group by rank. Render rank groups descending (rank 5 spells, then rank 4, etc.). Cantrips last. Header: "5th" / "4th" / etc. / "Cantrips (4th)"

- **Spontaneous**: Same grouping as prepared, but show slot count in header if desired (optional/skip if complex).

Each spell renders as a clickable `ItemBlock`-style div:
- Header: spell name + action symbol
- Traits chips (if any)
- Description rendered via `processHtml(stripFoundryMacros(description))` using `dangerouslySetInnerHTML` — exactly like `ItemBlock` renders official abilities
- "🎲 Roll damage" button if `extractDamageGroups(description).length > 0` (exactly like `ItemBlock`)

### 3c. Elite/Weak adjustments on spells
Use `applyEliteWeakToHtml` on the description before rendering, same as `ItemBlock` does. Use `isLimitedUse`-equivalent logic: innate 1/day+ and focus spells = limited use (±4 damage); at-will/cantrip = at-will (±2 damage). DC mod is always ±2.

### 3d. Reuse `ItemBlock` where possible
If the spell data can be shaped into a fake `PF2EItem`, reuse `ItemBlock` directly. Otherwise render inline with the same CSS classes.

---

## Part 4: Importing from Official Creatures (used by "Copy and Edit" feature)

A separate feature (implemented in the parent context) will call the wizard with an official `CreatureRecord` pre-populated. Your job is to ensure the wizard can accept and display imported spellcasting data.

Add a helper function (exported from the wizard file or a new `src/utils/importCreature.ts`):

```typescript
export function importSpellcasting(creature: CreatureRecord): CustomSpellcastingEntry[]
```

This function:
1. Finds all `spellcastingEntry` items in `creature.data.items`
2. For each entry, reads: `name`, `system.tradition.value`, `system.prepared.value` (→ type), `system.spelldc.dc`, `system.spelldc.value` (→ attackMod)
3. Finds all `spell` items whose `system.location.value` matches the entry's `_id`
4. For each spell: reads `name`, `system.level.value` (→ rank; 0 = cantrip), action cost from `system.time.value` or `system.actions.value`, `system.traits.value`, `system.description.value` (raw HTML)
5. For innate entries: determines frequency from the spell's `system.location.uses` or description text ("at will", "1/day", etc.) — map to `SpellFrequency`
6. Returns array of `CustomSpellcastingEntry`

**Focus points**: Read from `creature.data.system.resources.focus.max` and attach to the relevant spellcasting entry (heuristic: the entry that contains focus spells).

---

## Part 5: CSS

Add any needed styles to `src/components/CustomCreatureWizard/CustomCreatureWizard.module.css`. Follow the existing patterns:
- Spellcasting block card: same `.attackCard` style
- Spell rows within a block: similar to `.abilityCard`
- Tradition/type selectors: reuse `.typeChip` / `.typeChipActive` pattern
- Spell rank groups in statblock: a small bold label line (same weight as section subheadings in the statblock body)

---

## Constraints & Notes

- Do NOT change how official (non-custom) creatures are rendered — only add new rendering paths for `packSource === 'custom'`
- Do NOT modify the encounter tracker or `EncounterCreature` type for this feature
- The `CustomAbility` description field is already treated as raw HTML in the parent context's changes (rendered via `processHtml` + `dangerouslySetInnerHTML`). Apply the same treatment to `CustomSpell.description`
- Keep all existing wizard functionality intact — this is purely additive
- The wizard's edit mode (`editCreature` prop) must correctly round-trip spellcasting data (load from `customData.spellcasting`, save back to it)
- TypeScript strict mode is in use — no `any` casts unless absolutely necessary and existing code already uses them

---

## Definition of Done

- [ ] `CustomSpellcastingEntry` and related types added to `encounter.ts`
- [ ] `customData.spellcasting` field added to schema
- [ ] Wizard step 1 has a Spellcasting section with full add/edit/remove UI
- [ ] Tier buttons work for DC and attack modifier
- [ ] Focus points stepper appears/disappears correctly
- [ ] Prepared spells support duplicate spell names
- [ ] Statblock renders spellcasting blocks for custom creatures with correct grouping
- [ ] Spell descriptions rendered as processed HTML with inline dice rolling
- [ ] Elite/Weak adjustments applied to spell descriptions
- [ ] `importSpellcasting()` helper exported and functional
- [ ] Edit mode round-trips spellcasting data correctly
- [ ] No regressions to existing wizard or statblock functionality
