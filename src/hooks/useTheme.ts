/**
 * useTheme
 *
 * Manages the active theme and the user's personal saved-theme library.
 *
 * Two separate localStorage keys:
 *   seneschal_theme        — the currently active Theme object (~200 bytes)
 *   seneschal_theme_library — array of user-saved custom Theme objects
 *
 * localStorage is appropriate for both: the data is tiny, purely presentational,
 * and there is no cross-tab conflict risk worth addressing at this scale.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Theme,
  type ThemeTokens,
  PRESET_THEMES,
  ADVANCED_TOKEN_DEFAULTS,
  applyTheme,
} from '../utils/themeEngine';

const ACTIVE_KEY  = 'seneschal_theme';
const LIBRARY_KEY = 'seneschal_theme_library';

// ── Validation helpers ────────────────────────────────────────────────────────

const REQUIRED_TOKENS: (keyof ThemeTokens)[] = [
  'bg', 'surface', 'primary', 'accent', 'text',
  'healing', 'damage', 'condition', 'modified',
];

function isValidTheme(parsed: Partial<Theme>): boolean {
  return !!(parsed.id && parsed.name && parsed.tokens &&
    REQUIRED_TOKENS.every(k => parsed.tokens![k]));
}

// ── Active theme persistence ──────────────────────────────────────────────────

function loadActiveTheme(): Theme {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return PRESET_THEMES[0];
    const parsed = JSON.parse(raw) as Partial<Theme>;
    if (!isValidTheme(parsed)) return PRESET_THEMES[0];
    // Migrate saves that predate the trait token fields
    const tokens = { ...ADVANCED_TOKEN_DEFAULTS, ...(parsed.tokens as ThemeTokens) };
    return { id: parsed.id!, name: parsed.name!, tokens };
  } catch {
    return PRESET_THEMES[0];
  }
}

function persistActiveTheme(theme: Theme): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(theme));
  } catch { /* quota or private browsing */ }
}

// ── Theme library persistence ─────────────────────────────────────────────────

function loadThemeLibrary(): Theme[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is Theme => isValidTheme(t as Partial<Theme>));
  } catch {
    return [];
  }
}

function persistThemeLibrary(library: Theme[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch { /* quota or private browsing */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseThemeReturn {
  activeTheme: Theme;
  /** Activate a theme (applies to page + persists as the active theme). */
  setTheme: (theme: Theme) => void;
  /** User-saved custom themes (excludes built-in presets). */
  savedThemes: Theme[];
  /** Save a theme to the personal library under the given name, then activate it. */
  saveThemeAs: (tokens: ThemeTokens, name: string) => Theme;
  /** Remove a saved theme from the library by id. */
  deleteSavedTheme: (id: string) => void;
  presets: readonly Theme[];
}

export function useTheme(): UseThemeReturn {
  const initialTheme = useRef(loadActiveTheme());
  const [activeTheme, setActiveThemeState] = useState<Theme>(initialTheme.current);
  const [savedThemes, setSavedThemes] = useState<Theme[]>(loadThemeLibrary);

  // Apply on first mount
  useEffect(() => {
    applyTheme(initialTheme.current.tokens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    applyTheme(theme.tokens);
    persistActiveTheme(theme);
    setActiveThemeState(theme);
  }, []);

  const saveThemeAs = useCallback((tokens: ThemeTokens, name: string): Theme => {
    const id = `custom_${Date.now()}`;
    const theme: Theme = { id, name: name.trim() || 'Custom', tokens };
    setSavedThemes(prev => {
      const next = [...prev, theme];
      persistThemeLibrary(next);
      return next;
    });
    // Also make it the active theme
    applyTheme(tokens);
    persistActiveTheme(theme);
    setActiveThemeState(theme);
    return theme;
  }, []);

  const deleteSavedTheme = useCallback((id: string) => {
    setSavedThemes(prev => {
      const next = prev.filter(t => t.id !== id);
      persistThemeLibrary(next);
      return next;
    });
  }, []);

  return {
    activeTheme,
    setTheme,
    savedThemes,
    saveThemeAs,
    deleteSavedTheme,
    presets: PRESET_THEMES,
  };
}
