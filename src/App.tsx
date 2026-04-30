import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreatureRecord } from './db/schema';
import { searchCreatures, DEFAULT_FILTERS } from './search/search';
import type { SearchFilters } from './search/search';
import { runSync, getLastSynced, getCreatureCount } from './sync/sync';
import type { SyncProgress } from './sync/sync';
import type { PF2ECreature } from './types/pf2e';
import type { Section, Encounter, EncounterCreature } from './types/encounter';
import { TopBar } from './components/TopBar/TopBar';
import { SearchPanel } from './components/SearchPanel/SearchPanel';
import { ResultsList } from './components/ResultsList/ResultsList';
import { StatblockDrawer } from './components/StatblockDrawer/StatblockDrawer';
import { EncounterManager } from './components/EncounterManager/EncounterManager';
import { RulesSection } from './components/RulesSection/RulesSection';
import { CharactersSection } from './components/CharactersSection/CharactersSection';
import styles from './App.module.css';

const SEARCH_DEBOUNCE_MS = 200;

export default function App() {
  // Section navigation
  const [activeSection, setActiveSection] = useState<Section>('gm');

  // Search state
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<CreatureRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<CreatureRecord | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creatureCount, setCreatureCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ phase: 'idle' });

  // Filter sidebar
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Encounter state
  const [encounters, setEncounters] = useState<Encounter[]>([
    { id: 1, name: 'Encounter 1', creatures: [] },
  ]);
  const [activeEnc, setActiveEnc] = useState(0);
  const [partySize, setPartySize] = useState(4);
  const [partyLevel, setPartyLevel] = useState(3);

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

  const refreshCount = useCallback(async () => {
    const [count, synced] = await Promise.all([getCreatureCount(), getLastSynced()]);
    setCreatureCount(count);
    setLastSynced(synced);
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

  useEffect(() => {
    refreshCount();
    triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Encounter management ──
  const addToEncounter = useCallback(
    (c: CreatureRecord) => {
      const pf2e = c.data as PF2ECreature;
      const level = pf2e.system?.details?.level?.value ?? 0;
      const maxHp = pf2e.system?.attributes?.hp?.max ?? 10;
      const ac = pf2e.system?.attributes?.ac?.value ?? 10;
      const entry: EncounterCreature = {
        uid: `${c.id}-${Date.now()}-${Math.random()}`,
        name: c.name,
        level,
        hp: maxHp,
        maxHp,
        ac,
        init: 0,
      };
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc ? { ...enc, creatures: [...enc.creatures, entry] } : enc
        )
      );
    },
    [activeEnc]
  );

  const addEncounter = useCallback(() => {
    const newIdx = encounters.length;
    setEncounters(prev => [
      ...prev,
      { id: newIdx + 1, name: `Encounter ${newIdx + 1}`, creatures: [] },
    ]);
    setActiveEnc(newIdx);
  }, [encounters.length]);

  const removeCreature = useCallback(
    (uid: string) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? { ...enc, creatures: enc.creatures.filter(c => c.uid !== uid) }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const updateHP = useCallback(
    (uid: string, delta: number) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? {
                ...enc,
                creatures: enc.creatures.map(c =>
                  c.uid === uid
                    ? { ...c, hp: Math.max(0, Math.min(c.maxHp, c.hp + delta)) }
                    : c
                ),
              }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const addCustomCreature = useCallback(
    (name: string, level: number) => {
      const entry: EncounterCreature = {
        uid: `custom-${Date.now()}`,
        name,
        level,
        hp: 20,
        maxHp: 20,
        ac: 15,
        init: 0,
        custom: true,
      };
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc ? { ...enc, creatures: [...enc.creatures, entry] } : enc
        )
      );
    },
    [activeEnc]
  );

  // Suppress unused warning — lastSynced retained for future use
  void lastSynced;

  return (
    <div className={styles.app}>
      <TopBar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className={styles.content}>
        {activeSection === 'gm' && (
          <div className={styles.gmLayout}>
            <div className={`${styles.filterCol} ${filtersOpen ? styles.filterColOpen : ''}`}>
              <SearchPanel
                filters={filters}
                onChange={setFilters}
                disabled={isSyncing && creatureCount === 0}
              />
            </div>
            <div className={styles.resultsCol}>
              {isSyncing && <SyncProgressBar progress={syncProgress} />}
              <ResultsList
                results={results}
                totalCount={totalCount}
                selectedId={selected?.id ?? null}
                onSelect={c => setSelected(prev => (prev?.id === c.id ? null : c))}
                onAddToEncounter={addToEncounter}
                loading={searchLoading}
                syncing={isSyncing}
                creatureCount={creatureCount}
                sortBy={filters.sortBy}
                onSortChange={s => setFilters(f => ({ ...f, sortBy: s }))}
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen(o => !o)}
              />
            </div>
            <EncounterManager
              encounters={encounters}
              activeEnc={activeEnc}
              partySize={partySize}
              partyLevel={partyLevel}
              onActiveEncChange={setActiveEnc}
              onPartySizeChange={setPartySize}
              onPartyLevelChange={setPartyLevel}
              onAddEncounter={addEncounter}
              onRemoveCreature={removeCreature}
              onUpdateHP={updateHP}
              onAddCustomCreature={addCustomCreature}
            />
            <StatblockDrawer
              creature={selected}
              onClose={() => setSelected(null)}
              onAddToEncounter={addToEncounter}
            />
          </div>
        )}
        {activeSection === 'rules' && <RulesSection />}
        {activeSection === 'characters' && <CharactersSection />}
      </div>
    </div>
  );
}

function SyncProgressBar({ progress }: { progress: SyncProgress }) {
  const { phase, done, total } = progress;
  const pct =
    phase === 'fetching' && total && total > 0
      ? Math.round(((done ?? 0) / total) * 100)
      : null;

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
