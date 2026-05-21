/**
 * themeEngine.ts
 *
 * Derives the full set of CSS custom properties from the 9 base theme tokens
 * and writes them to :root at runtime.  Called once on startup and whenever
 * the user picks a new theme.
 *
 * Derivation is done in the browser using an offscreen canvas so we get real
 * sRGB arithmetic without any external dependency.  color-mix() in CSS would
 * be cleaner but its JS equivalent isn't available in every engine yet, so we
 * do the math ourselves.
 */

export interface ThemeTokens {
  bg:        string; // --color-bg
  surface:   string; // --color-surface
  primary:   string; // --color-primary
  accent:    string; // --color-accent
  text:      string; // --color-text
  healing:   string; // --color-healing
  damage:    string; // --color-damage
  condition: string; // --color-condition
  modified:  string; // --color-modified
  // Trait badge colors (overrideable; default values match PF2e style)
  traitDefault:  string; // --color-trait-default
  traitUncommon: string; // --color-trait-uncommon
  traitRare:     string; // --color-trait-rare
  traitUnique:   string; // --color-trait-unique
}

/** The 4 overrideable advanced tokens that are NOT derived from base tokens. */
export const ADVANCED_TOKEN_DEFAULTS: Pick<ThemeTokens, 'traitDefault' | 'traitUncommon' | 'traitRare' | 'traitUnique'> = {
  traitDefault:  '#522e2c',
  traitUncommon: '#8a6a18',
  traitRare:     '#2a4a8a',
  traitUnique:   '#6a2a8a',
};

export interface Theme {
  id: string;
  name: string;
  tokens: ThemeTokens;
}

// ─── Built-in preset themes ───────────────────────────────────────────────────

