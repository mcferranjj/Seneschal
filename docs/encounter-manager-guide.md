# Encounter Manager - GM Guide

The Encounter Manager is the right-hand panel of Seneschal. It handles encounter building and combat tracking: initiative, hit points, conditions, and dice rolls.

---

## 1. Opening and Navigating the Panel

The panel is always visible on the right side of the screen. If the search results panel overlaps it, click the **‹‹ / ››** arrow button in the top-left corner to collapse or restore the search results.

---

## 2. Managing Multiple Encounters (Tabs)

A tab bar runs across the top of the panel. Each tab is one encounter.

- **Switch** encounters by clicking a tab.
- **Create** a new encounter by clicking **＋** on the far right of the tab bar.
- **Rename** an encounter by double-clicking its tab. Press Enter or click away to confirm. Press Escape to cancel.
- **Reorder** tabs by dragging one onto another.
- **Delete** an encounter by clicking **×** on the active tab (only shown when more than one tab exists). A confirmation prompt appears inline; click the checkmark to confirm or **✕** to cancel.

Switching tabs while combat is running ends that combat. Combat state is per-tab.

---

## 3. Party Size and Level - The XP Budget

The **Budget** section sits just below the tabs.

- Use **Party** − / + to set the number of player characters (1-8).
- Use **× Lvl** − / + to set the party's level (1-20).

As creatures are added, XP is calculated using PF2e XP budget rules. A color-coded bar and label show difficulty:

| Label | Meaning |
|-------|---------|
| Trivial | Very easy; minimal resource drain |
| Low | Below the party's level; manageable |
| Moderate | A standard challenging encounter |
| Severe | Dangerous; likely to cost significant resources |
| Extreme | Potentially lethal |

The XP total appears in the top-right corner of the budget row.

**XP calculation notes:**
- Each creature's XP contribution is based on its effective level relative to the party level.
- An Elite or Weak adjustment shifts effective level by ±1 for XP purposes.
- If a creature was added from a level-scaled search result, the scaled level is used.
- Custom placeholder creatures marked as **not enemies** do not count toward the XP budget.

---

## 4. Adding Creatures from Search Results

Click **+** next to a creature's name in the search panel to add it to the active encounter. HP, AC, and saving throws are pulled from the database automatically. If the creature came from a level-scaled search result, the scaled stats are used.

Creatures added from the database have their full statblock available. Click the creature's name or card to open the statblock in the side drawer.

---

## 5. Adding Placeholder / Custom Creatures

Click **＋ Add Placeholder Creature** at the bottom of the creature list to open the quick-add form. Use this for homebrew monsters, hazards, summons, or any creature not in the database.

The form has two steps:

### Step 1 - Name and Level

- Enter a **name**.
- Set a **level** using − / + (−1 to 25).
- Check **Enemy?** if the creature counts toward the XP budget. Uncheck for allies or neutral creatures.
- Check **Use quick wizard?** to define full stats. Leave unchecked to add a bare placeholder with no stats.
- Click **Add** (without wizard) or **Next →** (with wizard).

A bare placeholder can still have its HP tracked in combat by clicking the HP display and typing a value.

### Step 2 - Full Stats (Quick Wizard)

**Defenses (HP, AC, Fort, Ref, Will):**
Each stat has five tier buttons: **T** (Terrible), **L** (Low), **M** (Moderate), **H** (High), **E** (Extreme). Clicking a tier fills in the corresponding value for that level per PF2e monster building guidelines. The value can then be edited manually.

**Attacks:**
- A default melee Strike is pre-filled at Moderate tier.
- Click **+ Add** to add more attacks.
- Click the ⚔ or 🏹 icon to toggle between melee and ranged. Ranged attacks gain a **Range** field (in feet).
- Each attack has **Atk** and **Dmg** tier buttons and manual inputs.
- Click **×** on an attack to remove it.

**Abilities:**
- Click **+ Add** to add a named ability.
- Enter a name and optional description. The description appears as a tooltip when hovering the ability chip during combat.
- Click **×** to remove an ability.

Click **Add** to finalize, **← Back** to return to Step 1, or **Cancel** to discard the form.

---

## 6. Planning Mode - The Creature List

Before combat starts, each creature appears as a card showing:

