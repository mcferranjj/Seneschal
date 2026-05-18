# Dice Roller & Roll History Guide

Seneschal includes a built-in dice roller integrated with creature statblocks. Rolls can be made by clicking values in a statblock or entered manually from physical dice. Every roll is logged automatically.

---

## Rolling from a Statblock

Click a modifier or roll expression inside a creature's statblock. Seneschal determines the roll type from what was clicked:

- **Attack rolls** — click a Strike's attack modifier (e.g. `+14`). The roller opens and rolls `1d20` with that modifier applied.
- **Saving throws and skill checks** — click a save modifier or skill bonus. The roller opens and rolls `1d20` with that modifier.
- **Damage rolls** — click a damage expression (e.g. `2d8+6`). The damage roller opens and rolls that expression.
- **Ability damage** — abilities dealing multiple damage types show a "Roll damage" button. Clicking it opens a multi-damage roller that handles all damage types at once.

Clicking an attack roll on a Strike also rolls damage automatically. No second click is needed. If the attack is a natural 20, damage is resolved as a critical hit.

---

## The Dice Roller Panel

Clicking a rollable value opens a small floating panel near the cursor. It contains:

- **The roll label** — what the roll is for (e.g. "Jaws attack", "Fortitude").
- **The dice expression** — the formula being rolled (e.g. `1d20+14`).
- **The result** — displayed large in the center, color-coded:
  - Standard result — shown in normal text color.
  - **Natural 20** — shown in gold. For Strike attack rolls, damage is also rolled as a critical hit.
  - **Natural 1** — shown in red.
- **The breakdown** — the individual die faces and the modifier, e.g. `[17] +14`.
- **Reroll button** — click "Reroll" to roll the same expression again. Keyboard shortcut: **R**.
- **Close button** — the ✕ in the top-right corner closes the panel. Keyboard shortcut: **Escape**.

The panel can be dragged by clicking and holding the header area.

---

## Attack Rolls with Damage

When you click a Strike's attack modifier, the roller panel shows the attack roll on top and a damage section below.

### Normal hits

The damage section shows the rolled damage total with a breakdown of individual dice and the modifier.

### Critical hits

A natural 20 causes the damage section to show a gold "Critical Hit" banner. The crit math is:

- **Base dice** — the normal damage dice are rolled.
- **Doubled total** — the dice result plus modifier is multiplied by 2 (per PF2e crit rules).
- **Extra dice** — if the weapon has a **Fatal** or **Deadly** trait, the relevant extra dice are rolled and shown separately.

Clicking the **"Crit" button** in the damage section manually triggers critical damage. This applies when a non-20 attack beats the target's AC by 10 or more.

### Rerolling damage independently

The damage section has its own **"Reroll dmg"** button. Clicking it re-rolls damage without changing the attack result.

### Multi-type damage

When a weapon or ability deals more than one damage type (e.g. piercing plus fire), each group is shown as a separate line with its own label, expression, total, and breakdown. A grand total appears at the bottom.

---

## Fatal and Deadly Traits

Fatal and Deadly weapon traits are applied automatically on critical hits:

- **Fatal (e.g. Fatal d12)** — on a critical hit, all base damage dice are replaced with the fatal die size, the result is doubled, and one extra die of that size is added.
- **Deadly (e.g. Deadly d8)** — on a critical hit, extra dice are added after doubling. The number of extra dice depends on the die count in the trait.

Weapons with these traits show a small badge next to the damage expression. Hovering over the badge shows a tooltip describing the trait.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| **R** | Reroll the current roll |
| **Escape** | Close the roller panel |

---

## Manual Roll Input (Right-Click)

Right-click a rollable value to open the manual input panel. This records a physical die result in the roll log with the modifier applied.

The manual input panel shows:

- The roll label and dice expression.
- A **valid range hint** — the minimum and maximum raw die result for the expression (e.g. `1–20` for a d20 roll).
- The **modifier** that will be applied.
- A **number input field** — enter the raw die result (the face value, not the total). The field is focused automatically.
- Press **Enter** or click **Submit** to confirm.

After submitting, the panel shows the final total with the modifier applied and a full breakdown.

### Manual attack rolls with auto-damage

Right-clicking a Strike's attack modifier and submitting a die result will automatically roll damage digitally. Only the d20 face value needs to be entered. Entering a **20** resolves damage as a critical hit, including Fatal or Deadly extra dice where applicable.

### Out-of-range values

If the entered number is outside the valid range for the dice expression, Seneschal shows a warning but still submits the result.

---

## Roll History

Every roll, whether automatic or manually entered, is recorded in the **Roll History** panel.

### Opening Roll History

Click the dice icon in the top bar. The panel appears in the upper-right corner of the screen.

### What is tracked

Each entry records:

- **Creature name** — the creature the roll came from, if applicable.
- **Roll label** — what the roll was for (e.g. "Claw attack", "Fortitude", "2d6+4 slashing (Crit)").
- **Dice expression** — the formula that was rolled (e.g. `1d20+9`, `2d6+4`).
- **Breakdown** — the individual die faces and modifier (e.g. `[14] +9`).
- **Total** — the final result, color-coded: gold for natural 20, red for natural 1, normal color otherwise.
- **Timestamp** — when the roll happened.

The most recent roll appears at the top. The panel scrolls automatically to show it.

### Clearing history

Click the **Clear** button in the Roll History header to remove all entries. The button is disabled when there are no entries. Clearing cannot be undone.

### Closing Roll History

Click the ✕ button in the header, or click anywhere outside the panel.