export const PRESET_THEMES: Theme[] = [
  {
    id: 'parchment',
    name: 'Default Parchment',
    tokens: {
      bg:        '#f4ead6',
      surface:   '#faf4e8',
      primary:   '#5c1414',
      accent:    '#9a7228',
      text:      '#2a1a0e',
      healing:   '#3a7a3a',
      damage:    '#8a2a18',
      condition: '#5a3a8a',
      modified:  '#2a7a6a',
      ...ADVANCED_TOKEN_DEFAULTS,
    },
  },
  {
    id: 'dark',
    name: 'Dark / Night',
    tokens: {
      bg:        '#1a1a2e',
      surface:   '#16213e',
      primary:   '#2e4a7a',
      accent:    '#e2b96f',
      text:      '#e0e0f0',
      healing:   '#4caf7d',
      damage:    '#cf4444',
      condition: '#8a6fc8',
      modified:  '#3aa8b8',
      ...ADVANCED_TOKEN_DEFAULTS,
    },
  },
  {
    id: 'steel',
    name: 'Blue Steel',
    tokens: {
      bg:        '#dce6f0',
      surface:   '#eaf0f8',
      primary:   '#1a3a6a',
      accent:    '#3a6aaa',
      text:      '#0e1e2e',
      healing:   '#2a7a4a',
      damage:    '#8a2020',
      condition: '#5a2a8a',
      modified:  '#2a6a7a',
      ...ADVANCED_TOKEN_DEFAULTS,
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    tokens: {
      bg:        '#d8e8d0',
      surface:   '#e8f0e0',
      primary:   '#1a4a1a',
      accent:    '#6a8a2a',
      text:      '#0e1e0e',
      healing:   '#2a6a2a',
      damage:    '#8a3a18',
      condition: '#4a3a7a',
      modified:  '#2a6a4a',
      ...ADVANCED_TOKEN_DEFAULTS,
    },
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    tokens: {
      bg:        '#e8daf0',
      surface:   '#f0e8f8',
      primary:   '#4a1a6a',
      accent:    '#8a4ab8',
      text:      '#1e0e2a',
      healing:   '#2a7a4a',
      damage:    '#8a2030',
      condition: '#6a2a8a',
      modified:  '#2a5a8a',
      ...ADVANCED_TOKEN_DEFAULTS,
    },
  },
];

// ─── Color math helpers ───────────────────────────────────────────────────────

interface RGBA { r: number; g: number; b: number; a: number }

/** Parse any CSS color string into RGBA (0–255 each, a 0–1). */
function parseColor(css: string): RGBA {
  // Use a hidden canvas element to let the browser do the parsing
  if (!_canvas) {
    _canvas = document.createElement('canvas');
    _canvas.width = _canvas.height = 1;
    _ctx = _canvas.getContext('2d')!;
  }
  _ctx!.clearRect(0, 0, 1, 1);
  _ctx!.fillStyle = css;
  _ctx!.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = _ctx!.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

function toHex({ r, g, b }: RGBA): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function toRgba({ r, g, b }: RGBA, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(3)})`;
}

/**
 * Mix `a` toward `b` by `t` (0 = all a, 1 = all b).
 * Equivalent to color-mix(in srgb, a (1-t)*100%, b t*100%)
 */
function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  };
}

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 1 };

function lighten(c: RGBA, t: number): RGBA { return mix(c, WHITE, t); }
function darken(c: RGBA, t: number): RGBA  { return mix(c, BLACK, t); }

// ─── Derivation ───────────────────────────────────────────────────────────────

/**
 * Derive all computed tokens from the 9 base tokens and return them as a
 * flat Record<string, string> ready to be written to :root.
 */
export function deriveTokens(t: ThemeTokens): Record<string, string> {
  const bg        = parseColor(t.bg);
  const surface   = parseColor(t.surface);
  const primary   = parseColor(t.primary);
  const accent    = parseColor(t.accent);
  const text      = parseColor(t.text);
  const healing   = parseColor(t.healing);
  const damage    = parseColor(t.damage);
  const condition = parseColor(t.condition);
  const modified  = parseColor(t.modified);

  // Determine if primary is "dark" (luminance < 0.4) — affects which direction
  // primary-text derives.
  const primaryLum = (primary.r * 0.299 + primary.g * 0.587 + primary.b * 0.114) / 255;
  const primaryText = primaryLum < 0.5 ? lighten(primary, 0.88) : darken(primary, 0.88);

  // Determine if bg is dark (for dark themes)
  const bgLum = (bg.r * 0.299 + bg.g * 0.587 + bg.b * 0.114) / 255;
  const isDark = bgLum < 0.35;

  // bg-popup: for dark themes stay dark, for light themes go very dark
  const bgPopup = isDark
    ? mix(bg, BLACK, 0.35)
    : mix(bg, BLACK, 0.82);

  // surface-dark: a very dark variant used as menu/dialog bg
  const surfaceDark = isDark
    ? mix(surface, BLACK, 0.35)
    : mix(surface, primary, 0.8);

  // border derived from surface
  const border      = isDark ? mix(surface, WHITE, 0.14) : mix(surface, BLACK, 0.14);
  const borderLight = isDark ? mix(surface, WHITE, 0.07) : mix(surface, BLACK, 0.07);

  // bg-banner: bg lightened slightly (or darkened slightly for dark)
  const bgBanner = isDark ? mix(bg, WHITE, 0.06) : mix(bg, WHITE, 0.4);

  // accent-brown: accent darkened + desaturated slightly
  const accentBrown = darken(accent, 0.2);

  // text-mid and text-muted
  const textMidFinal   = isDark ? mix(text, WHITE, 0.3)  : mix(text, WHITE, 0.4);
  const textMutedFinal = isDark ? mix(text, WHITE, 0.55) : mix(text, WHITE, 0.6);

  return {
    // Base tokens (echo back so :root is fully self-contained)
    '--color-bg':        t.bg,
    '--color-surface':   t.surface,
    '--color-primary':   t.primary,
    '--color-accent':    t.accent,
    '--color-text':      t.text,
    '--color-healing':   t.healing,
    '--color-damage':    t.damage,
    '--color-condition': t.condition,
    '--color-modified':  t.modified,

    // ── from bg ────────────────────────────────────────────────────────────
    '--color-bg-banner':        toHex(bgBanner),
    '--color-bg-error':         toHex(isDark ? mix(bg, damage, 0.5) : darken(primary, 0.45)),
    '--color-bg-overlay-light': toRgba(BLACK, 0.04),
    '--color-bg-overlay-mid':   toRgba(BLACK, 0.07),
    '--color-bg-modal-scrim':   toRgba(BLACK, isDark ? 0.75 : 0.65),
    '--color-bg-popup':         toHex(bgPopup),

    // ── from surface ───────────────────────────────────────────────────────
    '--color-surface-dark':   toHex(surfaceDark),
    '--color-border':         toHex(border),
    '--color-border-light':   toHex(borderLight),
    '--color-border-banner':  toHex(lighten(accent, 0.3)),

    // ── from primary ───────────────────────────────────────────────────────
    '--color-primary-text':         toHex(primaryText),
    '--color-primary-text-muted':   toRgba(primaryText, 0.6),
    '--color-primary-text-dim':     toRgba(primaryText, 0.72),
    '--color-primary-text-faint':   toRgba(primaryText, 0.55),
    '--color-primary-glow':         toRgba(primary, 0.12),
    '--color-primary-tint':         toRgba(primary, 0.06),
    '--color-primary-hover':        toHex(lighten(primary, 0.15)),
    '--color-primary-dark':         toHex(darken(primary, 0.35)),
    '--color-primary-darker':       toHex(darken(primary, 0.55)),
    '--color-trait-bar':            toHex(mix(darken(primary, 0.6), BLACK, 0.35)),
    '--color-trait-bar-border':     toHex(mix(darken(primary, 0.75), BLACK, 0.5)),
    '--color-surface-on-primary':   toRgba(WHITE, 0.09),
    '--color-surface-on-primary-2': toRgba(WHITE, 0.18),
    '--color-surface-on-primary-3': toRgba(WHITE, 0.22),
    '--color-border-on-primary':    toRgba(WHITE, 0.18),
    '--color-border-on-primary-2':  toRgba(WHITE, 0.35),

    // ── from accent ────────────────────────────────────────────────────────
    '--color-accent-bright':    toHex(lighten(accent, 0.18)),
    '--color-accent-dark':      toHex(darken(accent, 0.15)),
    '--color-accent-darker':    toHex(darken(accent, 0.3)),
    '--color-accent-deep':      toHex(darken(accent, 0.5)),
    '--color-accent-on-dark':   toRgba(lighten(accent, 0.1), 0.12),
    '--color-accent-tooltip':   toRgba(lighten(accent, 0.55), 0.9),
    '--color-accent-tooltip-2': toRgba(accent, 0.5),
    '--color-accent-tooltip-3': toRgba(accent, 0.12),
    '--color-accent-tint':      toRgba(accentBrown, 0.06),
    '--color-accent-brown':     toHex(accentBrown),
    '--color-accent-on-deep':   toHex(isDark ? lighten(accentBrown, 0.05) : darken(accentBrown, 0.75)),

    // ── from text ──────────────────────────────────────────────────────────
    '--color-text-mid':     toHex(textMidFinal),
    '--color-text-muted':   toHex(textMutedFinal),
    '--color-roll-hover':   toRgba(isDark ? lighten(text, 0.1) : darken(text, 0.1), 0.15),
    '--color-roll-hover-2': toRgba(isDark ? lighten(text, 0.1) : darken(text, 0.1), 0.10),
    '--color-roll-hover-3': toRgba(isDark ? lighten(text, 0.1) : darken(text, 0.1), 0.04),

    // ── from healing ───────────────────────────────────────────────────────
    '--color-healing-tint':   toRgba(healing, 0.15),
    '--color-healing-dark':   toHex(darken(healing, 0.7)),
    '--color-healing-bright': toHex(lighten(healing, 0.35)),

    // ── from damage ────────────────────────────────────────────────────────
    '--color-damage-tint':   toRgba(damage, 0.15),
    '--color-damage-bright': toHex(lighten(damage, 0.35)),
    '--color-fumble':        t.damage,

    // ── from condition ─────────────────────────────────────────────────────
    '--color-condition-tint': toRgba(condition, 0.08),

    // ── from modified ──────────────────────────────────────────────────────
    '--color-modified-tint':   toRgba(modified, 0.15),
    '--color-modified-bright': toRgba(lighten(modified, 0.65), 0.9),
    '--color-modified-mid':    toRgba(modified, 0.55),

    // ── trait badge colors (user-overrideable) ─────────────────────────────
    '--color-trait-default':  t.traitDefault,
    '--color-trait-uncommon': t.traitUncommon,
    '--color-trait-rare':     t.traitRare,
    '--color-trait-unique':   t.traitUnique,
  };
}

/**
 * Read the current computed value of a CSS custom property from :root.
 * Returns an empty string if the property is not set.
 */
export function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Snapshot the current :root values for every CSS var listed in the provided
 * meta array. Used by ThemePicker to seed the Advanced overrides panel.
 */
export function snapshotCssVars(cssVarNames: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of cssVarNames) {
    const v = readCssVar(name);
    if (v) out[name] = v;
  }
  return out;
}

/**
 * Apply a full set of derived tokens to :root (or any target element).
 */
export function applyTokens(
  derived: Record<string, string>,
  target: HTMLElement = document.documentElement,
): void {
  for (const [key, value] of Object.entries(derived)) {
    target.style.setProperty(key, value);
  }
}

/**
 * One-shot: derive + apply from a ThemeTokens object.
 */
export function applyTheme(tokens: ThemeTokens): void {
  applyTokens(deriveTokens(tokens));
}