- **Name** (with Elite/Weak tag if applied)
- **HP** (maximum)
- **AC, F, R, W** (Armor Class, Fortitude, Reflex, Will)
- **Level** and **XP contribution** (e.g., `Lvl 5 · 40 XP`)
- **Elite / Weak** toggle buttons
- A **duplicate** button (⧉) and a **remove** button (✕)

If a creature has a scaled level, its level shows a ⇅ badge with the base level in parentheses.

### Viewing a Statblock

Click a creature card to open its statblock in the side drawer. Custom placeholder creatures have no statblock.

### Elite and Weak Adjustments

The **Elite** and **Weak** buttons apply the standard PF2e Monster Core adjustments:

- **Elite:** raises effective level by 1, adds +2 to AC, saves, and attack bonuses, increases HP per the rules.
- **Weak:** lowers effective level by 1, applies −2 to AC, saves, and attack bonuses, reduces HP accordingly.

Clicking an active button again removes the adjustment and restores the original stats. Modified stat values are shown in gold (Elite) or blue (Weak).

### Duplicating a Creature

Click **⧉** on a creature card to add a copy to the encounter. The copy starts at full HP with no conditions.

### Removing a Creature

Click **✕** on a creature card to remove it. There is no confirmation prompt.

---

## 7. Starting Combat

When at least one creature is in the encounter, a **▶ Start Combat** button appears at the bottom of the panel. Clicking it:

1. Rolls initiative (d20) for every creature.
2. Sorts creatures in descending initiative order.
3. Switches the panel to combat tracker mode with the first creature's turn active.

Initiative is rolled using a cryptographically random d20. No modifier is added. Any initiative value can be edited after rolling (see below).

---

## 8. The Initiative Tracker

The top of the panel shows a combat header with the current round number, a **Next Turn** button, and an **✕ End** button. Each combatant is listed below in initiative order.

The active combatant's card has a red border, red name, and a red initiative badge.

### Advancing Turns

Click **Next Turn** to move to the next combatant. When the last creature's turn ends, the round counter increments and the order wraps back to the top.

### Editing Initiative Manually

Click the **initiative badge** on any card to edit it. Type a new number and press **Enter** or click away to confirm. The turn order re-sorts, and the active turn follows the creature that was active before the edit.

### Adding Creatures Mid-Combat

**＋ Add Placeholder Creature** is also available during combat. Creatures added mid-combat receive a random d20 initiative and are inserted at the correct position in the order.

### Ending Combat

Click **✕ End** to stop combat. The tracker resets, initiative values clear, and the panel returns to planning mode. HP values and conditions are preserved.

---

## 9. HP Tracking in Combat

Each card shows HP as **current / max**, color-coded:

| Color | Meaning |
|-------|---------|
| Green | Above 50% HP |
| Yellow/Amber | 26-50% HP |
| Red | 25% or below |

A thin colored bar below the condition row also reflects health.

**Quick buttons** at the bottom of each card apply common increments: **−10, −5, −1** for damage and **+1, +5, +10** for healing. HP cannot go below 0 or above the creature's maximum.

**Click the HP display** to open an inline input for an exact value. Two formats are accepted:

- A plain number (e.g., `14`) — sets HP to that value.
- A relative expression (e.g., `+4` or `-14`) — adjusts from the current value.

Press **Enter** or click away to confirm. Press **Escape** to cancel.

For custom placeholder creatures, entering a number higher than the current maximum expands the maximum to match.

---

## 10. Saving Throws and Defense Stats in Combat

Each card shows a defense row: **AC, F** (Fortitude), **R** (Reflex), **W** (Will).

- Stats penalized by active conditions are shown in **red**.
- Stats modified by Elite or Weak adjustments are shown in gold or blue.
- Hovering over a stat highlights it to indicate it is clickable.

**Click a save (F, R, or W)** to open the dice roller pre-filled with that creature's save bonus (e.g., `1d20+14`). The statblock opens in the side drawer if one is available.

**Click AC** to open the dice roller with a `1d20` roll and open the statblock.

---

## 11. Attack Rolls in Combat

If a creature has attacks defined, they appear inside the combat card. Each attack shows:

