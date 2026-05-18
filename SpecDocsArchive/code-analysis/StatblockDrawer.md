# StatblockDrawer

## Files Covered
- `src/components/StatblockDrawer/StatblockDrawer.tsx`
- `src/components/StatblockDrawer/statblockHelpers.ts`

---

## statblockHelpers.ts

### Purpose
A collection of pure utility functions for extracting and formatting data from raw `PF2ECreature` JSON, plus the trait keyword tooltip system and the elite/weak HTML adjustment engine. Used extensively by `StatblockDrawer.tsx` and by `importCreature.ts`.

### Exported Functions

#### Data Extraction (from `PF2ECreature`)
| Function | Returns | Description |
|---|---|---|
| `getLevel(c)` | `number` | Extracts level from `system.details.level`, handles both object and number form |
| `getSize(c)` | `string` | Extracts size code and maps to display name (e.g., `'med'` → `'Medium'`) |
| `getLanguages(c)` | `string` | Formats languages from either string or object form |
| `formatMod(n)` | `string` | Formats a number as `+N` or `-N` or `—` for undefined |
| `getSkills(c)` | `Array<{name, mod}>` | Extracts non-zero skills, sorted alphabetically |
| `getSenses(c)` | `string` | Builds the Perception line: `"Perception +12; darkvision, scent 30 ft."` |
| `getSpeedString(c)` | `string` | Builds the Speed line: `"30 ft., fly 60 ft."` |
| `getImmResWeak(c)` | `{immunities, resistances, weaknesses}` (strings) | Formats immunity/resistance/weakness lists |
| `getAttacks(c)` | `PF2EItem[]` | Filters items to `type === 'melee' \| 'ranged'` |
| `getActions(c)` | `PF2EItem[]` | Filters items to `type === 'action'` with action/reaction/free action types |
| `getPassives(c)` | `PF2EItem[]` | Filters items to `type === 'action'` with passive type |
| `getDamageString(damageRolls)` | `string` | Formats damage rolls into `"2d8+5 slashing + 1d6 fire"` style |
| `getActionCostLabel(item)` | `string` | Returns `[A]`, `[AA]`, `[R]`, `[F]`, etc. (not used in current UI, legacy) |

#### HTML Processing
| Function | Description |
|---|---|
| `stripFoundryMacros(html)` | Converts Foundry inline macros (`@Damage[...]`, `@Check[...]`, `[[/gmr ...]]`, `@UUID[...]`, `@Template[...]`) to human-readable plain text. The most complex function in this file. |
| `linkRolls(html)` | Wraps dice expressions and modifiers in `<span class="pf2roll" data-expr="...">` for the inline dice roller. |
| `linkKeywords(html)` | Wraps known trait keywords in `<span class="pf2kw" data-tip="...">` tooltip spans. Requires `initTraitDescriptions` to have been called first. |
| `applyEliteWeakToHtml(rawHtml, dmgMod, dcMod)` | Modifies `@Damage` macro dice and `@Check` DCs in raw HTML to reflect elite/weak adjustments. Only touches the *first* `@Damage` macro. Never touches flat checks. |
| `extractDamageGroups(rawHtml)` | Parses all `@Damage` macros from raw HTML into `{ expr, label }[]` pairs for the multi-damage roller button. |

#### Utility
| Function | Description |
|---|---|
| `isLimitedUse(item)` | Returns `true` if a PF2E item is "limited use" (recharge, per-day, etc.) vs at-will. Used to determine elite/weak damage modifier (±2 vs ±4). |
| `initTraitDescriptions()` | Async. Loads trait descriptions from the DB and builds the keyword regex. Called once on app init. |

#### Trait Keyword System
- `_keywordMap: Record<string, string>` — populated by `initTraitDescriptions()` from the DB
- `_keywordRegex: RegExp | null` — compiled regex built from the keyword map keys
- `buildKeywordRegex(map)` — builds a case-insensitive alternation regex, sorted longest-first to avoid partial matches
- `linkKeywords(html)` — uses these module-level globals; returns unchanged HTML if not yet initialized

### `DamageGroup` Interface
`{ expr: string; label: string }` — a single parsed damage group for the multi-roller.

---

## StatblockDrawer.tsx

### Purpose
The statblock display drawer. Renders either the `CustomCreatureWizard` (when in wizard mode), a full creature statblock (`StatblockContent`), or an empty state. Acts as the right-most column of the GM view.

### Structure

#### `StatblockDrawer` (exported)
The outer shell. Simply switches between `CustomCreatureWizard`, `StatblockContent`, or the empty state based on `wizardOpen` and `creature` props. The distinction between custom and official creatures for `StatblockContent` is detected here but the rendering is currently identical for both (the two branches could be merged).

#### `StatblockContent` (internal)
The main statblock renderer. Very large (~900 lines). Handles:

**State:**
- `diceRoll`, `damageRoll`, `multiDamageRoll` — which roller is currently open and its anchor position
- `confirmDelete` — delete confirmation UI state
- `scaleDropdownOpen` — level scaling dropdown state
- `aonURL` — fetched asynchronously from the Archives of Nethys search API

**Stat display with condition/elite-weak overlays:**
All displayed stats are computed as `base + condition penalty + elite/weak modifier`. Debuffed stats are rendered in red; elite/weak-adjusted stats in gold (elite) or blue (weak).

