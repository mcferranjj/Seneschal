# Color System Plan

This document maps every color in the codebase to a base token and describes
the derivation rules needed to replace hardcoded values with computed variants.
It is the blueprint for the theming implementation.

---

## Base Tokens (user-configurable)

| Token              | Default    | Description                                                  |
|--------------------|------------|--------------------------------------------------------------|
| `--color-bg`       | `#f4ead6`  | Page background                                              |
| `--color-surface`  | `#faf4e8`  | Card and panel surfaces (slightly lighter than bg)           |
| `--color-primary`  | `#5c1414`  | Main action color — buttons, titles, active states, focus rings |
| `--color-accent`   | `#9a7228`  | Hover highlights, keyword underlines, scrollbar, blockquotes |
| `--color-text`     | `#2a1a0e`  | Primary body text                                            |
| `--color-healing`  | `#3a7a3a`  | Heal buttons, HP heal badge, condition value confirm         |
| `--color-damage`   | `#8a2a18`  | Damage buttons and HP damage badges                          |
| `--color-condition`| `#5a3a8a`  | Condition chips on combat cards, condition picker hover      |
| `--color-modified` | `#2a7a6a`  | Scaled/level-adjusted creature indicator badge               |

---

## Derived Tokens

These are never set by the user directly. They are computed from the base tokens
at runtime. The derivation method is `color-mix(in srgb, <base> <pct>, <target>)`
or alpha adjustment. Every hardcoded color in the codebase maps to one of these.

### From `--color-bg`

| Derived Token              | Derivation                              | Current hardcoded value | Used in                                              |
|----------------------------|-----------------------------------------|-------------------------|------------------------------------------------------|
| `--color-bg-banner`        | bg lightened ~5%                        | `#fdf3dc`               | Sync progress banner background                      |
| `--color-bg-error`         | bg darkened heavily toward primary      | `#3a1a1a`               | Sync error banner background                         |
| `--color-bg-overlay-light` | black at 4% opacity                     | `rgba(0,0,0,0.04)`      | Table row stripes, blockquote backgrounds            |
| `--color-bg-overlay-mid`   | black at 7-8% opacity                   | `rgba(0,0,0,0.07-0.08)` | Inline code background, spell popup close hover      |
| `--color-bg-modal-scrim`   | black at 40-65% opacity                 | `rgba(0,0,0,0.4-0.65)`  | Modal/overlay backdrops                              |

### From `--color-surface`

| Derived Token              | Derivation                              | Current hardcoded value | Used in                                              |
|----------------------------|-----------------------------------------|-------------------------|------------------------------------------------------|
| `--color-surface-dark`     | surface darkened ~20% toward primary    | `#2a1a1a`               | Settings menu background, confirm dialog background  |
| `--color-border`           | surface darkened ~15%                   | `#d8c8a4`               | Card borders, panel dividers, scrollbar thumb        |
| `--color-border-light`     | surface darkened ~8%                    | `#ecddc4`               | Lighter dividers, scrollbar track                    |
| `--color-border-banner`    | accent lightened ~30%                   | `#d4b870`               | Sync progress banner bottom border                   |

### From `--color-primary`

| Derived Token                  | Derivation                              | Current hardcoded value        | Used in                                                               |
|--------------------------------|-----------------------------------------|-------------------------------|-----------------------------------------------------------------------|
| `--color-primary-text`         | primary lightened to near-white warm    | `#f0e6cc`                     | Text/icons on primary-colored surfaces (buttons, topbar, headers)     |
| `--color-primary-text-muted`   | primary-text at 60% opacity             | `rgba(240,230,204,0.6)`       | Inactive nav pills                                                    |
| `--color-primary-text-dim`     | primary-text at 70-75% opacity          | `rgba(240,230,204,0.7-0.75)`  | Icon buttons on topbar, confirm cancel text                           |
| `--color-primary-text-faint`   | primary-text at 55% opacity             | `rgba(240,230,204,0.55)`      | Subdued text on dark surfaces (confirm dialog body)                   |
| `--color-primary-glow`         | primary at 12% opacity                  | `rgba(92,20,20,0.12)`         | Selected card shadow                                                  |
| `--color-primary-tint`         | primary at 6-7% opacity                 | `rgba(92,20,20,0.06-0.07)`    | Subtle hover backgrounds on light surfaces                            |
| `--color-primary-hover`        | primary lightened ~15%                  | `#a52020`                     | Confirm delete button hover                                           |
| `--color-primary-dark`         | primary darkened ~20%                   | `#3a1a1a`                     | Remove/delete button hover background, error banner bg                |
| `--color-primary-darker`       | primary darkened ~35%                   | `#2a1010`                     | HP-zeroed combat card background                                      |
| `--color-primary-darkest`      | primary darkened ~50%                   | `#4a1010`                     | (Previously used in statblock trait bar — now replaced)               |
| `--color-surface-on-primary`   | white at 8-10% opacity                  | `rgba(255,255,255,0.08-0.1)`  | Icon button backgrounds on topbar/header                              |
| `--color-surface-on-primary-2` | white at 15-18% opacity                 | `rgba(255,255,255,0.15-0.18)` | Active nav pill background, close button on crimson header            |
| `--color-surface-on-primary-3` | white at 20-22% opacity                 | `rgba(255,255,255,0.2-0.22)`  | Icon button hover background, active icon button                      |
| `--color-border-on-primary`    | white at 15-20% opacity                 | `rgba(255,255,255,0.15-0.2)`  | Borders on dark surfaces (settings menu, confirm dialog)              |
| `--color-border-on-primary-2`  | white at 35% opacity                    | `rgba(255,255,255,0.35)`      | Active icon button border                                             |