- An icon: ⚔ for melee, 🏹 for ranged
- Attack **name and bonus** (e.g., `Strike +14`)
- **Damage expression** (e.g., `2d8+9`)
- Range in feet (ranged attacks only)
- Traits (e.g., *reach, trip*)

**Click the attack name/bonus** to roll the attack.

**Click the damage expression** to roll damage.

When active conditions penalize attack rolls or damage, the affected values turn red and penalties are factored in automatically:

- **Enfeebled** reduces attack and damage for Str-based (melee/thrown) attacks.
- **Clumsy** reduces attack for Dex-based (ranged/finesse) attacks.
- **Frightened** and **Sickened** apply a status penalty to all rolls — same-type penalties don't stack (only the worst applies).
- **Prone** applies a –2 circumstance penalty to attack rolls.
- **Dazzled** applies an approximate –2 status penalty to attacks (the real effect is a DC 5 flat check against all targets).

---

## 12. Right-Click for Manual Rolls

Right-clicking any clickable roll element (save stats, attack bonus, damage) opens the **Manual Roll Input** instead of the automatic dice roller. Type in a result from a physical die to have it recorded in the roll history.

---

## 13. Conditions

Conditions appear as small purple chips in the condition row of each combat card.

### Adding a Condition

Click **+ cond** at the end of the condition row to open the condition picker. Conditions are organized by category:

| Category | Conditions |
|----------|-----------|
| Circumstantial | Grabbed, Prone, Off-Guard, Immobilized, Restrained, Persistent Damage |
| Status | Frightened, Sickened, Fatigued, Encumbered |
| Ability Scores | Clumsy, Enfeebled, Drained, Stupefied |
| Action Economy | Stunned, Slowed, Quickened |
| Death / Dying | Dying, Wounded, Doomed, Unconscious |
| Detection | Concealed, Hidden, Undetected, Invisible |
| Senses | Blinded, Dazzled, Deafened, Fascinated |
| Disabled | Controlled, Confused, Fleeing, Paralyzed, Petrified |

Use the toggle in the popup header to switch to **A-Z** alphabetical view. The popup can be dragged by its header bar. Click a condition name to apply it.

### Valued Conditions

Conditions with a numeric value (Frightened 2, Sickened 1, etc.) show a second popup when selected. Use − and + to set the value (range 1-20). Click **✓ Apply** to confirm, or click the backdrop to accept the current value.

Valued conditions: Clumsy, Doomed, Drained, Dying, Enfeebled, Frightened, Sickened, Slowed, Stunned, Stupefied, Wounded.

### Removing or Editing a Condition

- **Non-valued conditions** (e.g., Prone, Grabbed): click or right-click the chip to remove it.
- **Valued conditions** (e.g., Frightened 2): click the chip to open the value editor. Right-click to remove without editing.

Valued condition chips show a **✎** icon; non-valued ones show a **×** icon.

### Automatic Condition Reduction

**Frightened** is the only condition that decreases automatically. When **Next Turn** is clicked to end a frightened creature's turn, its Frightened value drops by 1 and is removed at 0. All other conditions are managed manually.

### How Conditions Affect Stats

Active conditions adjust stat numbers on the combat card automatically. Penalized values turn red on the card.

For a full breakdown of which stats each condition affects, open the **Rules** tab and browse the **Conditions** list — each entry shows a compact stat-effect summary below its name.

---

## 14. Abilities on Combat Cards

If a creature has abilities defined (via the Quick Wizard or the Custom Creature Wizard), they appear as chips below the attack rows. Each chip shows:

- An action cost icon: ◆ (single action), ◆◆ (two actions), ◆◆◆ (three actions), ↺ (reaction), ⟳ (free action). Passive abilities show no icon.
- The ability name.

Hover over a chip to see the ability description as a tooltip.

---

## 15. Encounter State - Saving and Loading

Encounter data is saved automatically to the browser's local IndexedDB storage. What is saved:

- All encounter tabs and their names
- Every creature in each encounter, including HP, conditions, Elite/Weak adjustments, and scaled levels
- Party size and party level
- The active encounter tab

Data is restored automatically on the next visit. No manual save is needed.

Combat state (active creature, current round, initiative order) is **not** persisted. Reopening the app returns all encounters to planning mode.
