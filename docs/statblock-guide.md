# Statblock Drawer Guide

The Statblock Drawer is the panel on the right side of the screen that displays a creature's full stat block.

---

## Opening and Closing the Drawer

- **Opening:** Click any creature or hazard in the search results. Its stat block loads in the right panel.
- **Closing:** Click the **✕** button in the top-right corner of the stat block header.
- If no creature is selected, the drawer shows a prompt: *"Click any result to view its statblock."*

---

## What's Displayed

### Header

- **Creature name** — includes an Elite or Weak label if that adjustment is active, and a level-scaling badge (⇅ Lv X) if the creature has been scaled.
- **Type and level** — shows whether it's a Creature, Simple Hazard, or Complex Hazard, its effective level, and (for creatures) its size. If Elite/Weak or level scaling is active, the base level is shown in parentheses.
- **Trait chips** — colored badges showing rarity, size (for creatures), and all other traits. See [Trait Tooltips](#trait-tooltips).
- **Action buttons** in the top-right corner:
  - **AoN ↗** (official creatures only) — opens the creature's page on Archives of Nethys in a new tab.
  - **✎** (custom creatures only) — opens the creature in the Custom Creature Wizard for editing.
  - **⧉** — copies the creature as a new custom creature for editing.
  - **⇅** — opens the level scaling dropdown (see [Level Scaling](#level-scaling)).
  - **✕** — closes the drawer.

### Creature Image

If the creature has an official portrait, it is displayed below the trait row. Images load from the Foundry VTT PF2e repository. If no image is available, none is shown.

### Recall Knowledge

For creatures (not hazards), the Recall Knowledge DC and relevant skills are shown near the top of the body. This DC adjusts when Elite/Weak or level scaling is active, and is highlighted in teal when modified.

### Status Banners

When a creature in the encounter has modifiers applied, banners appear:

- **Level Scaling banner** (teal) — shown when the creature has been scaled to a different level.
- **Elite / Weak banner** — gold for Elite, blue for Weak. Lists the stat adjustments applied.
- **Active Conditions** — lists any conditions currently affecting the creature (e.g., *Frightened 1, Enfeebled 2*). These affect the numbers shown on relevant rolls.

### Defenses

For creatures and hazards with HP:

- **AC** — Armor Class, with any condition or Elite/Weak modifier applied.
- **Fort / Ref / Will** — saving throw modifiers, each is a clickable roll button (see [Rolling Dice](#rolling-dice)).
- **HP** — current maximum hit points. For Elite/Weak creatures, the base HP is shown in parentheses.
- **Hardness** (hazards only) — shown before HP when applicable.
- **Break Threshold** (hazards only) — shown in muted text as `BT X` next to the HP value.
- **Immunities, Resistances, and Weaknesses** — displayed inline with HP.

### Perception and Senses

- **Creatures:** Perception modifier shown as a clickable roll button, followed by any special senses (darkvision, scent, etc.).
- **Hazards:** Stealth DC and modifier shown instead.

### Languages and Skills

Shown for creatures only. Each skill modifier is a clickable roll button.

### Ability Scores

The six ability modifiers (Str, Dex, Con, Int, Wis, Cha) are shown for creatures. Each is clickable to roll an ability check.

### Speed

Shown for creatures in feet, with all movement types listed (land, fly, swim, burrow, etc.).

### Passives and Reactions

Shown before the offense section divider. Each ability block displays:

- **Name** with action cost symbol (◆, ◆◆, ◆◆◆, ↺, ◇, or none for passives)
- **Traits** (in parentheses after the name)
- **Trigger** (for reactions)
- **Full description text**
- A **Roll damage** button if the ability text contains a damage expression

### Attacks

Each attack is shown as a single line:

**Melee / Ranged ◆ Name +X** (traits), **Damage** Xd6+Y type

- The **attack bonus** is clickable to roll the attack (1st action). Right-click to enter a manual result.
- **MAP brackets** `[+X/+Y]` show the 2nd and 3rd action attack bonuses, accounting for the agile trait. Each bracket value is individually clickable and right-clickable.
- The **Damage** entry is clickable to roll damage independently. Right-click for manual input.
- Trait keywords in the attack line are interactive. See [Trait Tooltips](#trait-tooltips).
- Strike abilities listed after the damage (like "plus Grab") are shown as glossary links. See [Ability Glossary Popups](#ability-glossary-popups).

If conditions are active on the creature (e.g., Clumsy), the affected attack or damage numbers are highlighted in red with the penalty applied.

### Actions (Offense)

Active actions that aren't reactions are shown after attacks, using the same layout as passives: name, action cost, description, and a Roll damage button when applicable.

### Spellcasting

If the creature can cast spells, a spellcasting line is shown:

**Tradition Type Spells** DC X, attack +Y; Rank/Frequency Spell Name, Spell Name...

- Click a spell name to open a popup with the spell's full description. If the spell deals damage, the popup includes a **Roll damage** button.
- Innate spells are grouped by frequency (Constant, At Will, 1/Day, etc.). Prepared and spontaneous spells are grouped by rank.

### Hazard-Only Sections

- **Description** — flavor and rules text, shown above defenses.
- **Disable** — instructions for disabling the hazard.
- **Routine** (complex hazards only) — the hazard's actions each round.
- **Reset** — conditions under which the hazard resets.

### Custom Creature Abilities

Custom creatures display abilities in the same format as official ability blocks. Ability names that match the Bestiary Ability Glossary are clickable for rules summaries. See [Ability Glossary Popups](#ability-glossary-popups).

### Flavor Text and Source

- Official creatures may include **public notes** (flavor/lore text) at the bottom.
- Custom creatures may include optional **flavor text** entered during creation.
- The **source book** is shown at the very bottom for official creatures.

---

## Trait Tooltips

Trait chips in the header and trait keywords inside attack lines can show rules descriptions.

- **Hover** over a trait to see a tooltip popup with its rules text.
- **Click** a trait to pin the tooltip open as a scrollable popup.
- Click the **✕** button on the pinned popup, or click anywhere outside it, to dismiss it.

Trait descriptions come from Pathfinder Monster Core (ORC license) and cover creature types, damage types, weapon properties, size traits (Tiny through Gargantuan), and more. Traits without a database entry are shown as plain text without tooltip behavior.

---

## Ability Glossary Popups

Standard monster abilities (Grab, Constrict, Frightful Presence, Reactive Strike, etc.) are recognized from the Pathfinder Bestiary Ability Glossary. When a recognized ability name appears in the stat block:

- The name is shown with a **dotted underline** and a "Click for rules summary" tooltip on hover.
- **Click the name** to open a popup with the full rules text, sourced from Monster Core.
- Within the popup, any ability name also in the glossary is shown as a **clickable link** to navigate to that entry within the same popup.
- The popup header shows a **← Back button** when you've navigated to a nested entry.
- Click the **✕** button or click outside the popup to close it.

This works in three places:
- Ability names in **passive and action blocks** (official creatures)
- Ability names in **custom creature ability blocks**
- Strike ability names in **attack lines** (e.g., "plus Grab")

The glossary covers about 50 standard abilities including: All-Around Vision, Attack of Opportunity, Constrict, Darkvision, Engulf, Fast Healing, Ferocity, Frightful Presence, Grab, Low-Light Vision, Power Attack, Reactive Strike, Regeneration, Sneak Attack, Swallow Whole, Trample, and others.

---

## Keyword Tooltips in Descriptions (pf2kw)

Ability and spell description text from official creatures sometimes contains highlighted keywords (rendered by the Foundry VTT data format) with brief tooltip text embedded in them. Hovering over one of these keywords shows a small tooltip with the embedded text. These are hover-only and do not pin.

---

## Rolling Dice

The following elements are clickable:

| Element | Left-click | Right-click |
|---|---|---|
| Perception | Roll 1d20 + modifier | Enter manual d20 result |
| Skill modifier | Roll 1d20 + modifier | Enter manual d20 result |
| Ability score (Str, Dex, etc.) | Roll 1d20 + modifier | Enter manual d20 result |
| Fort / Ref / Will save | Roll 1d20 + modifier | Enter manual d20 result |
| Attack bonus (1st action) | Roll attack + show damage popin | Enter manual d20 result |
| MAP bracket (2nd action) | Roll attack at MAP–5 | Enter manual d20 result |
| MAP bracket (3rd action) | Roll attack at MAP–10 (or –8/–4 agile) | Enter manual d20 result |
| Damage entry | Roll damage dice | Enter manual damage result |
| Roll damage button | Roll all damage groups | Enter manual damage result |
| Clickable expressions in descriptions | Roll the dice expression | Enter manual result |

**Left-click** opens a dice roller popup near the cursor showing the roll result, which is also added to the roll history.

**Right-click** opens a manual input box for typing a physical dice result. The entered result is processed as if Seneschal had rolled it.

### Condition and Elite/Weak Modifiers on Rolls

If the creature has active conditions (such as Clumsy or Frightened), the relevant modifiers are automatically factored into the numbers shown and rolled. Debuffed stats are highlighted in **red**.

Elite and Weak adjustments are applied similarly. Elite stats are highlighted in **gold**, Weak stats in **blue**. Elite adds +2 to AC, saves, perception, skills, and damage; Weak subtracts the same amounts.

---

## Level Scaling

Click the **⇅ button** in the stat block header to open a dropdown for scaling the creature to a different level.

- Click a level number to apply scaling. All stats (AC, HP, saves, perception, skills, ability scores, attacks, spellcasting DCs, resistances, weaknesses) are recalculated for the target level.
- Scaled stats are shown in **teal**.
- Click **✕ Remove scaling** at the top of the dropdown to return to the base stat block.

If the drawer is opened from search (outside an encounter), scaling is a preview. The scaled level is used when **+ Add to Encounter** is clicked. If the creature is already in the encounter, scaling is applied to that encounter instance directly.

Level scaling and Elite/Weak adjustments can be combined. Scaling is applied first, then Elite/Weak on top.

---

## Adding to an Encounter

Click the **+ Add to Encounter** button at the bottom of the stat block to add the creature to the current encounter. If a preview scaling level is set, that scaling carries over.

---

## Custom Creatures

Custom creatures show extra controls in the stat block header:

- **✎ Edit button** — opens the wizard to edit this custom creature.
- **⧉ Copy button** — available for all creatures; creates a new custom creature pre-filled with this creature's data.

Custom creatures also have a **Delete** button at the bottom of the stat block. Confirmation is required before permanent deletion.
