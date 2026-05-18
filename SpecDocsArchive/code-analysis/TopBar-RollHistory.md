# TopBar & RollHistory

## Files Covered
- `src/components/TopBar/TopBar.tsx`
- `src/components/RollHistory/RollHistory.tsx`

These are the two app-chrome UI components that sit above the main content area.

---

## TopBar.tsx

### Purpose
The application header bar. Renders the app brand, the main section navigation (Encounters / Rules / Characters), the roll history toggle button, and the settings menu (currently only containing the "Reset creature database" action).

### Props
| Prop | Description |
|---|---|
| `activeSection` | Current section: `'gm' \| 'rules' \| 'characters'` |
| `onSectionChange` | Called when a nav button is clicked |
| `historyCount` | Number of roll history entries (shown as a badge) |
| `historyOpen` | Whether the history panel is visible |
| `onToggleHistory` | Toggles the history panel |
| `onResetDatabase` | Async callback that clears and re-syncs the creature DB |

### Internal State
- `menuOpen` — whether the settings dropdown is open
- `confirmOpen` — whether the reset confirmation dialog is showing
- `resetting` — whether the reset is in progress (disables confirm buttons)

### Behavior
- **Settings menu**: opens on ⚙ button click; closes on outside click (via `mousedown` listener on the `menuRef` element).
- **Reset confirmation**: clicking "Reset creature database" in the settings menu closes the menu and opens a confirmation modal overlay. The overlay closes on outside click unless a reset is in progress. Clicking "Yes, reset database" calls `onResetDatabase()` and shows a loading state.
- **History badge**: shows roll count; caps display at `99+`.
- **Nav pills**: the active section pill is styled distinctly.

### Exported Utility
`formatTimestamp(ts: number): string` — formats a Unix timestamp as `"May 9, 02:30 PM"` style. Currently defined here but **not used within this file** — it appears to be a utility intended for external use (possibly for display in roll history or future features). Since it is exported, it may be used elsewhere.

> **Note:** A search of the codebase did not find any other file importing `formatTimestamp` from `TopBar`. It may be dead code.

### Interfaces With
| Module | Purpose |
|---|---|
| `../../types/encounter` | `Section` type |
| `./TopBar.module.css` | Styles |

### Cleanup Opportunities
- `formatTimestamp` should either be used (e.g., in `RollHistory`) or removed. If kept, it belongs in `utils/formatters.ts`, not in a UI component.
- The settings menu is simple enough that a `SettingsMenu` sub-component could be extracted if more settings are added later.
- The confirmation dialog pattern (overlay + dialog + cancel/confirm buttons) is reusable — if similar patterns appear elsewhere, a generic `ConfirmDialog` component would reduce duplication.

---

## RollHistory.tsx

### Purpose
A floating panel that shows the history of dice rolls made during the session. Slides in below the `TopBar`. Closes on outside click.

### Props
| Prop | Description |
|---|---|
| `entries` | Array of `RollHistoryEntry[]` — most recent first |
| `onClear` | Clears all entries |
| `onClose` | Closes the panel |

### Internal State / Refs
- `panelRef` — used for outside-click detection
- `listRef` — used to scroll to top when a new entry arrives

### Behavior
- **Outside click closes**: `pointerdown` listener on `window`; closes when click is outside `panelRef`.
- **Auto-scroll to top**: `useEffect` on `entries.length` scrolls `listRef.current` to top when a new roll is added (entries are prepended, so the newest is always first).
- **Entry display**: For each `RollHistoryEntry`:
  - Label (if present), expression, breakdown `[rolls] +modifier`, timestamp
  - Total displayed on the right, colored: green for nat 20 (d20 roll with a single d20), red for nat 1, normal otherwise
  - Nat 20 / nat 1 detection: checks if die sides = 20 and exactly one die was rolled

### Helper
`formatTime(ts: number): string` — formats as `"02:30:45 PM"`. A similar function (`formatTimestamp`) exists in `TopBar.tsx` with slightly different formatting. These should be one shared utility.

### Interfaces With
| Module | Purpose |
|---|---|
| `../../types/diceHistory` | `RollHistoryEntry` type |
| `./RollHistory.module.css` | Styles |

### Cleanup Opportunities
- `formatTime` (here) and `formatTimestamp` (in `TopBar.tsx`) are duplicate timestamp formatters. Both should be replaced by a single `formatTimestamp(ts, format?)` utility in `utils/formatters.ts`.
- The outside-click pattern (`panelRef` + `window.addEventListener('pointerdown', ...)`) is also used in `DiceRoller.tsx`, `SpellPopup` in `StatblockDrawer.tsx`, and `TopBar.tsx`. This is another strong candidate for a shared `useOutsideClick(ref, onClose)` hook.
- The panel is always fully re-mounted when `historyOpen` toggles. Consider adding a CSS transition for a smoother open/close experience (this is a UX note, not a code quality issue).