**Sections rendered (in order):**
1. Header: creature name, level, entity type, size, elite/weak badge, scaled level badge
2. Action buttons: AoN link, edit, copy, scale dropdown, close
3. Trait chips
4. Optional creature image (from GitHub raw CDN)
5. Body:
   - Recall Knowledge DC (creatures only)
   - Scaling banner (if scaled)
   - Elite/Weak banner
   - Active conditions summary
   - Perception / senses
   - Custom skills (custom creatures only)
   - Languages
   - Official skills
   - Ability scores (clickable to roll)
   - AC + saves (clickable to roll Fort/Ref/Will)
   - HP + immunities/resistances/weaknesses
   - Passive abilities
   - Reactions
   - Speed
   - **Attacks** — three separate rendering paths:
     - Official attacks (unscaled): via `AttackBlock`
     - Scaled attacks: inline JSX in `StatblockContent`
     - Custom creature attacks (unscaled): inline JSX in `StatblockContent`
   - Spellcasting: via `SpellcastingBlock`
   - Offense actions: via `ItemBlock`
   - Elite/Weak ability note
   - Custom abilities (custom creatures only)
   - Public notes / flavor text
   - Source
   - "Add to Encounter" button
   - Delete button (custom creatures only)
6. Floating rollers: `DiceRoller`, `DamageRoller`, `MultiDamageRoller`

#### `AttackBlock` (internal)
Renders one official PF2E attack item with full condition-aware and elite/weak-aware bonus/damage display. Shows MAP brackets (clickable for MAP 2 and MAP 3). Handles trait display with keyword tooltips.

#### `ItemBlock` (internal)
Renders a passive ability, reaction, or offense action. Applies level scaling and elite/weak HTML adjustments to the description. Shows a "Roll damage" button if the description contains `@Damage` macros.

#### `SpellcastingBlock` (internal)
Renders one spellcasting entry (tradition, type, DC, attack, grouped spells). Groups spells by rank (prepared/spontaneous) or by frequency (innate). Each spell name is a `SpellNameLink`.

#### `SpellNameLink` (internal)
A clickable spell name that opens a `SpellPopup` on click.

#### `SpellPopup` (internal)
A floating popup showing a spell's description. Positions itself above or below the anchor link based on available viewport space. Applies elite/weak adjustments to the description.

#### `GetAONURL` (internal async function)
Makes a POST request to the Archives of Nethys Elasticsearch API to find the URL for a creature. Returns the first result's URL. Silently fails on error. Always returns Remaster content (higher priority in AoN's index).

#### `traitColor` (exported)
Utility: returns the hex color for a trait chip based on rarity (rare/uncommon/unique) or alignment (good/evil/lawful/chaotic/neutral).

---

## Interfaces With
| Module | Purpose |
|---|---|
| `../../db/schema` | `CreatureRecord` type |
| `../../types/pf2e` | `PF2ECreature`, `PF2EItem` |
| `../../types/diceHistory` | `RollHistoryEntry` |
| `../../types/encounter` | `Condition`, `CustomSpellcastingEntry`, `CustomSpell` |
| `../../types/conditionEffects` | `computePenalties`, `computeAttackPenalty`, `computeDamagePenalty` |
| `../DiceRoller/DiceRoller` | `DiceRoller`, `DamageRoller`, `MultiDamageRoller`, `DamageGroupInput` |
| `../CustomCreatureWizard/CustomCreatureWizard` | `CustomCreatureWizard` component |
| `../EncounterManager/EncounterManager` | `getRecallKnowledge` |
| `../../utils/importCreature` | `importSpellcasting` |
| `../../utils/levelScaling` | `buildScaledCreature`, `scaleAbilityHtml`, `eliteWeakHpDelta`, `eliteWeakLevel` |
| `./statblockHelpers` | Many functions — see above |
| `../../sync/sync` | `loadTraitDescriptions` (via `statblockHelpers`) |

---

## Cleanup Opportunities

### StatblockDrawer.tsx
- **The file is extremely large (~1,480 lines).** The primary split should be: extract each sub-component (`AttackBlock`, `ItemBlock`, `SpellcastingBlock`, `SpellPopup`, `SpellNameLink`) into their own files within a `StatblockDrawer/` directory.
- **Three attack rendering paths** (official, scaled, custom) are nearly identical inline JSX blocks. These should be unified into a single `AttackLine` component that accepts a normalized attack object — whether it came from a PF2E item, a scaled stat, or custom data.
- **`StatblockContent` has too many responsibilities.** The roll state, condition penalty computation, elite/weak modifier computation, and AoN URL fetching could each be extracted to hooks: `useRollState`, `useStatPenalties`, `useEliteWeakMod`, `useAonUrl`.
- The `StatblockDrawer` outer shell has two branches for custom vs. official creatures that render identical `StatblockContent` — these should be merged into one.
- `GetAONURL` makes a network call on every creature selection. It should handle the case where the creature hasn't changed (avoid re-fetching on re-render).
- `traitColor` is exported from here but conceptually belongs in a shared `utils/display.ts` or similar — it's also partially duplicated in `CreatureRow.tsx`.

### statblockHelpers.ts
- `getLevel` and `getSize` duplicate implementations that also exist in `sync/sync.ts`. One canonical version should live in `utils/pf2eHelpers.ts` (or similar) and be imported by both.
- `getActionCostLabel` is defined but **never called** anywhere in the codebase. It should be removed.
- `isLimitedUse` duplicates `isLimitedUseText` in `levelScaling.ts`. Consolidate to one function.
- The module-level `_keywordMap` and `_keywordRegex` globals are effectively a lazy singleton. This pattern works but is implicit — a more explicit pattern would be a `TraitKeywordService` class or a context value.
- `stripFoundryMacros` is the most complex function and is also called from `importCreature.ts` and `CustomCreatureWizard.tsx`. It is a strong candidate for its own file (`utils/foundryMacros.ts`) with dedicated tests.
