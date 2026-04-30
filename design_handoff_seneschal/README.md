# Handoff: Seneschal UI Redesign

## Overview

This package contains high-fidelity interactive design prototypes for the full UI redesign of **Seneschal**, a PF2E GM assistant web app (React 19 + Vite + TypeScript). The redesign covers three major sections: GM Assistant (encounter builder + combat tracker), Rules Reference, and PC Character Creation.

## About the Design Files

The files in this bundle are **design references created in HTML/React** — working prototypes showing intended look, layout, and behavior. They are **not** production code to copy directly. Your task is to **recreate these designs in the existing Seneschal codebase** (React 19 + Vite + TypeScript + CSS Modules), using its established patterns, components, and data layer.

The prototype uses inline React/Babel with sample data stubs. In the real app, all data queries should go through the existing Dexie.js IndexedDB layer and search functions described in `CLAUDE.md`.

## Fidelity

**High-fidelity.** These are pixel-accurate mockups with final colors, typography, spacing, and interactions. Recreate the UI as close to pixel-perfect as the codebase's existing CSS Modules pattern allows.

---

## Design Tokens

All tokens are defined at the top of `Seneschal Prototype.html` in the `T` object. Recommended approach: extract these into a `src/styles/tokens.css` or a TypeScript constants file.

### Colors
| Token | Value | Usage |
|---|---|---|
| `bg` | `#f4ead6` | Page background, encounter column background |
| `parchment` | `#faf4e8` | Filter sidebar, results list, statblock body |
| `crimson` | `#5c1414` | Top nav bar, active states, primary action buttons |
| `brown` | `#7a5c2e` | Statblock header, character section header |
| `gold` | `#9a7228` | Accent, high ability scores |
| `border` | `#d8c8a4` | All dividers and card borders |
| `borderL` | `#ecddc4` | Light borders (row separators) |
| `text` | `#2a1a0e` | Primary text |
| `textMid` | `#5a3a20` | Secondary text, stat values |
| `textMute` | `#8a6a4a` | Labels, placeholders, disabled states |

### Rarity colors
| Rarity | Color |
|---|---|
| Common | `#5a7a3a` |
| Uncommon | `#8a6a18` |
| Rare | `#2a4a8a` |
| Unique | `#6a2a8a` |

### Typography
| Usage | Font | Size | Weight |
|---|---|---|---|
| Brand name "Seneschal" | Cinzel | 14px | 700 |
| Creature/statblock names | Cinzel | 18px | 700 |
| Section headings | Cinzel | 16px | 700 |
| Body text | DM Sans | 13px | 400 |
| Labels, metadata | DM Sans | 11–12px | 400–500 |
| Section label caps | DM Sans | 10px | 600, uppercase, 0.08–0.1em letter-spacing |
| Numbers (HP, level, init) | DM Mono | 10–16px | 500–700 |

### Spacing & shape
- Border radius: 4px (chips), 5–6px (inputs/buttons), 7–8px (cards)
- Card padding: `10–12px 12–14px`
- Column gap/borders: `1px solid #d8c8a4`

---

## Layout

The app is a full-viewport flex layout with **no scroll on the outer shell** — all scrolling is contained within individual columns.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Crimson top bar — full width, 44px]                           │
│  S  Seneschal │ ⚔ GM Assistant │ 📖 Rules │ ✦ Characters  ↗ ⚙ │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Active section — flex row, fills remaining height]             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Top bar (44px, background: crimson `#5c1414`)
- Left: logo mark (26×26px rounded square, semi-transparent white bg) + "Seneschal" in Cinzel 14/700
- Divider: 1px `rgba(240,230,204,0.2)` vertical
- Nav pills: icon + label, active state = `rgba(240,230,204,0.18)` bg + `rgba(240,230,204,0.28)` border
- Right: "↗ Share" button + "⚙" gear icon button (both `rgba(240,230,204,0.12)` bg)

---

## Section 1: GM Assistant

**File reference:** `sen-gm.jsx`

Four-column layout (all full height, no outer scroll):

```
┌──────────┬──────────┬──────────────┬─────────────────┐
│ Filters  │ Results  │  Encounter   │   Statblock     │
│ 220px    │ 260px    │  280px       │   flex: 1       │
│ collapse │          │              │                 │
└──────────┴──────────┴──────────────┴─────────────────┘
```

### Column 1: Filter Sidebar (220px, collapsible)
- Background: `parchment`
- Collapsed width: 0 (CSS `overflow: hidden; transition: width 0.2s`)
- Toggle button: sits in the Results column header (‹‹ / ›› arrows, 22×22px)

**Filters:**
- **Search input** — plain text, searches creature name + traits
- **Level Range** — two `<input type="number">` boxes (min/max), default −1 to 25, clamp against each other
- **Size** — checkbox grid (2 cols): Tiny, Small, Medium, Large, Huge, Gargan.
- **Rarity** — pill toggles: Common, Uncommon, Rare, Unique (each colored by rarity)
- **Source** — static collapsible tree (Remaster/Legacy → Core/Supplemental). Wire to `getAllPackSourcesWithMeta()` from `src/search/search.ts`

