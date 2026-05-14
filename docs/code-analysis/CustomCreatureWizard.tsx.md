# CustomCreatureWizard.tsx

## Purpose
A multi-step form wizard for creating and editing custom creatures. Allows GMs to define a creature from scratch with full stats, attacks, abilities, spellcasting, speeds, senses, immunities, resistances, weaknesses, skills, and languages. Also supports editing existing custom creatures.

## Location
`src/components/CustomCreatureWizard/CustomCreatureWizard.tsx`

> **Note:** This is one of the largest files in the codebase (~2,000+ lines estimated). It contains the PF2E stat tables (the canonical source imported by `levelScaling.ts`), many data constants, all wizard step sub-components, and the main wizard component.

---

## Contents Overview

### 1. Data Constants (file-local unless exported)

#### Exported Stat Tables
These are the **canonical source** for all PF2E creature creation tables used across the app:
- `HP_TABLE` — HP by level and tier (low/moderate/high)
- `AC_TABLE` — AC by level and tier (low/moderate/high/extreme)
- `SAVE_TABLE` — saves by level and tier (terrible/low/moderate/high/extreme)
- `ATTACK_TABLE` — attack bonus by level and tier
- `DAMAGE_TABLE` — damage dice by level and tier (used for single-target strikes)
- `AREA_DAMAGE_TABLE` — damage dice by level and tier (used for area effects; tiers: unlimited/limited)
- `ABILITY_TABLE` — ability score modifiers by level and tier
- `PERCEPTION_TABLE` — perception modifiers by level and tier
- `RES_WEAK_TABLE` — resistance/weakness values by level and tier

All of these are re-exported by name and imported in `levelScaling.ts`.

#### UI / Reference Data Constants
- `CREATURE_TYPES` — 21 creature types (Aberration, Animal, etc.)
- `SIZES` — 6 sizes with value/label pairs
- `WEAPON_TRAITS` — weapon-relevant traits for the attack trait picker
- `MONSTER_ATTACK_TRAITS` — monster-specific attack traits (Grab, Knockdown, etc.)
- `MONSTER_ABILITY_SUGGESTIONS` — common monster ability names (Constrict, Trample, etc.)
- `COMMON_SENSES` — common sense names for the senses picker
- `OFFICIAL_SKILLS` — 16 official PF2E skills for the skill picker
- `LANGUAGE_SUGGESTIONS` — common languages for the language picker
- `DAMAGE_TYPES` — damage type names for damage input suggestions
- `TIER_ABBREV` — maps tier names to single-letter abbreviations (L/M/H/E/T)

### 2. Wizard Steps
The wizard is divided into multiple named steps (tabs):
- `'basics'` — name, level, entity type, rarity, size, creature types, traits
- `'defenses'` — HP, AC (with tier selectors), saves (with tier selectors)
- `'offense'` — attacks (with attack bonus and damage tier selectors), abilities
- `'spellcasting'` — spellcasting entries with spells
- `'details'` — speeds, senses, immunities, resistances, weaknesses, skills, languages, flavor text, all-saves note

### 3. Form State (`WizardForm`)
The wizard maintains a large draft form state object containing all editable fields. When in edit mode (`editCreature` prop is set), the form is pre-populated from the existing `CreatureRecord`.

### 4. Tier Selector Pattern
Many stats (HP, AC, saves, attack bonus, damage) can be set via a tier button (Low/Moderate/High/Extreme/Terrible) that fills in the table value for the current level. The user can also type a raw value directly. The tier button highlights when the current value matches the table value for that tier at the current level.

### 5. Save Logic
On save, the wizard:
- Constructs a full `CreatureRecord` from the form state
- Reconstructs the `data.system` PF2E blob (for compatibility with the standard statblock renderer)
- Writes to `db.creatures.put(record)`
- Calls `onSave(record)`

### 6. Sub-Components (internal)
- Step content components for each wizard step
- `TraitInput` — autocomplete trait input that queries the DB for existing traits
- Attack form, ability form, spellcasting entry form, spell form (all inline within the wizard steps)

---

## Props
| Prop | Description |
|---|---|
| `partyLevel` | Used to set default stat tiers appropriate for the party level |
| `onSave(creature)` | Called with the final `CreatureRecord` after DB write |
| `onCancel()` | Called when the user cancels |
| `editCreature?` | Pre-populates the form for editing an existing custom creature |

---

## Interfaces With
| Module | Purpose |
|---|---|
| `../../db/schema` | `CreatureRecord` type |
| `../../db/db` | `db` singleton for saving and trait lookups |
| `../../types/encounter` | All `Custom*` types |
| `../../search/search` | `getAllTraits` (for trait autocomplete) |
| `../StatblockDrawer/statblockHelpers` | `stripFoundryMacros`, `linkKeywords`, `linkRolls` (for ability description preview) |
| `./CustomCreatureWizard.module.css` | Styles |

---

## Cleanup Opportunities

### Critical — Stat Tables
- **The PF2E stat tables must be moved out of this file.** `levelScaling.ts` currently imports from a UI component to get pure data constants. Both files would be dramatically simplified by moving the tables to `src/data/pf2eTables.ts`. This is the single highest-priority structural fix in the codebase.

### File Size and Decomposition
- At ~2,000 lines, this is the largest file in the project. Each wizard step should be its own component file within a `CustomCreatureWizard/` directory:
  - `BasicsStep.tsx`
  - `DefensesStep.tsx`
  - `OffenseStep.tsx`
  - `SpellcastingStep.tsx`
  - `DetailsStep.tsx`
- Sub-forms (attack form, ability form, spell form) should be their own components.
- `TraitInput` should be its own file — it could potentially be reused by `SearchPanel`.

### Constants Duplication
- `CREATURE_TYPES` is also defined in `SearchPanel.tsx` — one canonical source needed.
- `SIZES` (with value/label pairs) is conceptually the same as size data in `SearchPanel.tsx` and `CreatureRow.tsx` — consolidate.
- `DAMAGE_TYPES` exists only here but is general PF2E knowledge that could be shared.
- `LANGUAGE_SUGGESTIONS` could be moved to `src/data/pf2eConstants.ts`.

### Logic
- The tier selector pattern (button → fills table value, highlights when matched) is implemented inline throughout the wizard steps. This could be a `TierSelector` component that accepts the table, current level, current value, and `onChange`.
- The save logic that reconstructs the `PF2ECreature` blob (`data.system`) uses `as any` casts extensively. As noted in the `importCreature.ts` analysis, the long-term fix is to have the statblock renderer natively prefer `customData` over raw `data` fields, eliminating the need to reconstruct the blob.
- Form validation is currently minimal (name required, some basic type constraints). More robust validation (e.g., level range, HP > 0, attack bonus range) would improve UX and make the component easier to test.

### Naming
- `processHtml` is defined locally here with the same implementation as in `StatblockDrawer.tsx`. This should be one shared function.
