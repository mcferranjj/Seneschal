import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreatureRecord } from './db/schema';
import { searchCreatures, DEFAULT_FILTERS } from './search/search';
import type { SearchFilters } from './search/search';
import { runSync, getLastSynced, getCreatureCount } from './sync/sync';
import type { SyncProgress } from './sync/sync';
import { TopBar } from './components/TopBar/TopBar';
import { SearchPanel } from './components/SearchPanel/SearchPanel';
import { ResultsList } from './components/ResultsList/ResultsList';
import { StatblockDrawer } from './components/StatblockDrawer/StatblockDrawer';
import styles from './App.module.css';

const SEARCH_DEBOUNCE_MS = 200;

export default function App() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<CreatureRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<CreatureRecord | null>(null);
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

  // Run search when filters change (debounced)
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

  // Refresh creature count
  const refreshCount = useCallback(async () => {
    const [count, synced] = await Promise.all([getCreatureCount(), getLastSynced()]);
    setCreatureCount(count);
    setLastSynced(synced);
  }, []);

  // Trigger a sync
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
      // Re-run search after sync completes using current filters (not the stale closure value)
      const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
      setResults(r);
      setTotalCount(tc);
    } catch {
      // Error already surfaced via setSyncProgress
      syncingRef.current = false;
    }
  }, [refreshCount]);

  // On mount: load count and start sync
  useEffect(() => {
    refreshCount();
    triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.app}>
      <div className={styles.leftCol}>
        <TopBar />
        <SearchPanel filters={filters} onChange={setFilters} disabled={isSyncing && creatureCount === 0} />
      </div>
      <div className={styles.center}>
        {isSyncing && <SyncProgressBar progress={syncProgress} />}
        <ResultsList
          results={results}
          totalCount={totalCount}
          selectedId={selected?.id ?? null}
          onSelect={c => setSelected(prev => (prev?.id === c.id ? null : c))}
          loading={searchLoading}
          syncing={isSyncing}
          creatureCount={creatureCount}
          sortBy={filters.sortBy}
          onSortChange={s => setFilters(f => ({ ...f, sortBy: s }))}
        />
      </div>
      <StatblockDrawer
        creature={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function SyncProgressBar({ progress }: { progress: SyncProgress }) {
  const { phase, done, total } = progress;
  const pct =
    phase === 'fetching' && total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : null;

  const label =
    phase === 'checking'
      ? 'Checking GitHub…'
      : phase === 'listing'
        ? `Indexing packs (${done ?? 0}/${total ?? '?'})`
        : phase === 'fetching'
          ? `Fetching creatures ${pct != null ? `— ${pct}%` : ''}`
          : phase === 'saving'
            ? 'Saving to database…'
            : '';

  if (!label) return null;

  return (
    <div className={styles.progressBar}>
      <div className={styles.progressLabel}>{label}</div>
      {pct != null && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
