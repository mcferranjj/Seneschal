# Copy & Edit + Wizard Expansion — Agent Spec

## Repository & Branch
- Repo: `C:/Users/mcfer/Projects/Seneschal`
- Working branch: `encounter-tracker-additions`
- Do NOT push or create a PR when done

---

## Context: What already exists

### Key files to read first (in order):
1. `src/types/encounter.ts` — all custom creature types
2. `src/db/schema.ts` — `CreatureRecord` with `customData`
3. `src/types/pf2e.ts` — official PF2E creature types
4. `src/components/CustomCreatureWizard/CustomCreatureWizard.tsx` — the full wizard (read entirely)
5. `src/components/CustomCreatureWizard/CustomCreatureWizard.module.css` — wizard styles
6. `src/components/StatblockDrawer/StatblockDrawer.tsx` — statblock rendering (read entirely)
7. `src/components/StatblockDrawer/StatblockDrawer.module.css` — statblock styles
8. `src/components/StatblockDrawer/statblockHelpers.ts` — helpers: `processHtml`, `stripFoundryMacros`, `linkKeywords`, `linkRolls`, `extractDamageGroups`, `isLimitedUse`, `applyEliteWeakToHtml`, `getDamageString`, `getAttacks`, `getActions`, `getPassives`, `getSenses`, `getSpeedString`, `getImmResWeak`, `getSkills`, `getLanguages`
9. `src/App.tsx` — wires everything together; pay attention to `openEditWizard`, `handleWizardSave`, `wizardEditCreature`, `wizardOpen`

### Notes on parallel spellcasting work
A separate agent (or prior implementation) will have added spellcasting support per `SPELLCASTING_WIZARD_SPEC.md`. Before implementing anything, check whether that work is already merged into the files above. If it is, you do not need to re-implement spellcasting — just make sure your import logic (Part 3 below) calls the `importSpellcasting()` helper it exports. If it is NOT yet present, skip spellcasting in the import for now (leave a `// TODO: import spellcasting` comment).

---

## Your Tasks (5 parts)

---

## Part 1: New Fields in the Wizard

Add the following new sections/fields to the CustomCreatureWizard. All are additive — do not remove or change existing fields.

### 1a. Skills section (add after Perception, before Speed)

**Data type** — add to `src/types/encounter.ts`:
```typescript
export interface CustomSkill {
  name: string;   // e.g. "Acrobatics", "Mining Lore"
  mod: number;
}
```

Add `skills?: CustomSkill[]` to `customData` in `src/db/schema.ts`.

**Official skill list** (exact casing):
`Acrobatics`, `Arcana`, `Athletics`, `Crafting`, `Deception`, `Diplomacy`, `Intimidation`, `Medicine`, `Nature`, `Occultism`, `Performance`, `Religion`, `Society`, `Stealth`, `Survival`, `Thievery`

"Lore" is NOT in this list. Instead, any skill name containing "Lore" (e.g. "Mining Lore", "Agriculture Lore") is a custom lore skill.

