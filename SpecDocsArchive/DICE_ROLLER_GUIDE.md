# Dice Roller — Deep Dive Guide

> Source: `src/components/DiceRoller/DiceRoller.tsx`  
> Styles: `src/components/DiceRoller/DiceRoller.module.css`  
> Types: `src/types/diceHistory.ts`

---

## Table of Contents

1. [Parsing](#1-parsing)
2. [UI Components](#2-ui-components)
   - [DiceRoller](#21-diceroller)
   - [DamageRoller](#22-damageroller)
   - [MultiDamageRoller](#23-multidamageroller)
3. [Shared UX Behaviors](#3-shared-ux-behaviors)
4. [CSS / Styles](#4-css--styles)

---

## 1. Parsing

### `ParsedDice` interface

```ts
export interface ParsedDice {
  count: number;    // number of dice, e.g. 2 in "2d6"
  sides: number;    // die size, e.g. 6 in "2d6"
  modifier: number; // flat bonus/penalty, e.g. 3 in "2d6+3"
  raw: string;      // canonical normalized form, e.g. "2d6+3"
}
```

This is the structured output of parsing. Every roller component runs `parseDice()` on its input string and works from this object from that point forward. The `raw` field is rebuilt in canonical form (e.g. collapsing `2d6+1+3` into `2d6+4`) so the UI always shows clean expressions.

---

### `parseDice(expr: string): ParsedDice | null`

```ts
export function parseDice(expr: string): ParsedDice | null {
```

Returns `null` if the expression can't be understood at all — callers check for this and bail out early (e.g. `if (!parsed) return null`).

```ts
  const spaceNorm = expr.trim().replace(/\s*([+-])\s*/g, '$1');
```

**Step 1 — Normalize spaces.** Trims leading/trailing whitespace, then collapses any spaces around `+` or `-` signs. So `"2d6 + 3"` becomes `"2d6+3"` and `"1d8 - 2"` becomes `"1d8-2"`. The regex `\s*([+-])\s*` matches a `+` or `-` with optional whitespace on either side, and `'$1'` puts the sign back without the spaces.

```ts
  const mathOnly = spaceNorm.replace(/^(\d+d\d+(?:[+-]\d+)*).*$/i, '$1');
```

**Step 2 — Strip trailing non-math text.** Strips anything after the dice expression — things like `"slashing"`, `"fire"`, or `"piercing"` that sometimes appear in damage strings. The regex anchors at the start (`^`) and matches:
- `\d+d\d+` — the required dice part (e.g. `2d6`)
- `(?:[+-]\d+)*` — zero or more modifier terms (e.g. `+3`, `-1`)
- `.*$` — everything else, which gets thrown away

The capture group `$1` keeps only the math.

```ts
  const modOnly = mathOnly.match(/^([+-]\d+)$/);
  if (modOnly) {
    const mod = parseInt(modOnly[1]);
    return { count: 1, sides: 20, modifier: mod, raw: mathOnly };
  }
```

**Step 3 — Pure modifier shorthand.** If the entire expression is just a signed number like `"+7"` or `"-3"` (no dice at all), treat it as `1d20+mod`. This handles cases where a modifier-only string (e.g. a flat skill bonus) is clicked and needs to be rolled as a d20 check.

```ts
  const diceMatch = mathOnly.match(/^(\d+)d(\d+)((?:[+-]\d+)*)$/i);
```

**Step 4 — Full dice regex.** Tries to match the full `XdY+Z` pattern. Three capture groups:
- `(\d+)` — die count
- `(\d+)` — die sides
- `((?:[+-]\d+)*)` — all modifier terms concatenated (e.g. `"+1-3+2"`)

```ts
  if (diceMatch) {
    const count = parseInt(diceMatch[1]);
    const sides = parseInt(diceMatch[2]);
    const modTerms = diceMatch[3].match(/[+-]\d+/g) ?? [];
    const modifier = modTerms.reduce((sum, t) => sum + parseInt(t), 0);
```

Each modifier term is extracted individually with `/[+-]\d+/g` (which correctly includes the sign), then all terms are summed with `reduce`. The `?? []` handles the case where there are no modifier terms at all (`.match()` returns `null` on no matches).

```ts
    const raw = `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''}`;
    return { count, sides, modifier, raw };
  }
```

Rebuilds `raw` as a clean canonical string. If modifier is positive, prepend `+`; if negative, the number already carries its `-` sign; if zero, append nothing.

```ts
  return null;
}
```

Falls through to `null` if nothing matched — the caller is expected to handle this gracefully.

---

## 2. UI Components

### 2.1 `DiceRoller`

This is the primary component — used when you click an attack roll. It shows an attack roll panel and optionally an inline damage sub-panel beneath it.

#### Props

```ts
interface DiceRollerProps {
  expression: string;      // The attack roll expression, e.g. "1d20+8"
  label?: string;          // Display name, e.g. "Jaws Attack"
  anchorX: number;         // X pixel position to spawn the panel at
  anchorY: number;         // Y pixel position to spawn the panel at
  onClose: () => void;     // Called when the panel should be dismissed
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void; // Roll history callback
  damageExpr?: string;     // Optional damage expression, e.g. "2d6+4"
  damageLabel?: string;    // Optional damage label, e.g. "Piercing"
  damageTraits?: string[]; // Weapon traits for crit calc, e.g. ["fatal-d12"]
}
```

#### State

```ts
const [atkResult, setAtkResult] = useState<RollResult | null>(null);
const [dmgResult, setDmgResult] = useState<RollResult | null>(null);
const [critResult, setCritResult] = useState<CritResult | null>(null);
```

Three separate result states. `critResult` and `dmgResult` are mutually exclusive — only one is shown at a time in the damage panel. When a crit fires, `dmgResult` is cleared and vice versa.

```ts
const [clampedY, setClampedY] = useState(anchorY);
const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
```

`clampedY` holds the auto-adjusted Y position if the panel would overflow the viewport. `pos` holds the user-dragged position; when `pos` is non-null it overrides `clampedY` entirely (the user has manually moved the panel).

```ts
const [atkAnimKey, setAtkAnimKey] = useState(0);
const [dmgAnimKey, setDmgAnimKey] = useState(0);
```

These are "animation bump" keys. React re-uses DOM elements, so a CSS animation won't re-trigger just because the number changes. By passing `key={atkAnimKey}` to the total `<div>` and incrementing the key on each roll, React unmounts and remounts the element — restarting the animation from scratch.

```ts
const ref = useRef<HTMLDivElement>(null);
```

A ref to the root panel `<div>`. Used by the click-outside and drag logic to check if events are inside or outside the panel.

```ts
const dragRef = useRef<{ startMouseX: number; startMouseY: number; startPanelX: number; startPanelY: number } | null>(null);
```

A ref (not state) for drag tracking. It stores the mouse position and panel position at the moment the drag started. Because this doesn't need to trigger a re-render on its own, `useRef` is the right tool — updating it is instant and doesn't cause unnecessary renders.

```ts
const onRollRef = useRef(onRoll);
onRollRef.current = onRoll;
```

A "stable ref" pattern for the `onRoll` callback. This lets `useCallback` hooks that use `onRoll` avoid listing it as a dependency (which would cause them to re-create on every render if the parent passes an inline arrow function). Instead they read `onRollRef.current` at call time, which is always up-to-date.

---

#### `recordRoll`

```ts
const recordRoll = useCallback((expr: string, lbl: string | undefined, r: RollResult) => {
  onRollRef.current?.({
    expression: expr,
    label: lbl,
    rolls: r.rolls,
    modifier: r.modifier,
    total: r.total,
    timestamp: Date.now(),
  });
}, []);
```

A small helper that fires the `onRoll` history callback. The `?.` optional chaining means it silently does nothing if `onRoll` wasn't provided. The empty dependency array `[]` is safe here because `onRoll` is accessed via `onRollRef.current` rather than captured directly.

---

#### `performAtkRoll`

```ts
const performAtkRoll = useCallback(() => {
  if (!parsed) return;
  const r = rollDice(parsed);
  setAtkResult(r);
  setAtkAnimKey(k => k + 1);
  recordRoll(parsed.raw, label, r);
```

Rolls the attack, stores the result in state, bumps the animation key, and records to history.

```ts
  if (damageParsed) {
    const isNat20 = parsed.sides === 20 && r.rolls.length === 1 && r.rolls[0] === 20;
```

Only triggers auto-damage if `damageExpr` was provided. The nat-20 check requires: the die is a d20, exactly one die was rolled (not a pool), and the result was 20.

```ts
    if (isNat20) {
      const cr = rollCrit(damageParsed, damageTraits);
      setCritResult(cr);
      setDmgResult(null);
      setDmgAnimKey(k => k + 1);
      onRollRef.current?.({ expression: `CRIT ${damageParsed.raw}`, ... });
    } else {
      const dr = rollDice(damageParsed);
      setDmgResult(dr);
      setCritResult(null);
      setDmgAnimKey(k => k + 1);
      recordRoll(damageParsed.raw, damageLabel, dr);
    }
  }
}, [parsed, damageParsed, label, damageLabel, damageTraits, recordRoll]);
```

On nat 20: calls `rollCrit()`, sets `critResult`, and clears `dmgResult`. Otherwise normal damage roll. In both branches, `dmgAnimKey` is bumped to restart the damage total's animation.

---

#### `performDmgRoll` and `performCrit`

```ts
const performDmgRoll = useCallback(() => {
  if (!damageParsed) return;
  const dr = rollDice(damageParsed);
  setDmgResult(dr);
  setCritResult(null);       // cancel any active crit
  setDmgAnimKey(k => k + 1);
  recordRoll(damageParsed.raw, damageLabel, dr);
}, [damageParsed, damageLabel, recordRoll]);
```

Standalone damage reroll (the "↺ Reroll dmg" button). Always clears `critResult` when called — you're choosing to see a normal roll.

```ts
const performCrit = useCallback(() => {
  if (!damageParsed) return;
  const cr = rollCrit(damageParsed, damageTraits);
  setCritResult(cr);
  setDmgAnimKey(k => k + 1);
  onRollRef.current?.({ expression: `CRIT ${damageParsed.raw}`, ... });
}, [damageParsed, damageTraits, damageLabel]);
```

Manual crit button. Note it does NOT call `setDmgResult(null)` — `critResult` being non-null is enough for the render logic to show the crit view instead. If you call `performDmgRoll` afterward, it sets `critResult` to null and the normal view takes over.

---

#### Render — Attack section

```ts
const isD20 = parsed.sides === 20 && atkResult.rolls.length === 1;
const isNat20 = isD20 && atkResult.rolls[0] === 20;
const isNat1  = isD20 && atkResult.rolls[0] === 1;
const atkTotalClass = isNat20 ? styles.totalCrit : isNat1 ? styles.totalFumble : styles.totalNormal;
```

Determines which CSS class to apply to the total number. `totalCrit` = gold, `totalFumble` = red, `totalNormal` = default text color. Only applies special styling to single d20 rolls.

```ts
const panelLeft = pos ? pos.x : anchorX;
const panelTop  = pos ? pos.y : clampedY;
```

If the user has dragged the panel (`pos` is set), use those coordinates directly. Otherwise fall back to the anchor coordinates (with viewport clamping applied).

```tsx
<div
  ref={ref}
  className={styles.roller}
  style={{ left: panelLeft, top: panelTop, transform: pos ? 'none' : 'translateX(-50%)' }}
  onPointerMove={onDragPointerMove}
  onPointerUp={onDragPointerUp}
>
```

The panel is `position: fixed` in CSS. `translateX(-50%)` centers the panel horizontally on the anchor point when it first appears. Once the user drags it, `transform` switches to `'none'` because `pos.x` already stores the absolute left edge (from `getBoundingClientRect().left`), so centering would shift it by half the width incorrectly.

```tsx
<div key={atkAnimKey} className={`${styles.total} ${atkTotalClass} ${styles.totalAnimated}`}>
  {atkResult.total}
</div>
```

The `key={atkAnimKey}` is the animation reset trick described above. Changing `key` causes React to destroy and recreate the DOM node, restarting the CSS `@keyframes resultPop` animation.

---

#### Render — Damage section

```tsx
{damageParsed && (() => {
  ...
  return (
    <div className={styles.damageSection}>
```

The damage section is wrapped in an IIFE (immediately invoked function expression) inside JSX. This is a pattern to allow local `const` declarations (for `fatalT`, `deadlyT`, helper functions) inside JSX without needing a separate component. It's a bit unusual but avoids extracting a whole component just for scoped variables.

```tsx
{critResult ? (
  // show crit breakdown
) : dmgResult ? (
  // show normal damage
) : null}
```

Conditional rendering chain: crit takes priority over normal damage. If neither result exists yet (shouldn't normally happen since rolls fire on mount), nothing renders.

---

### 2.2 `DamageRoller`

A standalone damage-only panel. Structurally almost identical to the damage sub-section of `DiceRoller`, but as its own top-level component. Key differences:

- No attack roll at all — opens directly to a damage result
- `performDmgRoll` fires on mount (via `useEffect(() => { performDmgRoll(); }, [])`)
- `R` key reruns `performDmgRoll` instead of an attack roll
- Accepts `traits` prop directly (no separate `damageTraits`)
- Renders Fatal/Deadly trait tags in the header itself (not in a sub-section)

The crit/normal state logic and the breakdown display are identical to `DiceRoller`'s damage section.

---

### 2.3 `MultiDamageRoller`

Used when an ability has multiple damage types (e.g. `2d6 piercing + 1d4 fire`). Rolls all of them at once.

#### Key differences from `DiceRoller`

```ts
interface GroupResult {
  parsed: ParsedDice;
  normal: RollResult | null;
  crit: CritResult | null;
  animKey: number;
}
```

Instead of separate state variables per result, there's one `results` array where each entry holds its own `normal`, `crit`, and `animKey`. This scales to any number of damage groups.

```ts
const [isCrit, setIsCrit] = useState(false);
```

A single boolean controls whether ALL groups are in crit mode — there's no per-group toggle.

```ts
const rollAll = useCallback((asCrit: boolean) => {
  setIsCrit(asCrit);
  setResults(prev => prev.map((gr, i) => {
    const g = parsedGroups[i];
    if (asCrit) {
      const cr = rollCrit(gr.parsed, []);   // no traits — MultiDamageRoller doesn't support per-group traits
      ...
      return { ...gr, crit: cr, normal: null, animKey: gr.animKey + 1 };
    } else {
      const r = rollDice(gr.parsed);
      ...
      return { ...gr, normal: r, crit: null, animKey: gr.animKey + 1 };
    }
  }));
}, [parsedGroups]);
```

`rollAll` uses the functional form of `setResults` (`prev => ...`) so it always operates on the latest state rather than a stale closure capture. Each group's `animKey` is incremented individually so each total animates independently.

```tsx
<button
  className={`${styles.critBtn} ${isCrit ? styles.critBtnActive : ''}`}
  onClick={() => rollAll(!isCrit)}
>
  ✦ Crit
</button>
```

The Crit button **toggles** — clicking it when already in crit mode calls `rollAll(false)` to go back to normal rolls. `DiceRoller` and `DamageRoller` don't toggle (once you crit, the reroll button brings you back to normal).

---

## 3. Shared UX Behaviors

These behaviors are implemented nearly identically across all three components.

### Roll on Mount

```ts
useEffect(() => {
  performAtkRoll(); // or performDmgRoll() / rollAll(false)
}, []);
```

An empty dependency array means this fires exactly once, right after the component mounts. The `eslint-disable-next-line` comment suppresses the exhaustive-deps warning — intentionally not including `performAtkRoll` because we only want this to run once on open, not every time the function reference changes.

---

### Keyboard Shortcuts

```ts
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'r' || e.key === 'R') performAtkRoll();
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [performAtkRoll, onClose]);
```

Attaches a `keydown` listener to the `window` (not the panel element) so it works regardless of focus. The cleanup function `return () => window.removeEventListener(...)` removes the listener when the component unmounts — this is the standard React pattern for avoiding memory leaks and stale event handlers. `performAtkRoll` and `onClose` are in the dependency array because they're used inside the effect.

---

### Click Outside to Close

```ts
useEffect(() => {
  function onPointerDown(e: PointerEvent) {
    if (ref.current && !ref.current.contains(e.target as Node)) onClose();
  }
  window.addEventListener('pointerdown', onPointerDown);
  return () => window.removeEventListener('pointerdown', onPointerDown);
}, [onClose]);
```

Uses `pointerdown` (not `click`) so it fires before the click event, which avoids ordering issues. `ref.current.contains(e.target)` returns `true` if the click was inside the panel — so `!contains(...)` means "clicked outside". When that's the case, `onClose()` is called to dismiss the panel.

---

### Dragging

Drag is implemented with three pointer event handlers and a `dragRef`.

#### `onDragHandlePointerDown` — start drag

```ts
const onDragHandlePointerDown = useCallback((e: React.PointerEvent) => {
  if (!ref.current) return;
  e.preventDefault();
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
```

`e.preventDefault()` stops text selection during drag. `setPointerCapture` tells the browser to route all subsequent pointer events for this pointer ID to this element, even if the mouse moves outside it — essential for smooth dragging.

```ts
  const rect = ref.current.getBoundingClientRect();
  const currentX = rect.left;
  const currentY = rect.top;
  dragRef.current = {
    startMouseX: e.clientX,
    startMouseY: e.clientY,
    startPanelX: currentX,
    startPanelY: currentY,
  };
}, []);
```

`getBoundingClientRect().left` reads the panel's *actual* rendered left edge in viewport pixels. This is important: the panel initially uses `translateX(-50%)` to center itself, so its CSS `left` value is the anchor X, but its visual left edge is `anchorX - width/2`. By reading `rect.left`, we capture the true visual position, so the transition from centered→dragged doesn't cause a jump.

#### `onDragPointerMove` — update position

```ts
const onDragPointerMove = useCallback((e: React.PointerEvent) => {
  if (!dragRef.current) return;
  const dx = e.clientX - dragRef.current.startMouseX;
  const dy = e.clientY - dragRef.current.startMouseY;
  setPos({
    x: dragRef.current.startPanelX + dx,
    y: dragRef.current.startPanelY + dy,
  });
}, []);
```

Calculates how far the mouse has moved from the drag start point, then adds that delta to the panel's starting position. Setting `pos` in state triggers a re-render which moves the panel. The `if (!dragRef.current) return` guard means this no-ops unless a drag is actually in progress (the handler is on the panel root, not just the handle).

#### `onDragPointerUp` — end drag

```ts
const onDragPointerUp = useCallback(() => {
  dragRef.current = null;
}, []);
```

Clears the drag ref. The panel stays at its new `pos` position — no snapping back.

---

### Viewport Clamping

```ts
useEffect(() => {
  if (pos) return;           // user is dragging — skip
  if (!ref.current) return;
  const rect = ref.current.getBoundingClientRect();
  const overflow = rect.bottom - window.innerHeight + 8; // 8px margin
  if (overflow > 0) setClampedY(y => y - overflow);
});
```

No dependency array — this runs **after every render**. It checks if the panel's bottom edge is below the viewport and nudges `clampedY` up by exactly the overflow amount. This handles the case where a tall panel (with a damage section) would otherwise be clipped at the bottom of the screen. The `if (pos) return` skips this when the user has manually dragged the panel.

---

## 4. CSS / Styles

All styles are in `DiceRoller.module.css` and use CSS Modules (class names are scoped to the component, e.g. `styles.roller`).

### Panel layout

```css
.roller {
  position: fixed;      /* stays in place during page scroll */
  z-index: 500;         /* floats above most other UI */
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transform: translateX(-50%); /* initial horizontal centering on anchor */
}
```

`position: fixed` combined with `left` and `top` set via inline styles lets JS control the position precisely. The default `translateX(-50%)` is overridden to `none` once the user drags the panel (see component render logic).

### Drag handle

```css
.rollerDragHandle {
  cursor: grab;
  user-select: none;    /* prevents text highlight while dragging */
}
.rollerDragHandle:active {
  cursor: grabbing;     /* changes cursor while mouse is held down */
}
```

### Roll animations

```css
@keyframes resultPop {
  0%   { transform: scale(1);    }
  40%  { transform: scale(1.18); } /* overshoots slightly */
  70%  { transform: scale(0.97); } /* settles back */
  100% { transform: scale(1);    }
}

.totalAnimated {
  animation: resultPop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
```

The `cubic-bezier(0.34, 1.56, 0.64, 1)` is a spring-like easing curve — the `1.56` Y value above 1.0 means the animation overshoots, which combined with the `scale(1.18)` keyframe creates a satisfying "pop" feel. `both` fill mode means the element starts at the `0%` state and ends at the `100%` state (no flash before/after).

`totalDmgAnimated` uses the same curve but slightly smaller scale (`1.14`) and a `0.08s` delay, so damage results pop in slightly after attack results in a staggered sequence.

### Result color classes

```css
.totalNormal  { color: var(--text); }
.totalCrit    { color: var(--gold, #c8922a); }  /* fallback if CSS var not set */
.totalFumble  { color: #c03030; }
```

### Crit button states

```css
.critBtn {
  background: #5a3a0a;           /* dark brown — "off" state */
  color: var(--gold, #c8922a);
  border: 1px solid var(--gold, #c8922a);
}

.critBtnActive {
  background: var(--gold, #c8922a); /* filled gold — "on" state */
  color: #2a1a00;
}
```

The button inverts — dark background with gold text when inactive, gold background with dark text when active. Applied by conditionally adding `styles.critBtnActive` in JSX: `className={\`${styles.critBtn} ${critResult ? styles.critBtnActive : ''}\`}`.