### Column 2: Results List (260px)
- Background: `parchment`
- Header: result count + Level/Name sort toggle buttons
- Each row: creature name (Cinzel), rarity chip if not common, size + trait chips, level badge (DM Mono), + button to add to encounter
- Active row (statblock open): `${crimson}12` bg + `3px solid crimson` left border
- + button on hover: crimson bg with white text

**Wire to:** `searchCreatures()` from `src/search/search.ts`

### Column 3: Encounter Manager (280px)

**Build mode:**
- **Tabs row**: named encounter tabs + ＋ button to add new encounter. Each tab: 11px, bold when active, `2px solid crimson` bottom border
- **XP Budget bar**: party stepper (size × level with −/+ 16×16 buttons), live difficulty label (Trivial/Low/Moderate/Severe/Extreme in color), progress bar, XP total
  - XP per creature formula: level difference from party level → 160/120/80/60/40/30/20/15/10 XP
  - Difficulty thresholds: <40 Trivial, 40 Low, 60 Moderate, 80 Severe, 120+ Extreme
  - Adjust for party size: `adjXP = rawXP * (4 / partySize)`
- **Creature list**: each entry is an individual creature (not stacked counts), showing name, level, XP value, ✕ remove button
- **Custom creature form**: collapsible, name input + level stepper + Add/Cancel buttons
- **"▶ Start Combat" button**: crimson, full-width, only shown when creatures > 0

**Combat mode (after Start Combat):**
- Round counter + "Next Turn" button + "✕ End" button
- Sorted by initiative (descending)
- Each combatant row: initiative badge (24×24, crimson when active), name + "ACTIVE" pill, HP/maxHP in DM Mono, HP bar
- HP edit buttons: −10, −5, −1, +1, +5, +10 (red/green colored)
- Active combatant: `${crimson}10` background + `1px solid crimson` border

### Column 4: Statblock (flex: 1)
- Empty state: centered ⚔ icon + "Select a creature" message
- **Header** (background: `#7a5c2e` brown): creature name (Cinzel 18/700, white), "Creature N · size" subtitle, trait chips (semi-transparent dark bg, white text), ✕ close button
- **Body** (background: parchment, scrollable): source, perception, languages, skills, ability modifiers, 4-up stat grid (AC/Fort/Ref/Will), HP + Speed, dividers (`linear-gradient(90deg, border, transparent)`), Melee/Ranged attacks, action blocks (Cinzel name + cost symbol + trait chip + description)
- **"+ Add to Encounter" button** at bottom

**Wire to:** `CreatureRecord` from `src/db/schema.ts`, `StatblockDrawer` component patterns from `src/components/StatblockDrawer/`

---

## Section 2: Rules Reference

**File reference:** `sen-rules.jsx`

Three-column layout:

```
┌──────────────┬──────────────┬────────────────────────┐
│ Category nav │  Item list   │    Detail panel        │
│   220px      │   240px      │    flex: 1             │
└──────────────┴──────────────┴────────────────────────┘
```

### Column 1: Category Nav (220px)
- Search input (filters items in the active category)
- Category buttons: icon + label, active = `${crimson}12` bg + crimson text + `${crimson}30` border
- Categories: Conditions, Basic Actions, Skill Actions, Spells, Feats, Equipment, Traits
- Stub categories (Spells/Feats/Equipment/Traits) show "soon" badge

### Column 2: Item List (240px)
- Conditions: colored dot (condition-specific color) + name
- Actions: cost symbol (◆/◆◆/reaction) + name + traits preview

### Column 3: Detail Panel (flex: 1, scrollable)
- Heading: condition color swatch or action cost badge, item name (Cinzel 22/700), trait chips
- Full description text (13px, `textMid`, line-height 1.8)
- Conditions with values: collapsible value table (1–4) showing penalty at each value
- Actions with triggers/requirements: separate labeled boxes

**Data source:** Wire to Foundry PF2E GitHub data. Conditions and actions are currently hardcoded stubs in the prototype — the real app should pull from the synced IndexedDB or from the Foundry compendium directly.

---

## Section 3: Character Creation & Management

**File reference:** `sen-chars.jsx`

```
┌──────────────┬────────────────────────────────────────┐
│  Character   │  [Brown header bar]                    │
│  list        ├────────────────────────────────────────┤
│  200px       │  Builder view  OR  Sheet view          │
│              │  (toggled via header buttons)          │
└──────────────┴────────────────────────────────────────┘
```

### Character List Sidebar (200px, parchment bg)
- "+ New Character" button (crimson, full width)
- Each character: name + class/status subtitle, active = `${crimson}12` bg + crimson text
- Delete (✕) button per character (hidden when only 1 character)

### Character Header Bar (brown `#7a5c2e`)
- Character name (Cinzel 16/700, white) + ancestry · background · class subtitle
- "Builder" / "Sheet" toggle pills (semi-transparent white)