**Wizard UI:**
- Section heading: "Skills"
- Each skill row: name input + tier buttons (T/L/M/H/E using `SAVE_TABLE` for the creature's level) + number input + remove (×) button
- When typing in the name input, show autocomplete suggestions from the 16 official skills. If the user types something not in that list, it's saved as typed (for custom lores)
- `+ Add Skill` button
- Tier buttons use `lookupSave(level, tier)` — skills use the same scale as saves

**State:**
```typescript
const [skills, setSkills] = useState<CustomSkill[]>(
  initFromEdit(editCreature?.customData?.skills ?? [], [])
);
```

**Save:** include `skills: skills.length ? skills : undefined` in `customData`.

**Rendering in statblock** (in `StatblockDrawer.tsx`):
Add a Skills line for custom creatures, rendered in the same style as the official skills line (clickable roll spans). Insert it immediately after the Perception line and before Languages. Each skill mod is clickable and opens a d20 roll via `roll(mod, skillName, e)`.

---

### 1b. Languages section (add after Skills, before Speed)

**Data type** — add `languages?: string[]` to `customData` in schema.

**Wizard UI:**
- Section heading: "Languages"
- Chip-style tag list showing added languages, each with a × remove button
- Text input with autocomplete suggestions from the list below. Multiple can be added. Press Enter or click `+ Add` to add.
- The input also accepts free text for any language not in the suggestions list

**Suggestion list** (common + uncommon, exact casing):
Common: `Common`, `Draconic`, `Dwarven`, `Elven`, `Fey`, `Gnomish`, `Goblin`, `Halfling`, `Jotun`, `Orcish`, `Sakvroth`
Uncommon: `Aklo`, `Chthonian`, `Diabolic`, `Empyrean`, `Kholo`, `Necril`, `Petran`, `Pyric`, `Shadowtongue`, `Sussuran`, `Thalassic`, `Muan`, `Talican`

**State:**
```typescript
const [languages, setLanguages] = useState<string[]>(
  initFromEdit(editCreature?.customData?.languages ?? [], [])
);
```

**Save:** include `languages: languages.length ? languages : undefined` in `customData`.

Also store in the system blob for completeness:
```typescript
data.system.details.languages = { value: languages }
```

**Rendering in statblock:**
Add a Languages line for custom creatures in the same style as the official Languages line (`<strong>Languages</strong> {langs.join(', ')}`). Insert it after Skills and before the ability scores / divider.

---

### 1c. `allSaves` note (add to Defenses section)

**Data type** — add `allSavesNote?: string` to `customData` in schema.

**Wizard UI:**
- A single text input beneath the Will row in the Defenses section
- Label: "All Saves Note"
- Placeholder: `e.g. +1 status bonus to all saves vs. magic`
- Optional; only saved if non-empty

**State:**
```typescript
const [allSavesNote, setAllSavesNote] = useState(
  initFromEdit(editCreature?.customData?.allSavesNote ?? '', '')
);
```

**Save:** include `allSavesNote: allSavesNote.trim() || undefined` in `customData`.
Also store: `data.system.attributes.allSaves = { value: allSavesNote.trim() }` in the system blob.

**Rendering in statblock:**
The official statblock already renders `allSaves` from `c.system?.attributes?.allSaves?.value` — since we write it to the system blob, it will render automatically. No extra custom rendering needed.

---

### 1d. Trigger and Requirements on ability cards

**Data type** — extend `CustomAbility` in `src/types/encounter.ts`:
```typescript
export interface CustomAbility {
  name: string;
  description: string;             // raw Foundry HTML
  actionType?: AbilityActionType;
  frequency?: string;              // free text, e.g. "Once per day"
  trigger?: string;                // free text; only for reaction/free actions
  requirements?: string;           // free text, optional on any action type
}
```

**Wizard UI changes to each ability card:**
- Add a "Frequency" text input field below the action type row. Always visible (any action type). Placeholder: `e.g. Once per day`. Only saved if non-empty.
- Add a "Trigger" text input field. Only visible when `actionType` is `'reaction'` or `'free'`. Placeholder: `e.g. A creature enters your reach`. Only saved if non-empty.
- Add a "Requirements" text input field. Always visible (any action type). Placeholder: `e.g. You are holding a weapon`. Only saved if non-empty.

**Rendering in statblock:**
In the custom ability rendering block in `StatblockDrawer.tsx`, before the description, render Trigger and Requirements if present — same style as official `ItemBlock` does:
```
<strong>Trigger</strong> {trigger};   (if present)
<strong>Requirements</strong> {requirements};   (if present)
<strong>Frequency</strong> {frequency}   (if present)
```
These should appear in the `.itemHeader` paragraph, same as official triggers.

---

### 1e. Ability description — rich HTML editor with live preview

**Replace** the plain `<textarea>` in each ability card with a two-part editor:

**Layout:** A small tabbed or toggle area with two modes:
- **Edit mode** (default): A textarea showing the raw HTML/text content
- **Preview mode**: The rendered output via `processHtml(stripFoundryMacros(description))` using `dangerouslySetInnerHTML`, styled with `.itemDesc` CSS class

**Toggle:** A small `Edit | Preview` tab strip above the textarea. Default to Edit mode for new abilities, Preview mode when the ability has content (on edit/import).

**Toolbar** (shown in Edit mode, above the textarea): Icon/text buttons that insert Foundry markup at the cursor position:

| Button label | Inserts |
|---|---|
| `◆` | ` ◆ ` (action symbol as text — plain) |
| `◆◆` | ` ◆◆ ` |
| `◆◆◆` | ` ◆◆◆ ` |
| `↺` | ` ↺ ` |
| `@Damage` | `@Damage[XdY[type]]{XdY type damage}` with `X`, `Y`, `type` as placeholders the user fills in |
| `DC Check` | `@Check[will\|dc:15\|basic]{DC 15 Will save}` with the save type and DC as placeholders |
| `<p>` | Wraps selected text in `<p>...</p>`, or inserts `<p></p>` if nothing selected |
| `<hr>` | Inserts `<hr />` |
| `<strong>` | Wraps selected text in `<strong>...</strong>` |

Toolbar buttons insert at the cursor using `textarea.setSelectionRange` / `execCommand` or a `ref`-based approach — whichever works cleanly in React.

**Also update `StatblockDrawer.tsx`** — custom ability descriptions are currently rendered as plain text. Change them to use `processHtml(stripFoundryMacros(description))` with `dangerouslySetInnerHTML`, the same way `ItemBlock` renders official abilities. Apply `applyEliteWeakToHtml` for elite/weak adjustments, and show the `🎲 Roll damage` button if `extractDamageGroups(description).length > 0`. Essentially: render custom abilities exactly like `ItemBlock` renders official abilities.

---

## Part 2: "Copy and Edit" Button

### 2a. Button in StatblockContent header

In `StatblockDrawer.tsx`, in `StatblockContent`, add a "Copy and Edit" button to the header actions area.

- **Placement:** Between the AoN link (or the edit button for custom creatures) and the close button — i.e. second-to-last in `.headerActions`
- **Shown for:** ALL creatures (both official and custom `packSource`)
- **Label:** `⧉ Copy` (or just the text "Copy and Edit" if space allows — use the shorter form)
- **Style:** Same as `.editBtn` (small, bordered, white-on-crimson header style)
- **Prop needed:** Add `onCopyAsCustom?: (creature: CreatureRecord) => void` to `StatblockContent`'s props and to `DrawerProps`

Wire it up: clicking the button calls `onCopyAsCustom(creature)`.

### 2b. Wiring in StatblockDrawer

Pass `onCopyAsCustom` through from `DrawerProps` into both `StatblockContent` calls (currently the custom and non-custom branches both render `StatblockContent`).

### 2c. Wiring in App.tsx

Add `onCopyCreature` callback to App. This callback:
1. Calls `importCreatureAsCustom(creature)` (see Part 3) to build a pre-populated `CreatureRecord` draft
2. Calls `setWizardEditCreature(draft)` — the draft is NOT saved to DB yet; it just pre-populates the wizard
3. Calls `setSelected(null)` — clears the current statblock
4. Calls `setWizardOpen(true)`

Pass it to `StatblockDrawer` as `onCopyAsCustom`.

---

## Part 3: Import Helper

Create `src/utils/importCreature.ts` (new file).

Export one function:

```typescript
import type { CreatureRecord } from '../db/schema';
import type { CustomAttack, CustomAbility, CustomSpeed, CustomSense,
              CustomImmunity, CustomResistance, CustomSkill } from '../types/encounter';
import { getDamageString } from '../components/StatblockDrawer/statblockHelpers';

export function importCreatureAsCustom(source: CreatureRecord): CreatureRecord
```

This function builds and returns a NEW `CreatureRecord` that is a custom copy of `source`. It does NOT save to the DB — the caller handles saving via the wizard's normal save flow.

**The returned record must have:**
- `id`: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}` — a fresh ID
- `packSource`: `'custom'`
- `blobSha`: `''`
- `name`: `source.name` (the wizard lets the user rename it)
- `nameLower`, `level`, `size`, `rarity`, `traits`, `entityType`: copied directly from source
- `data`: a new system blob (same structure as what the wizard's `handleSave` produces) populated from source's stats (see below)
- `customData`: populated from source (see below)

**Stats to extract from `source.data` (type `PF2ECreature`):**

```
hp      ← system.attributes.hp.max
ac      ← system.attributes.ac.value
fort    ← system.saves.fortitude.value
ref     ← system.saves.reflex.value
will    ← system.saves.will.value
allSavesNote ← system.attributes.allSaves?.value
strMod  ← system.abilities.str.mod
dexMod  ← system.abilities.dex.mod
conMod  ← system.abilities.con.mod
intMod  ← system.abilities.int.mod
wisMod  ← system.abilities.wis.mod
chaMod  ← system.abilities.cha.mod
perception ← system.perception.mod ?? system.perception.value
level   ← system.details.level.value
size    ← system.traits.size.value (raw string, e.g. 'med')
rarity  ← system.traits.rarity
traits  ← system.traits.value  (array of trait strings)
```

**Speeds** — map from `system.attributes.speed`:
```typescript
const speeds: CustomSpeed[] = [];
if (speed.value) speeds.push({ type: 'land', value: speed.value });
for (const s of speed.otherSpeeds ?? []) {
  if (['climb','swim','burrow','fly'].includes(s.type))
    speeds.push({ type: s.type as SpeedType, value: s.value });
}
```

**Senses** — map from `system.perception.senses`:
```typescript
const senses: CustomSense[] = (system.perception.senses ?? []).map(s => ({
  name: s.type,
  range: s.range ?? undefined,
}));
```

**Immunities** — map from `system.attributes.immunities`:
```typescript
const immunities: CustomImmunity[] = (attrs.immunities ?? []).map(i => ({ type: i.type }));
```

**Resistances / Weaknesses** — map from `system.attributes.resistances` / `weaknesses`:
```typescript
const resistances: CustomResistance[] = (attrs.resistances ?? []).map(r => ({
  type: r.type,
  value: r.value,
  exceptions: r.exceptions?.join(', '),
}));
// same for weaknesses
```

**Skills** — map from `system.skills`:
```typescript
const skills: CustomSkill[] = Object.entries(system.skills ?? {}).map(([name, data]) => ({
  name: name.charAt(0).toUpperCase() + name.slice(1), // capitalize
  mod: data.base ?? data.value ?? 0,
})).filter(s => s.mod !== 0);
```

**Languages** — map from `system.details.languages` or `system.traits.languages`:
```typescript
// try system.details.languages first (object with .value array), then system.traits.languages
const langObj = system.details?.languages ?? system.traits?.languages;
const languages: string[] = typeof langObj === 'string'
  ? langObj.split(/[,;]/).map(s => s.trim()).filter(Boolean)
  : (langObj?.value ?? []);
