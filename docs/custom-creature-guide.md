# Custom Creature Wizard — GM Guide

The Custom Creature Wizard builds a PF2e creature or hazard from scratch, with level-appropriate stats, attacks, special abilities, and spellcasting, and adds it to your encounter.

---

## When Would I Use This?

- Homebrewing a monster with no published source.
- Reskinning a standard creature (new name, adjusted stats, different damage type).
- Creating a custom environmental hazard or trap.
- Building a creature that exists in a book but is not in Seneschal's database.
- Making a higher-level "boss" version of a common enemy with a special ability added.

---

## How to Open the Wizard

In the **Creatures** panel, scroll to the top of the list and click **＋ Custom Creature**. The wizard opens.

- To start from an existing creature's stats, click the **copy icon** on any statblock. The wizard opens pre-filled with that creature's values.
- To edit a saved custom creature, click the **pencil icon** on its statblock.

---

## Step 1 — Name, Level, and Type

### Name
Type the creature's name. The name is required before you can proceed. Pressing **Enter** advances to the next step if all required fields are filled.

### Level
Use **−** and **+** to set the creature's level (range: **−1** to **25**). All auto-calculated stat suggestions in step 2 are based on this level. The wizard defaults to your current party level.

### Creature or Hazard
Click **Creature** or **Hazard**. The wizard adapts the remaining fields to your choice.

If you choose **Hazard**, select a **Complexity**:
- **Simple** — a single-use trap or effect.
- **Complex** — a hazard that acts on its own initiative each round.

### Size (Creatures only)
Choose from **Tiny, Small, Medium, Large, Huge,** or **Gargantuan**.

### Creature Type (Creatures only)
Pick one type from the grid: Aberration, Animal, Astral, Beast, Celestial, Construct, Dragon, Dream, Elemental, Ethereal, Fey, Fiend, Fungus, Humanoid, Monitor, Ooze, Plant, Shade, Spirit, Time, or Undead.

### Hazard Type (Hazards only)
Pick one of **Trap**, **Haunt**, or **Environmental**.

The **Next →** button activates once the name and required type selection are filled.

---

## Step 2 — Stats, Attacks, and Abilities

All fields default to level-appropriate values. Adjust only what you need.

### Understanding Tier Buttons

Most stat rows have tier buttons: **T L M H E** (Terrible, Low, Moderate, High, Extreme). Clicking one fills in the official PF2e table value for that tier at your chosen level. The active tier is highlighted. You can override any value by typing directly in the field.

For **Hazards**, tier buttons use **L H E** (Low, High, Extreme) for defenses. Attack and damage tiers use a level-offset: **L** = level −1, **M** = at level, **H** = level +1.

A hint strip at the top of step 2 summarises these abbreviations.

---

### Traits

The primary type appears as a fixed chip. For complex hazards, a **complex** chip is shown automatically.

To add traits (e.g. *undead*, *incorporeal*, *aquatic*): type in the **Add trait…** field and press **Enter** or comma. A suggestion dropdown appears drawing from the official trait list. Tab autocompletes to the top suggestion. Click **×** on any chip to remove it.

---

### Perception (Creatures) / Stealth (Hazards)

- **Creatures:** a **Perception** modifier field with T/L/M/H/E tier buttons.
- **Hazards:** a **Stealth DC** field with L/H/E tier buttons, plus an optional **Details** text box (e.g. "requires *detect magic*" or "legendary").

---

### Defenses

**Creatures** have rows for **HP**, **AC**, **Fortitude**, **Reflex**, and **Will**, each with tier buttons and a manual input. An optional **All Saves Note** field accepts text for bonuses that apply to all saves (e.g. "+1 status bonus to all saves vs. magic").

**Hazards** have a **Has Physical Component** toggle.
- **Yes:** **AC**, **Hardness**, **Fort**, **Ref**, **Will**, and **HP** fields appear with L/H/E tier buttons. The **Broken Threshold** (BT) is shown automatically as half the HP value.
- **No:** those fields are hidden.

---

### Skills (Creatures only)

Click **+ Add Skill**. Type a skill name (the official list auto-suggests). Select a tier or type a number. Remove skills with **×**.

---

### Languages (Creatures only)

Type a language and press **Enter** to add it. Common PF2e languages are suggested as you type, including Remaster names like *Chthonian* and *Sakvroth*. Remove languages with **×**.

---

### Senses (Creatures only)

Type a sense name (common senses are suggested) and optionally enter a range in feet. Leave the range blank for unlimited senses. Click **+ Add** or press **Enter** to commit. Remove senses with **×**.

---

### Ability Modifiers (Creatures only)