### Builder View
Left: step nav (160px) — numbered circles, done = green checkmark, active = crimson
Right: step content (scrollable)

**Steps:**
1. **Ancestry** — grid of ancestry cards (name, HP chip, Speed chip, size chip, ability boosts, description). Validation: must select one to proceed.
2. **Background** — grid of background cards (name, ability bonus, trained skills, description)
3. **Class** — grid of class cards (name, HP chip, role chip, key ability, description)
4. **Abilities** — 6 ability rows (STR/DEX/CON/INT/WIS/CHA), each with −/+ stepper (range 8–18), shows modifier in DM Mono, gold/crimson color when high
5. **Skills** — pill toggles for all 16 skills; selected = crimson; counter shows N/required
6. **Review** — summary grid cards, ability score display, trained skills chips, name input, "✓ Finalize" button

### Sheet View
Two-column layout:

**Left (240px):**
- HP block: large DM Mono HP number (color = green/amber/red by %), HP bar, −10/−5/−1/+1/+5/+10 + Full buttons
- Conditions block: active conditions shown as removable crimson chips; add from preset list below
- Quick stats: 2-col ability modifier grid

**Right (flex: 1):**
- Character details card: ancestry/background/class/level
- Trained skills chips
- Notes textarea (resizable, parchment bg)

---

## Interactions & Behavior

| Interaction | Behavior |
|---|---|
| Filter sidebar toggle | CSS `width` transition 0–220px, `overflow: hidden` |
| Creature row click | Sets `selectedCreature`, shows statblock panel |
| + button on creature row | Adds individual entry to active encounter; stops event propagation |
| Encounter tab + | Appends new encounter, switches to it |
| Start Combat | Sorts creatures by initiative, switches to combat tracker mode |
| Next Turn | Cycles through sorted combatants; increments round counter when wrapping |
| HP buttons | Clamp to 0 and maxHP |
| Character Finalize | Sets `hp = maxHP = baseHP`, switches to Sheet view |
| Condition toggle | Adds/removes from character's condition array |
| Back/Next in builder | Validates current step before advancing |

---

## State Management

Recommended approach: lift state to the component level as in the prototype, then persist to localStorage for encounters and characters.

### GM Assistant state
- `query: string` — creature search query
- `levelMin: number`, `levelMax: number` — level range filter (default −1, 25)
- `sizeFilter: string[]`, `rarityFilter: string[]` — multi-select filters
- `filtersOpen: boolean` — sidebar collapse state
- `encounters: Encounter[]` — array of named encounters, each with `{ id, name, creatures: CombatEntry[] }`
- `activeEnc: number` — index into encounters
- `partySize: number`, `partyLevel: number`
- `combatMode: boolean`, `round: number`, `activeTurn: number`
- `selectedCreature: CreatureRecord | null`

### Character state
- `characters: Character[]` — full array
- `activeChar: number` — index
- `view: 'build' | 'sheet'`
- Per character: `{ name, ancestry, background, cls, str/dex/con/int/wis/cha, skills, step, hp, maxHp, conditions, notes }`

---

## Wire-up Notes for Existing Codebase

### Creature search
Replace prototype's `CREATURES.filter(...)` with:
```ts
import { searchCreatures } from '../search/search';
const { results } = await searchCreatures({
  name: query,
  minLevel: levelMin,
  maxLevel: levelMax,
  sizes: sizeFilter,
  rarities: rarityFilter,
  packSources: sourceFilter,
  sortBy: 'level',
});
```

### Statblock data
The prototype uses simplified flat fields. Real `CreatureRecord` fields follow the shapes documented in `CLAUDE.md` (e.g. `system.details.level.value`, `system.attributes.ac.value`). Use existing `statblockHelpers.ts` extraction functions.

### Source filter tree
Replace the hardcoded tree with `getAllPackSourcesWithMeta()` from `src/search/search.ts`, which returns `PackSourceInfo[]` with era and category metadata for building the two-level Remaster/Legacy → Core/Supplemental/Misc tree.

---

## Files in This Package

| File | Purpose |
|---|---|
| `Seneschal Prototype.html` | Main interactive prototype — shell, tokens, data stubs, app component |
| `sen-gm.jsx` | GM Assistant section — creature search, encounter builder, combat tracker |
| `sen-rules.jsx` | Rules Reference section — conditions, actions browser |
| `sen-chars.jsx` | Character Creation & Sheet section |
| `Seneschal Design Options.html` | Design canvas showing all 3 visual directions explored (A, B, C) |

Open any `.html` file in a browser to interact with the prototype. The `.jsx` files are loaded as Babel scripts and are not standalone — they rely on React + the shell HTML.

---

## Assets

- **Fonts:** Cinzel, DM Sans, DM Mono — all loaded from Google Fonts. Add to your project via the same Google Fonts URL or self-host.
- **Icons:** None — all icons are Unicode characters/emoji. No icon library required.
- **Images:** None in the prototype.