```

**Attacks** — map from `getAttacks(c)` (items of type 'melee'/'ranged'):
```typescript
const attacks: CustomAttack[] = getAttacks(c).map(item => {
  const damageRolls = item.system?.damageRolls ?? {};
  const effects = item.system?.attackEffects?.value ?? [];
  const damageStr = getDamageString(damageRolls);
  const fullDamage = [damageStr, ...effects].filter(Boolean).join(' plus ');
  const isRanged = item.type === 'ranged' || item.system?.range?.increment != null;
  const rangeVal = item.system?.range?.increment ?? 
                   (typeof item.system?.range?.value === 'number' ? item.system.range.value : undefined);
  return {
    name: item.name,
    type: isRanged ? 'ranged' : 'melee',
    bonus: item.system?.bonus?.value ?? 0,
    damage: fullDamage,
    range: isRanged ? (rangeVal ?? 30) : undefined,
    traits: item.system?.traits?.value ?? [],
  };
});
```

**Abilities** — map from `getActions(c)` + `getPassives(c)` (items of type 'action'):
```typescript
const actionTypeMap: Record<string, AbilityActionType> = {
  action: 'single', reaction: 'reaction', free: 'free', passive: 'passive',
};
const costMap: Record<number, AbilityActionType> = { 1: 'single', 2: 'two', 3: 'three' };

