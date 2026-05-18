/**
 * useUIPrefs
 *
 * Persists lightweight UI preferences to localStorage so the user's workspace
 * is restored on page refresh.  Covers:
 *   - activeSection  (which top-level tab is selected)
 *   - filters        (search panel state)
 *   - filtersOpen / resultsOpen  (sidebar collapse state)
 *   - column widths  (filtersWidth, resultsWidth, encounterWidth)
 *
 * The selected creature (statblock drawer) is intentionally NOT restored
 * because the creature may have changed or been deleted between sessions,
 * and silently re-fetching it on mount would add async complexity for
 * marginal value.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Section } from '../types/encounter';
import type { SearchFilters } from '../search/search';
import { DEFAULT_FILTERS } from '../search/search';

// ── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'seneschal_ui_prefs';

// ── Stored shape ─────────────────────────────────────────────────────────────

export interface UIPrefs {
  activeSection: Section;
  filters: SearchFilters;
  filtersOpen: boolean;
  resultsOpen: boolean;
  filtersWidth: number;
  resultsWidth: number;
  encounterWidth: number;
  /** ID of the last creature whose statblock was open, or null for none. */
  selectedCreatureId: string | null;
}

const DEFAULTS: UIPrefs = {
  activeSection: 'gm',
  filters: DEFAULT_FILTERS,
  filtersOpen: true,
  resultsOpen: true,
  filtersWidth: 220,
  resultsWidth: 260,
  encounterWidth: 280,
  selectedCreatureId: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadPrefs(): UIPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UIPrefs>;
    // Merge with defaults so new keys added in the future don't crash
    return {
      ...DEFAULTS,
      ...parsed,
      // Deep-merge filters so any new filter keys land at their default values
      filters: { ...DEFAULT_FILTERS, ...(parsed.filters ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(prefs: UIPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage may be unavailable (private-browsing quota, etc.) — ignore
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseUIPrefsReturn {
  /** Call once on mount to get the persisted values. */
  loadedPrefs: UIPrefs;
  /** Persist an arbitrary partial update.  Merges with the previous value. */
  persistPrefs: (update: Partial<UIPrefs>) => void;
}

export function useUIPrefs(): UseUIPrefsReturn {
  // Load once — stable across re-renders
  const loadedPrefsRef = useRef<UIPrefs>(loadPrefs());

  // Keep a mutable copy of the *current* prefs so the persist callback never
  // closes over stale state and doesn't need to be recreated.
  const currentPrefsRef = useRef<UIPrefs>(loadedPrefsRef.current);

  // Sync currentPrefsRef on first render (noop since they start equal, but
  // included for clarity).
  useEffect(() => {
    currentPrefsRef.current = loadedPrefsRef.current;
  }, []);

  const persistPrefs = useCallback((update: Partial<UIPrefs>) => {
    const next: UIPrefs = {
      ...currentPrefsRef.current,
      ...update,
      // Deep-merge filters if provided
      filters: update.filters
        ? { ...currentPrefsRef.current.filters, ...update.filters }
        : currentPrefsRef.current.filters,
    };
    currentPrefsRef.current = next;
    savePrefs(next);
  }, []);

  return {
    loadedPrefs: loadedPrefsRef.current,
    persistPrefs,
  };
}