> **Note:** The statblock header uses `#fff` (pure white) for text rather than
> `--color-primary-text`. This is a minor inconsistency — it could be unified
> with `--color-primary-text` or left as a separate derived token.

### From `--color-accent`

| Derived Token              | Derivation                              | Current hardcoded value        | Used in                                                     |
|----------------------------|-----------------------------------------|-------------------------------|-------------------------------------------------------------|
| `--color-accent-bright`    | accent brightened/saturated ~25%        | `#c8922a`                     | Dice roller die labels, roll history crit result, fumble warning text |
| `--color-accent-dark`      | accent darkened ~20%                    | `#8a6a18`                     | Elite button (active state), encounter amber action         |
| `--color-accent-darker`    | accent darkened ~35%                    | `#6e5412`                     | Elite button pressed/hover state                            |
| `--color-accent-deep`      | accent darkened ~50%                    | `#5a3a0a`                     | Active critBtn background in dice roller                    |
| `--color-accent-on-dark`   | accent at 12% opacity                   | `rgba(200,146,42,0.12)`       | Weapon trait tag background in dice roller                  |
| `--color-accent-tooltip`   | accent lightened, bright yellow         | `rgba(255,220,100,0.9)`       | Keyword tooltip bright highlight background                 |
| `--color-accent-tooltip-2` | accent at 45-65% opacity                | `rgba(180,140,40,0.45-0.65)`  | Keyword tooltip hover background                            |
| `--color-accent-tooltip-3` | accent at 7-25% opacity                 | `rgba(180,140,20,0.07-0.25)`  | Keyword tooltip tint / section divider                      |
| `--color-accent-tint`      | accent at 6% opacity                    | `rgba(154,114,40,0.06)`       | Flavor box background in statblock                          |
| `--color-accent-brown`     | accent darkened + desaturated           | `#7a5c2e` (`--brown`)         | Selected encounter row border                               |
| `--color-accent-on-deep`   | very dark near-black warm               | `#2a1a00`                     | Text on active critBtn (dark on gold)                       |

### From `--color-text`

| Derived Token         | Derivation                              | Current hardcoded value | Used in                                              |
|-----------------------|-----------------------------------------|-------------------------|------------------------------------------------------|
| `--color-text-mid`    | text lightened ~40%                     | `#5a3a20`               | Secondary text, metadata, card subtitles             |
| `--color-text-muted`  | text lightened ~60%                     | `#8a6a4a`               | Placeholders, empty states, helper text              |
| `--color-roll-hover`  | text at 15% opacity warm brown          | `rgba(139,69,19,0.15)`  | Rollable modifier hover background in statblock      |
| `--color-roll-hover-2`| text at 10% opacity warm brown          | `rgba(139,69,19,0.10)`  | Scale dropdown item hover background                 |
| `--color-roll-hover-3`| text at 4% opacity warm brown           | `rgba(139,69,19,0.04)`  | Roll history entry hover background                  |

### From `--color-healing`

| Derived Token              | Derivation                              | Current hardcoded value | Used in                                              |
|----------------------------|-----------------------------------------|-------------------------|------------------------------------------------------|
| `--color-healing-tint`     | healing at 15% opacity                  | `rgba(58,122,58,0.15)`  | HP heal button background on character cards         |
| `--color-healing-dark`     | healing darkened ~60%                   | `#0e2a0e`               | HP fully-healed combat card background               |
| `--color-healing-bright`   | healing brightened ~30%                 | `#66aa66`               | HP fully-healed text on dark background              |
| `--color-healing-common`   | healing slightly desaturated            | `#5a7a3a`               | Common rarity chip (shares green family)             |

### From `--color-damage`