const allAbilityItems = [...getPassives(c), ...getActions(c)];
const abilities: CustomAbility[] = allAbilityItems.map(item => {
  const at = item.system?.actionType?.value;
  const cost = item.system?.actions?.value;
  let actionType: AbilityActionType | undefined;
  if (at === 'reaction') actionType = 'reaction';
  else if (at === 'free') actionType = 'free';
  else if (at === 'passive') actionType = 'passive';
  else if (cost != null) actionType = costMap[cost] ?? 'single';

  // Trigger: for reactions, description often starts with <p><strong>Trigger</strong> ...
  // Extract it into the trigger field if present
  const rawDesc = item.system?.description?.value ?? '';
  let trigger: string | undefined;
  let requirements: string | undefined;
  let cleanDesc = rawDesc;

  const triggerMatch = rawDesc.match(/<strong>Trigger<\/strong>\s*(.*?)(?:<\/p>|<hr\s*\/>)/is);
  if (triggerMatch) trigger = stripFoundryMacros(triggerMatch[1]).replace(/<[^>]+>/g, '').trim();

  const reqMatch = rawDesc.match(/<strong>Requirements?<\/strong>\s*(.*?)(?:<\/p>|<hr\s*\/>)/is);
  if (reqMatch) requirements = stripFoundryMacros(reqMatch[1]).replace(/<[^>]+>/g, '').trim();

  // Frequency from structured field
  let frequency: string | undefined;
  const freq = item.system?.frequency;
  if (freq) {
    const perMap: Record<string, string> = {
      'P1D': 'Once per day', 'PT1H': 'Once per hour', 'PT1M': 'Once per minute',
    };
    frequency = perMap[freq.per ?? ''] ?? `${freq.max} per ${freq.per}`;
  }

  return {
    name: item.name,
    description: cleanDesc,  // keep raw HTML intact
    actionType,
    trigger: trigger || undefined,
    requirements: requirements || undefined,
    frequency: frequency || undefined,
  };
});
```

**Spellcasting** — if `importSpellcasting` is exported from `src/utils/importCreature.ts` or the wizard (added by the spellcasting agent), call it here. Otherwise leave a `// TODO: import spellcasting` comment.

