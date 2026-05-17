/**
 * useSearch
 *
 * Manages creature search state: filters, results, sync progress, and all
 * related callbacks (trigger sync, reset DB, delete creature, save wizard).
 * Also handles the debounced search effect and creature/sync count tracking.
 *
 * Extracted from App.tsx as part of the Step 11 cleanup.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CreatureRecord } from '../db/schema';
import { searchCreatures, DEFAULT_FILTERS } from '../search/search';
import type { SearchFilters } from '../search/search';
import { runSync, getLastSynced, getCreatureCount, resetDatabase } from '../sync/sync';
import { initTraitDescriptions } from '../utils/foundryMacros';
import type { SyncProgress } from '../sync/sync';
import { creatureRepository } from '../db/repositories/CreatureRepository';

const SEARCH_DEBOUNCE_MS = 200;

export interface UseSearchReturn {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  results: CreatureRecord[];
  totalCount: number;
  searchLoading: boolean;
  creatureCount: number;
  lastSynced: number | null;
  syncProgress: SyncProgress;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  refreshSearch: () => Promise<void>;
  handleResetDatabase: () => Promise<void>;
  handleDeleteCreature: (id: string, onDeleted: () => void) => Promise<void>;
  handleWizardSave: (creature: CreatureRecord, onSaved: (creature: CreatureRecord) => void) => Promise<void>;
}

export function useSearch(): UseSearchReturn {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<CreatureRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creatureCount, setCreatureCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ phase: 'idle' });

  const syncingRef = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef<SearchFilters>(DEFAULT_FILTERS);
  filtersRef.current = filters;

  const isSyncing =
    syncProgress.phase === 'checking' ||
    syncProgress.phase === 'listing' ||
    syncProgress.phase === 'fetching' ||
    syncProgress.phase === 'saving';

  // Debounced search when filters change
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const { results: r, totalCount: tc } = await searchCreatures(filters);
        setResults(r);
        setTotalCount(tc);
      } catch {
        setResults([]);
        setTotalCount(0);
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [filters]);

  const refreshCount = useCallback(async () => {
    const [count, synced] = await Promise.all([getCreatureCount(), getLastSynced()]);
    setCreatureCount(count);
    setLastSynced(synced);
  }, []);

  const refreshSearch = useCallback(async () => {
    const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
    setResults(r);
    setTotalCount(tc);
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      await runSync(progress => {
        setSyncProgress(progress);
        if (progress.phase === 'done' || progress.phase === 'error') {
          syncingRef.current = false;
        }
      });
      await refreshCount();
      const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
      setResults(r);
      setTotalCount(tc);
    } catch {
      syncingRef.current = false;
    }
  }, [refreshCount]);

  // On mount: load counts and trigger initial sync
  useEffect(() => {
    refreshCount();
    triggerSync().then(() => initTraitDescriptions()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetDatabase = useCallback(async () => {
    await resetDatabase();
    setCreatureCount(0);
    setResults([]);
    setTotalCount(0);
    setLastSynced(null);
    // Reset the guard so triggerSync isn't blocked by the initial mount sync
    syncingRef.current = false;
    triggerSync().then(() => initTraitDescriptions()).catch(() => {});
  }, [triggerSync]);

  const handleDeleteCreature = useCallback(async (id: string, onDeleted: () => void) => {
    await creatureRepository.delete(id);
    onDeleted();
    const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
    setResults(r);
    setTotalCount(tc);
    await refreshCount();
  }, [refreshCount]);

  const handleWizardSave = useCallback(async (creature: CreatureRecord, onSaved: (creature: CreatureRecord) => void) => {
    onSaved(creature);
    const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
    setResults(r);
    setTotalCount(tc);
    await refreshCount();
  }, [refreshCount]);

  return {
    filters,
    setFilters,
    results,
    totalCount,
    searchLoading,
    creatureCount,
    lastSynced,
    syncProgress,
    isSyncing,
    triggerSync,
    refreshSearch,
    handleResetDatabase,
    handleDeleteCreature,
    handleWizardSave,
  };
}
