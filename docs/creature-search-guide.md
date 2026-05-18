# Creature Search Guide

The Creature Search panel is on the left side of the screen. Use it to search and filter the full PF2e bestiary by name, level, traits, creature type, size, rarity, source, and entity type.

---

## Searching by Name

Type any part of a creature's name into the **Name** field. The results list updates after a short delay following your last keystroke.

- The search is not case-sensitive.
- Partial matches work. Leave the field blank to show all creatures (subject to other active filters).

---

## Filtering by Level Range

Set a minimum and maximum creature level in the **Level Range** section. The default range is -1 to 25.

- Click the number inputs to type a specific level.
- Valid range: **-1 through 25**.
- Click **"Use party level"** to set the range to your party's level ±4.

---

## Filtering by Traits

The **Traits** section narrows results by one or more creature traits (e.g., *undead*, *dragon*, *fire*).

### Adding Traits

1. Click into the **"Add trait…"** text box and start typing.
2. A dropdown of matching suggestions appears. Traits starting with your input appear first, followed by traits that contain it anywhere.
3. Press **Tab** to add the top suggestion.
4. Press **Enter**, or click the green **+** button to include a trait, or the red **−** button to exclude it.

### Include vs. Exclude

- **Included traits** (green chips): results are limited to creatures that have the trait.
- **Excluded traits** (red chips): results are limited to creatures that do not have the trait.
- Include and exclude filters can be combined.

### Switching a Trait Between Include and Exclude

Right-click any active trait chip to toggle it between include and exclude mode.

### Removing a Trait

Click the **×** button inside a trait chip to remove it.

---

## Filtering by Entity Type

Check one or both options in the **Entity Type** section:

- **Creature**: standard NPCs and monsters from the bestiary.
- **Hazard**: traps, haunts, and environmental hazards.

Checking neither (the default) returns both creatures and hazards.

---

## Filtering by Creature Type

Check any combination of PF2e creature categories in the **Creature Type** section. Available types:

Aberration, Animal, Astral, Beast, Celestial, Construct, Dragon, Dream, Elemental, Ethereal, Fey, Fiend, Fungus, Humanoid, Monitor, Ooze, Plant, Shade, Spirit, Time, Undead.

Checking nothing returns creatures of all types. This section is hidden when Entity Type is set to Hazards only.

---

## Filtering by Hazard Type

The **Hazard Type** section is visible when hazards are included in the search. Check one or more options to narrow results:

- **Trap**
- **Haunt**
- **Environmental**

Checking nothing returns all hazard types. This section is hidden when Entity Type is set to Creatures only.

---

## Filtering by Size

Check one or more sizes in the **Size** section:

- Tiny, Small, Medium, Large, Huge, Gargantuan

Checking nothing returns creatures of all sizes.

---

## Filtering by Rarity

Check one or more options in the **Rarity** section:

- **Common**, **Uncommon**, **Rare**, **Unique**

Checking nothing returns all rarities.

---

## Filtering by Source

The **Source** section controls which publications creatures can come from. Sources are organized in a collapsible tree with three top-level eras:

- **Remaster**: current PF2e editions (post-remaster)
- **Legacy**: pre-remaster PF2e content
- **Starfinder 2E**: SF2e content (if synced)

Within each era, sources are grouped into categories:

- **Core**: core rulebooks
- **Supplemental**: supplemental books
- **Adventure Paths**: Adventure Path volumes
- **Adventures**: standalone adventures
- **Society**: Pathfinder Society scenarios
- **Misc**: other publications

### Selecting Sources

- Click the **arrow (▸ / ▾)** next to an era or category to expand or collapse it.
- Check an era's checkbox to select or deselect all publications in that era.
- Check a category's checkbox to select or deselect all publications in that category.
- Check individual publication checkboxes for precise control.
- A partially filled (indeterminate) checkbox means only some items in that group are selected.

**Default selection:** On first launch, Seneschal selects all Remaster Core and Supplemental sources, plus any custom creatures you have created. This can be changed at any time.

---

## Sorting Results

The toolbar above the results list has two sort buttons: **Lvl** and **name**.

- Click **Lvl** to sort by creature level. Click again to reverse the order (indicated by ↑ or ↓).
- Click **name** to sort alphabetically. Click again to reverse.
- The active sort button is highlighted.

The default sort is level ascending.

---

## Reading the Results List

Each entry shows:

- **Name**: non-common creatures include a colored rarity badge (Uncommon, Rare, Unique).
- **Level badge**: shown on the right side of the row.
- **Size**: shown beneath the name.
- **Trait chips**: up to three traits shown as small colored chips beneath the name.

The total number of matching results is shown in the toolbar (e.g., "42 results").

---

## Opening a Creature's Statblock

Click anywhere on a creature's row to open its full statblock in the panel to the right. The selected row is highlighted with a red left border.

To navigate with a keyboard, press **Enter** or **Space** to select the focused row.

---

## Adding a Creature to the Encounter

Click the **+** button on the right side of any row to add that creature to the active encounter. This does not open the statblock.

---

## Creating a Custom Creature

Click the **＋ Custom Creature** button at the top of the results list to open the Custom Creature Wizard. From there you can build a homebrew creature or NPC and save it to your database.

Custom creatures are always included in the default source selection and appear in searches automatically.

---

## Clearing All Filters

Click the **Clear filters** button at the bottom of the search panel to reset all filters (name, level range, traits, type, size, rarity, source, and entity type) to their defaults. The current sort order is preserved.