Six rows for **Str, Dex, Con, Int, Wis, Cha**, each with T/L/M/H/E tier buttons and a manual number field.

- At level 0 or below, the Extreme tier button is hidden, as it does not appear in the official tables at those levels.

---

### Speed (Creatures only)

Five movement types are available: **Land, Climb, Swim, Burrow, Fly**. Each starts as an inactive toggle.

- Click a toggle to activate it. A stepper and feet value appear. Speed adjusts in increments of 5 ft.
- Click an active toggle again to deactivate and remove that movement type.

---

### Immunities

Type an immunity (e.g. *fire*, *poison*, *paralysis*) and press **Enter**. Damage type suggestions appear as you type. Remove immunities with **×**.

---

### Resistances and Weaknesses

Click **+ Add** next to either section. A row appears with:

- A **type** text field (with damage type suggestions).
- **L/M/H** tier buttons for a level-appropriate value.
- A manual number field.
- An optional **Except** field (e.g. "except magical silver").
- A **×** to remove the row.

---

### Hazard Details (Hazards only)

Three free-text fields for hazard-specific stat block text:

- **Disable** — what a character must do to disable the hazard (e.g. "Thievery DC 22 to…").
- **Reset** — how the hazard resets after triggering (optional).
- **Routine** — for complex hazards, what the hazard does on its turn each round.

These fields accept plain text or HTML. The **?** button in the header opens a built-in design tips panel with guidance from the PF2e GM Core on writing simple and complex hazards.

---

### Attacks

A default Strike is provided. Click **+ Add** to add more attacks.

Each attack card contains:

**Melee/Ranged toggle** — click the sword icon (⚔) to switch to ranged (🏹) or back. When ranged, a **Range** field appears (in feet, defaulting to 30).

**Name** — free text (e.g. "Claw", "Bite", "Longbow").

**Attack Bonus (Atk)** — tier buttons with a manual override. Creatures: L/M/H/E. Hazards: L (level −1) / M (at level) / H (level +1).

