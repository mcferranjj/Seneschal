# DiceRoller.tsx

## Purpose
Provides all dice-rolling UI components used throughout the app. Contains the core dice parsing and rolling engine, plus three distinct roller components that appear as floating panels anchored near the element that triggered them.

## Location
`src/components/DiceRoller/DiceRoller.tsx`

---

## Core Engine (non-UI)

### `parseDice(expr: string): ParsedDice | null`
Normalizes and parses a dice expression string into a `ParsedDice` object (`count`, `sides`, `modifier`, `raw`).
- Handles: `"2d6+3"`, `"1d20"`, `"+7"` (treated as `1d20+7`), `"-3"`, expressions with trailing text (`"2d6 slashing"`)
- Returns `null` if expression cannot be parsed.

### `cryptoD(sides: number): number`
Cryptographically random die roll using `crypto.getRandomValues()` with modulo rejection sampling to eliminate bias. Used for all dice rolls in the app.

### `rollCrit(parsed: ParsedDice, traits: string[]): CritResult`
Implements PF2E Remaster critical hit rules:
1. If **Fatal** trait: replace all dice with the fatal die size; after doubling, add one extra fatal die
2. Roll normal dice
3. Double the total (dice + modifier)
4. If **Deadly** trait: add 1–3 extra dice (count from trait, e.g., `deadly-2d10` = 2 extra d10)

Exported interface: `CritResult { baseDice, baseModifier, doubledTotal, extraDice, extraLabel, grandTotal }`

---

## Components

### `DiceRoller` (attack + optional damage)
The primary roller. Triggered when the user clicks an attack bonus or a plain stat modifier in the statblock.

**Props:**
- `expression` — the attack roll expression (e.g., `"1d20+12"`)
- `label` — optional label (e.g., `"Fortitude"`)
- `damageExpr`, `damageLabel`, `damageTraits` — if provided, shows a damage sub-panel linked to the attack roll

**Behavior:**
- Rolls on mount
- Keyboard: `Escape` closes, `R` rerolls
- Click outside closes
- On a nat 20: automatically rolls crit damage
- Draggable: drag handle at the top moves the panel anywhere on screen
- Auto-clamps vertically so it never overflows the viewport bottom
- Displays: roll expression, total (colored green/red for nat 20/nat 1 on d20s), breakdown `[rolls] +modifier`

### `DamageRoller` (damage-only)
A standalone damage roller used when the user clicks directly on a damage expression in the statblock (without going through an attack roll). Identical in behavior to the damage sub-panel of `DiceRoller`, but as a standalone component.

**Props:** `expression`, `label`, `traits`, `anchorX`, `anchorY`, `onClose`, `onRoll`

**Behavior:** Same drag, keyboard, and auto-clamp behavior as `DiceRoller`. Supports crit rolling via the `✦ Crit` button.

### `MultiDamageRoller` (ability "roll all damage")
Triggered by the "🎲 Roll damage" button on abilities with multiple damage types (e.g., fire damage + bludgeoning damage). Renders each damage group separately.

**Props:** `groups: DamageGroupInput[]`, `abilityName`, `anchorX`, `anchorY`, `onClose`, `onRoll`

**Behavior:**
- Rolls all groups on mount
- `✦ Crit` button toggles crit mode — re-rolls all groups as crits
- Each group shows its own total and breakdown
- Same drag, keyboard, auto-clamp behavior

---

## Shared Behavior Across All Three Rollers

All three components share identical implementations of:
- **Drag logic**: `onDragHandlePointerDown`, `onDragPointerMove`, `onDragPointerUp` — sets `pos` state; during drag, position is `pos.x / pos.y`; before dragging, position is `anchorX / clampedY` with `translateX(-50%)`.
- **Auto-clamp**: runs every render (no deps), reads the panel's `getBoundingClientRect` and adjusts `clampedY` if overflowing the bottom.
- **Outside click close**: `window.addEventListener('pointerdown', ...)` that calls `onClose()` when click is outside the panel ref.
- **Keyboard handling**: `Escape` closes, `R` rerolls.
- **Roll history**: each roll calls `onRoll(entry)` to add to the `RollHistory` panel.

---

## Interfaces With
| Module | Purpose |
|---|---|
| `../../types/diceHistory` | `RollHistoryEntry` type |
| `./DiceRoller.module.css` | Styles |

---

## Cleanup Opportunities
- **Major redundancy**: The drag logic, outside-click close, keyboard handler, and viewport-clamp effect are copy-pasted identically into all three components. These should be extracted into a `useFloatingPanel(anchorX, anchorY, onClose)` custom hook that returns `{ ref, pos, clampedY, dragHandlers }`.
- **Two damage rollers**: `DiceRoller` contains an inline damage sub-panel, and `DamageRoller` is a standalone component with nearly identical rendering. The damage display and crit logic should be extracted into a shared `DamagePanel` sub-component (or hook) used by both.
- `parseDice` and `cryptoD` are pure utility functions with no UI dependencies. They are excellent candidates to move to `src/utils/dice.ts` so they can be imported and tested independently.
- `rollCrit` and `rollDice` (private) are also pure logic that belong in a utility module.
- The `traitDieLbl` / `traitDieLabel` helper function exists in both `DiceRoller` and `DamageRoller` (slightly different name, identical logic) — another copy-paste to consolidate.
- All three components could be exported from a single `index.ts` barrel file in the `DiceRoller/` directory to clean up import paths.
