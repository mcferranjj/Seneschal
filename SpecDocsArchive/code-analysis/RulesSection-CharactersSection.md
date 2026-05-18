# RulesSection & CharactersSection

## Files Covered
- `src/components/RulesSection/RulesSection.tsx`
- `src/components/CharactersSection/CharactersSection.tsx`

These are the two non-GM sections of the app, accessible via the top navigation. Both are self-contained page-level components.

---

## RulesSection.tsx

### Purpose
A quick-reference rules panel for GMs during play. Contains a searchable, accordion-style list of PF2E conditions and a list of basic actions.

### State
- `tab` — `'conditions'` or `'actions'` — which tab is active
- `condSearch` — text filter for the conditions list
- `expanded` — which condition or action name is currently expanded (one at a time)

### Data (hardcoded)
All data is static arrays defined at the top of the file:

#### `CONDITIONS`
An array of `{ name, valued?, desc }` objects. Contains all PF2E Remaster conditions:
- Combat conditions (Grabbed, Prone, Blinded, Frightened, etc.)
- Death/dying conditions (Dying, Wounded, Doomed, Unconscious)
- Detection conditions (Concealed, Hidden, Undetected, Invisible)
- Social/attitude conditions (Friendly, Hostile, Indifferent, etc.)
- Object conditions (Broken)

**Known issue**: `Confused` appears twice in the array with slightly different descriptions.

#### `BASIC_ACTIONS`
An array of `{ name, cost, desc }` objects covering the ~17 standard basic actions in PF2E (Strike, Stride, Seek, Aid, etc.).

### Rendering
- Tab buttons switch between Conditions and Basic Actions views.
- Conditions tab: a search input filters by name or description text. Each condition renders as a button (accordion header) that expands to show the description.
- Actions tab: same accordion style, no search filter.
- `valued` conditions show a `#` badge after the name.

### Interfaces With
- `./RulesSection.module.css` — styles only; no external data or component dependencies.

### Cleanup Opportunities
- **Duplicate entry**: `Confused` appears twice in `CONDITIONS`. One should be removed.
- The `CONDITIONS` and `BASIC_ACTIONS` arrays are pure data and should be extracted to `src/data/rulesData.ts`. This would make them importable by other components and independently testable, and would reduce the component file to just its rendering logic.
- The accordion state uses a single `expanded: string | null` that matches by `name`. Since `Confused` appears twice, expanding it would expand both entries simultaneously. Switching to an index-based key would fix this.
- `condSearch` filters both `name` and `desc` — this is correct behavior but could be slow on very large lists. For the current data size it's fine.
- The tab state (`tab`) and expanded state could be reset when switching tabs (currently the same name could remain "expanded" across tabs if both lists have an item with the same name).
- There is no separate search for the Actions tab. This is a minor UX gap but probably not high priority.

---

## CharactersSection.tsx

### Purpose
A party management panel for tracking player characters. Allows adding, editing, and deleting PC records with basic stat blocks (level, HP, AC, saves, perception). Supports live HP tracking with +/− buttons.

### State
- `characters` — array of `CharacterRecord[]` loaded from the DB
- `showForm` — whether the add/edit form overlay is visible
- `editingId` — the ID of the character being edited (null = adding new)
- `form` — the draft character form state
- `selectedId` — which character card is selected (currently just visual highlight)

### DB Interaction
Direct Dexie calls without abstraction:
- `db.characters.toArray()` — load all on mount and after mutations
- `db.characters.put({ id, ...form })` — update (edit mode)
- `db.characters.add({ id: 'pc-{timestamp}', ...form })` — create new
- `db.characters.delete(id)` — delete
- `db.characters.update(id, { hp })` — HP adjustment

### Character Form
A modal overlay with fields:
- Name (required), Player name
- Ancestry (dropdown), Class (dropdown)
- Level, Max HP, AC, Perception, Fort, Ref, Will

`blankCharacter()` returns the default form values (Human Fighter, Level 1, HP 20, AC 15, etc.).

The `f(val)` helper returns a change handler for a given form field key, handling `type="number"` inputs automatically.

### Character Cards
Each character displays:
- Name, player name, ancestry, class, level
- AC, Fort, Ref, Will, Perception (formatted with +/-)
- HP bar (color-coded: green > 50%, yellow 25–50%, red < 25%)
- HP value and +/−1/5/10 adjustment buttons
- Edit (✎) and delete (✕) buttons

Clicking a card selects it (toggle). Currently selection only adds a CSS highlight — no other behavior is triggered.

### Hardcoded Data
`PF2E_CLASSES` (23 classes) and `ANCESTRIES` (22 ancestries) — static lists for the dropdowns.

### Interfaces With
| Module | Purpose |
|---|---|
| `../../db/db` | `db` singleton, `CharacterRecord` type |
| `./CharactersSection.module.css` | Styles |

### Cleanup Opportunities
- **`CharacterRecord` is imported from `db/db.ts`** rather than `db/schema.ts`. As noted in the DB analysis, this type should be in `schema.ts`.
- `PF2E_CLASSES` and `ANCESTRIES` are hardcoded lists that may become stale as PF2E releases new content. They could be extracted to `src/data/pf2eConstants.ts` for easier maintenance.
- The `selectedId` state currently only provides a visual highlight — it has no downstream behavior. Either connect it to something useful (e.g., opening a detail view) or remove it.
- `adjustHp` does a read-modify-write pattern: reads from local state, computes new HP, writes to DB, updates local state. This is fine but could be cleaner if the DB update also returned the updated record.
- There is no confirmation on delete — a character can be accidentally deleted. Consider adding a confirmation step.
- The HP bar colors (green/yellow/red) use raw hex strings inline. These should use CSS variables or a shared color utility.
- The form could benefit from validation beyond "name must not be empty" — e.g., HP > 0, level between 1–20.
- The `load()` callback pattern (called after every mutation) is a correct approach but results in a full re-fetch after every change. For HP adjustments specifically, the local state update (`setCharacters(prev => ...)`) is done alongside the DB write, making the re-fetch redundant. Consider removing the `load()` call after `adjustHp`.