**Primary Damage (Dmg)** — a dice expression field (e.g. `2d8+9`) with tier buttons. Click **type ▾** to open the damage type picker. See [Damage Types](#damage-types) below.

**Additional Damage Components** — click **+ damage type** to add extra damage rows (e.g. "plus 1d6 fire"). Each row has its own expression field and type picker. Remove rows with **×**.

**Strike Abilities** — a chip field below the damage rows. Click the field to see suggestions (Grab, Improved Grab, Knockdown, Improved Knockdown, Push, Improved Push, Pull) or type and press **Enter**. These appear in the damage entry of the stat block.

**Weapon Traits** — a chip field at the bottom of each attack card. Type a weapon trait (e.g. *reach*, *agile*, *finesse*) and press **Enter**. The official weapon trait list is suggested as you type. Tab autocompletes to the top suggestion.

Remove an entire attack card with **×** in its top-right corner.

---

#### Damage Types

Clicking a **type ▾** button opens a popup listing all PF2e damage types grouped by category:

| Group | Types |
|---|---|
| Physical | bludgeoning, piercing, slashing |
| Energy | acid, cold, electricity, fire, sonic |
| Planar | force, spirit, vitality, void |
| Other | mental, poison, precision, untyped |
| Persistent | bleed, acid, cold, electricity, fire, sonic, force, spirit, vitality, void, mental, poison, untyped |

Click **persistent ▶** at the bottom to switch to the persistent damage sub-menu. Selecting a persistent type inserts it as "persistent [type]" (e.g. "persistent fire").

---

### Abilities

Add special abilities: passive traits, actions, reactions, free actions, and more.

#### + Custom

Creates a blank ability entry. Fill in:

- **Name** — free text.
- **Action type** — choose from: ◆ (single), ◆◆ (two), ◆◆◆ (three), ↺ (reaction), ◇ (free), or **Passive**.
- **Limited use?** (creatures only) — check to reveal a **Frequency** field (e.g. "Once per day").
- **Frequency** (hazards only) — shown for non-passive abilities.
- **Trigger** — shown for reactions and free actions (e.g. "A creature enters your reach").
- **Requirements** — optional (e.g. "You are holding a shield").
- **Description** — a rich text editor (see [Ability Editor](#ability-editor-toolbar) below).

#### + Generic (Creatures only)

Opens the **Generic Ability Picker**, an inline search panel for selecting any ability from the PF2e Bestiary Ability Glossary. Abilities are searchable by name.

- If the ability has configurable values (DC, damage, size, which attack it refers to), a small form appears with tier-shortcut buttons for level-appropriate numbers.
- A **Preview** shows the final stat block text before you commit.
- Click **Insert ability** to add it. The ability name is locked since it comes from an official source.

---

#### Ability Editor Toolbar

The description editor is a WYSIWYG field showing formatted text, not raw HTML.

The toolbar provides:

- **B / I / U / H** — Bold, Italic, Underline, Heading formatting.
- **Icons ▾** — Inserts a PF2e action icon (◆ ◆◆ ◆◆◆ ↺ ◇) at the cursor.
- **DC ▾** — Inserts a level-appropriate DC value. For creatures: Moderate, High, Extreme. For hazards: Hard and Extreme. If the cursor is immediately after the text "DC", only the number is inserted; otherwise "DC N" is inserted.
- **Atk ▾** (creatures only) — Inserts a spell attack modifier at Moderate, High, or Extreme.
- **Damage buttons** — Inserts a damage expression at the cursor, then opens the damage type picker.
  - For **hazards**: L / M / H buttons for level −1 / at level / level +1 damage.
  - For **creatures**: two dropdown groups — **Single-Target Damage** (L/M/H/E, adjusting for 1- vs 2-action abilities) and **Area Damage** (H/M/L, adjusting for limited vs. unlimited use).

---

### Spellcasting (Creatures only)

Click **+ Add Spellcasting Block** to add a spellcasting entry.

Each block has:

- **Name** — free text (e.g. "Divine Prepared Spells").
- **Tradition** — Arcane, Divine, Occult, or Primal.
- **Type** — Prepared, Spontaneous, or Innate.
- **DC** — with T/L/M/H/E tier quick-picks.
- **Atk** — with L/M/H/E tier quick-picks.
- **Focus Pts** — appears if any spell in the block has **Focus** frequency. Stepper from 1–3.

Click **+ Add Spell** to add spells to the block. Each spell has:

- **Name** — free text.
- **Action cost** — same icons as abilities.
- **Rank** — 0 for cantrips, 1–10 for ranked spells.
- **Frequency** (Innate only) — At-Will, Cantrip, 1/day, 2/day, 3/day, Focus, or Constant.
- **Description** — free text or HTML.

Remove an entire spellcasting block with **×** in its header row.

---

### Description

An optional free-text field for flavor text, lore notes, or GM reminders. Appears at the bottom of the stat block.

---

## Saving and Adding to the Encounter

Click **Save Creature** (or **Save Hazard**, or **Save Changes** if editing). The entry is saved to your local database.

After saving, the creature appears selected in the statblock drawer. Use the **Add to Encounter** button to add it to the encounter, the same as any other creature.

Saved custom creatures appear in the search results list and can be found by name.

---

## Editing a Saved Custom Creature

Open the statblock for your custom creature and click the **pencil icon** (✎). The wizard opens pre-populated with the existing values. Make changes and click **Save Changes**.

---

## Copying an Existing Creature as a Starting Point

In any creature's statblock, click the **copy icon**. A new custom creature is created pre-filled with the published creature's stats (HP, AC, saves, attacks, abilities, spellcasting, etc.), named "[Original Name] (Custom)". The wizard opens so you can adjust values before saving.

Use this when a creature exists in the database but needs modification: a new attack, a different damage type, a level change, or a house-rule ability.

---

## How Level Scaling Works

When you set a level and click **Next →**, all stats are pre-filled from the **official PF2e creature creation tables** (GM Core Tables 9-2 through 9-12). The tier buttons always show the table value for your chosen level.

If you change stats manually and then go back to change the level, all stats reset to Moderate tier at the new level. To preserve custom numbers across a level change, note them down before going back.

**Stats derived from the tables:**

| Stat | Tiers Available |
|---|---|
| HP | Low, Moderate, High |
| AC | Low, Moderate, High, Extreme |
| Fortitude / Reflex / Will | Terrible, Low, Moderate, High, Extreme |
| Perception | Terrible, Low, Moderate, High, Extreme |
| Ability Modifiers (Str/Dex/Con/Int/Wis/Cha) | Terrible, Low, Moderate, High, Extreme |
| Attack Bonus | Low, Moderate, High, Extreme |
| Damage | Low, Moderate, High, Extreme |
| Skills | Terrible, Low, Moderate, High, Extreme |
| Resistances / Weaknesses | Low, Moderate, High |
| Spell DC | Moderate, High, Extreme |
| Spell Attack | Moderate, High, Extreme |

For **hazards**, the tables use hazard-specific offense and defense values, with Low/High/Extreme for defenses and a simple/complex split for attacks and damage.

Custom creatures can be level-scaled by Seneschal's encounter manager after saving, using the same algorithm as official creatures.