**Flavor text (publicNotes):**
```typescript
const flavorText = source.data.system?.details?.publicNotes ?? '';
```

**Build the final record:**
Construct `data` and `customData` the same way the wizard's `handleSave` does, using all the extracted values above. The `data.system` blob must have all the standard fields the statblock renderer reads (hp, ac, saves, abilities, perception, speed, traits, etc.).

---

## Part 4: Wire `onCopyAsCustom` through App.tsx → StatblockDrawer

In `App.tsx`:

```typescript
const handleCopyCreature = useCallback((creature: CreatureRecord) => {
  const draft = importCreatureAsCustom(creature);
  setWizardEditCreature(draft);
  setSelected(null);
  setWizardOpen(true);
}, []);
```

Pass to `StatblockDrawer`:
```tsx
<StatblockDrawer
  ...existing props...
  onCopyAsCustom={handleCopyCreature}
/>
```

---

## Part 5: CSS additions

In `StatblockDrawer.module.css`:
- `.copyBtn` — same style as `.editBtn` (small bordered button in crimson header). Can reuse `.editBtn` styles entirely; just add an alias or use the same class.

In `CustomCreatureWizard.module.css`:
- `.abilityEditorTabs` — small tab strip (Edit | Preview), inline-flex, gap 0
- `.abilityEditorTab` — individual tab button, small font, border bottom style active/inactive
- `.abilityEditorTabActive` — active tab underline style
- `.abilityToolbar` — flex row of small toolbar buttons above the textarea
- `.abilityToolbarBtn` — small pill/chip button, monospace font for symbols
- `.abilityPreview` — preview container; use `.itemDesc` styles (copy or reference)
- `.skillTierBtns` — can reuse `.tierBtns` if appropriate, or alias it
- `.languageChip` — same as `.traitChipExtra` for language tags

---

## Constraints & Notes

- Do NOT change how official (non-custom) creatures render — only add new paths for custom creatures and the new button/import flow
- Do NOT modify the encounter tracker or `EncounterCreature` type
- The import helper returns an unsaved draft. The wizard's existing `handleSave` does the actual DB write — no DB writes in the import helper itself
- The wizard title for a copied creature should read `Copy of: {originalName}` (prepend "Copy of: " to the name in step 0 of the wizard, so the user knows to rename it)
- Actually: pre-fill the name field as `{originalName} (Custom)` — cleaner than "Copy of:"
- TypeScript strict mode — no new `any` casts unless the existing code already uses them in that area
- Keep all existing wizard + statblock functionality intact — purely additive
- All new wizard sections follow the existing visual pattern: `.sectionHead` heading, same input/button styles

---

## Definition of Done

- [ ] `CustomSkill` type added to `encounter.ts`; `skills`, `languages`, `allSavesNote` added to schema `customData`
- [ ] `CustomAbility` extended with `frequency`, `trigger`, `requirements`
- [ ] Skills section in wizard with official autocomplete + custom lore support + tier buttons
- [ ] Languages section in wizard with chip tags + suggestion autocomplete
- [ ] `allSaves` note field in Defenses section
- [ ] Frequency/Trigger/Requirements fields on ability cards (Trigger only for reaction/free)
- [ ] Ability description editor has Edit/Preview toggle + markup toolbar
- [ ] Custom ability descriptions in statblock rendered as processed HTML (not plain text)
- [ ] Elite/Weak + dice rolling work on custom ability descriptions
- [ ] "⧉ Copy" button in statblock header for all creatures
- [ ] Button calls `onCopyAsCustom` prop
- [ ] `importCreatureAsCustom()` exported from `src/utils/importCreature.ts`
- [ ] All stats, attacks, abilities, speeds, senses, immunities, resistances, weaknesses, skills, languages imported correctly
- [ ] Wizard opens pre-populated with name `"{name} (Custom)"` and all imported data
- [ ] Skills and languages render in custom creature statblock
- [ ] Trigger/Requirements/Frequency render in custom ability statblock blocks
- [ ] Edit mode round-trips all new fields correctly
- [ ] No regressions to existing wizard or statblock functionality