| Derived Token              | Derivation                              | Current hardcoded value | Used in                                              |
|----------------------------|-----------------------------------------|-------------------------|------------------------------------------------------|
| `--color-damage-tint`      | damage at 15% opacity                   | `rgba(138,42,24,0.15)`  | HP damage button background on character cards       |
| `--color-damage-bright`    | damage brightened ~30%                  | `#cc6666`               | HP damage text on dark background in combat tracker  |
| `--color-fumble`           | same as damage                          | `#8a2a18`               | Fumble result text in dice roller / roll history     |

> **Decision:** `--color-fumble` unified with `--color-damage`. The previous value (`#c03030`) was a brighter red that didn't add meaningful distinction. Both now use `#8a2a18`.

### From `--color-condition`

| Derived Token              | Derivation                              | Current hardcoded value      | Used in                                              |
|----------------------------|-----------------------------------------|------------------------------|------------------------------------------------------|
| `--color-condition-tint`   | condition at 8% opacity                 | `rgba(90,58,138,0.08)`       | Condition picker button hover background             |

### From `--color-modified`

| Derived Token              | Derivation                              | Current hardcoded value      | Used in                                              |
|----------------------------|-----------------------------------------|------------------------------|------------------------------------------------------|
| `--color-modified-tint`    | modified at 15% opacity                 | `rgba(42,122,106,0.15)`      | Active scale dropdown item background                |
| `--color-modified-dark`    | modified darkened ~40%                  | `#2e1a19` (trait bar bg)     | (Trait bar bg — PF2e locked, but follows same logic) |
| `--color-modified-bright`  | modified brightened to near-mint        | `rgba(180,255,230,0.9-0.95)` | Regen/scaled badge text on dark statblock background |
| `--color-modified-mid`     | modified at 50-70% opacity              | `rgba(42,122,106,0.5-0.7)`   | Regen badge background (dark statblock context)      |

---

## Colors That Don't Fit the Scheme

These are the few values that fall outside the base+variation model:

| Value       | Location                                    | Notes                                                                                                                    |
|-------------|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `#e6ecf4`   | `CustomCreatureWizard` — `.typeToggleRanged` background. Was the ranged attack toggle color, intended as a cool-blue contrast to the warm melee toggle. **Replaced with `#f0e6cc`** (same as melee) since the icon already distinguishes the two states — no color difference needed. No longer in use. |
| `#6a5a3a`   | `traitBg()` fallback (now replaced by `#522e2c`) | Was the old generic trait color. No longer in use after trait color update. |
| `#2a2118`   | `AbilityEditor`, `DamageTypePicker` — `var(--bg-mid, #2a2118)`. **Fixed:** `--bg-mid` is now defined in `variables.css` as a darkened variation of `--color-bg`. It sits naturally between `--color-bg` and near-black while maintaining the warm-brown palette character. Derived token: `--color-bg-popup`. |
| `rgba(122,92,46,0.06-0.07)` | Statblock flavor box, encounter combat card hover, results list row hover. **Fixed:** All three unified to `rgba(122, 92, 46, 0.06)` — maps to a single `--color-accent-tint` derived token. |
| `#c03030`   | Fumble result text in dice roller and roll history. **Fixed:** Unified with `--color-damage` (`#8a2a18`) — no meaningful distinction warranted a separate color. |
| `#fff`      | Statblock header text on crimson background. **Fixed:** Unified with `#f0e6cc` (`--color-primary-text`) to match all other text on primary-colored surfaces. |

---

## PF2e-Locked Colors (not user-configurable)

These are canonical PF2e colors and will not be part of the theme system.

| Value       | Token                   | Meaning                    |
|-------------|-------------------------|----------------------------|
| `#522e2c`   | (trait default)         | Standard trait badge       |
| `#2e1a19`   | (trait bar bg)          | Trait row background       |
| `#1e100f`   | (trait bar border)      | Trait row border           |
| `#3a6b5a`   | (size trait) *(to add)* | Size trait badge           |
| `#8a6a18`   | `--rarity-uncommon`     | Uncommon rarity badge      |
| `#2a4a8a`   | `--rarity-rare`         | Rare rarity badge          |
| `#6a2a8a`   | `--rarity-unique`       | Unique rarity badge        |
| `#5a7a3a`   | `--rarity-common`       | Common rarity badge        |

---

## Implementation Order

1. **Fix the `--bg-mid` bug** — define it in `variables.css` or replace with a
   proper derived token before any other work.
2. **Investigate `#e6ecf4`** — find where it's used and classify it.
3. **Define all derived tokens** in `variables.css` using `color-mix()`.
4. **Replace every hardcoded value** in every `.module.css` with its derived token.
5. **Build the JS derivation layer** — a function that takes 9 base values and
   writes the full derived token set to `:root` at runtime (overriding the CSS
   defaults). This is what the theme picker will call.
6. **Build the theme picker UI** — color inputs for the 9 base tokens, preset
   theme cards, save/load to IndexedDB.
