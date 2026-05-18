# Characters & Rules Reference — Guide

Both of these tabs are under construction. This guide documents what currently works.

---

## The Party Tab (Characters)

The **Party** tab is a GM-side roster for tracking player characters during a session. It stores key stats for each PC in one place.

### What It Does Right Now

**Adding characters**

Click **+ Add Character** (top-right) to open the entry form. Fields:

- **Name** — required
- **Player** — the player's name
- **Ancestry** — selected from core and common PF2e ancestries
- **Class** — all current PF2e classes (Alchemist through Wizard)
- **Level** — 1 through 20
- **Max HP** — sets both maximum and current HP on creation
- **AC** — Armor Class
- **Perception** — perception modifier
- **Fort / Ref / Will** — saving throw modifiers

Click **Save** to add the character, or **Cancel** to close the form.

**Viewing the party**

Each character appears as a card showing:

- Name, player name, ancestry, class, and level
- AC, Fortitude, Reflex, Will, and Perception modifiers
- Current and maximum HP with a color-coded bar:
  - Green above 50% HP
  - Yellow/amber between 25–50%
  - Red at 25% or below

**Adjusting HP**

Each card has quick HP buttons: **-10, -5, -1, +1, +5, +10**. Clicking a button applies the change immediately. HP is clamped between 0 and the character's maximum.

**Editing a character**

Click the pencil icon (✎) on a card to reopen the form pre-filled with that character's current values. Click Save to apply changes.

**Removing a character**

Click the ✕ icon on a card to permanently delete that character.

**Persistence**

Character data is saved to the browser's local IndexedDB database. The roster persists between sessions. No account or internet connection is required.

### Coming Soon

Planned additions include per-character condition tracking, initiative integration with the Encounter tracker, and deeper stat management. These are not yet implemented.

---

## The Rules Tab (Rules Reference)

The **Rules Reference** tab provides in-app lookup for PF2e rules. Switch between sub-sections using the **Conditions** and **Basic Actions** buttons at the top.

### What It Does Right Now

**Conditions**

A searchable list of all standard PF2e conditions (Blinded, Confused, Frightened, Grabbed, etc.).

- Type in the search bar to filter by condition name or description text.
- Click a condition name to expand its full description. Click again to collapse.
- Conditions with a numerical value (Frightened 1, Drained 2, etc.) show a small **#** badge.

**Basic Actions**

A reference list of the 17 core basic actions available to every creature (Aid, Crawl, Delay, Drop Prone, Escape, Interact, Leap, Raise a Shield, Ready, Release, Seek, Sense Motive, Stand, Step, Strike, Stride, Take Cover).

- Each entry shows the action name and its action cost symbol (◆ for 1 action, ◆◆ for 2, ◇ for free, ↺ for reaction).
- Click any action to expand a summary including key mechanics (DCs, bonuses, MAP values, etc.). Click again to collapse.

### Coming Soon

Possible future additions include spell traits, exploration activities, crafting and downtime rules, and common skill actions. These are not yet implemented.

---

## Data Storage

Character records are stored locally in the browser using IndexedDB (via the Dexie library).

- Nothing is sent to a server. Data stays on the local machine.
- Clearing the browser's site data will erase all characters. Export features are planned but not yet available.
- Data persists across sessions as long as browser storage is not cleared.
