/**
 * useTheme
 *
 * Loads the active theme from localStorage, applies it to :root on mount,
 * and provides a setter that applies + persists a new theme.
 *
 * The stored value is just the ThemeTokens object (9 hex strings, ~200 bytes)
 * so localStorage is perfectly appropriate — no need for IndexedDB.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Theme,
  type ThemeTokens,
  PRESET_THEMES,
  ADVANCED_TOKEN_DEFAULTS,
  applyTheme,
} from '../utils/themeEngine';

const STORAGE_KEY = 'seneschal_theme';

function loadSavedTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return PRESET_THEMES[0];
    const parsed = JSON.parse(raw) as Partial<Theme>;
    // Validate: must have id, name, and all 9 core token keys
    if (!parsed.id || !parsed.name || !parsed.tokens) return PRESET_THEMES[0];
    const required: (keyof ThemeTokens)[] = [
      'bg', 'surface', 'primary', 'accent', 'text',
      'healing', 'damage', 'condition', 'modified',
    ];
    if (required.some(k => !parsed.tokens![k])) return PRESET_THEMES[0];
    // Migrate older saves that predate the trait token fields
    const tokens: ThemeTokens = { ...ADVANCED_TOKEN_DEFAULTS, ...parsed.tokens };
    return { ...parsed, tokens } as Theme;
  } catch {
    return PRESET_THEMES[0];
  }
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Quota or private browsing — ignore
  }
}

export interface UseThemeReturn {
  activeTheme: Theme;
  setTheme: (theme: Theme) => void;
  presets: readonly Theme[];
}

export function useTheme(): UseThemeReturn {
  // Stable initial load — runs synchronously before first paint via useRef
  const initialTheme = useRef(loadSavedTheme());
  const [activeTheme, setActiveThemeState] = useState<Theme>(initialTheme.current);

  // Apply on first mount (before paint if possible)
  useEffect(() => {
    applyTheme(initialTheme.current.tokens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    applyTheme(theme.tokens);
    saveTheme(theme);
    setActiveThemeState(theme);
  }, []);

  return {
    activeTheme,
    setTheme,
    presets: PRESET_THEMES,
  };
}
