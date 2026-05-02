import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CreatureRecord } from './db/schema';
import { searchCreatures, DEFAULT_FILTERS } from './search/search';
import type { SearchFilters } from './search/search';
import { runSync, getLastSynced, getCreatureCount } from './sync/sync';
import type { SyncProgress } from './sync/sync';
import type { PF2ECreature } from './types/pf2e';
import type { Section, Encounter, EncounterCreature, Condition } from './types/encounter';
import type { RollHistoryEntry } from './types/diceHistory';
import { db, loadEncounterState, saveEncounterState } from './db/db';
import { TopBar } from './components/TopBar/TopBar';
import { SearchPanel } from './components/SearchPanel/SearchPanel';
import { ResultsList } from './components/ResultsList/ResultsList';
import { StatblockDrawer } from './components/StatblockDrawer/StatblockDrawer';
import { EncounterManager } from './components/EncounterManager/EncounterManager';
import { RulesSection } from './components/RulesSection/RulesSection';
import { CharactersSection } from './components/CharactersSection/CharactersSection';
import { RollHistory } from './components/RollHistory/RollHistory';
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

  // Custom creature wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  // Roll history
  const [rollHistory, setRollHistory] = useState<RollHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const rollIdRef = useRef(0);

  const addRollEntry = useCallback((entry: Omit<RollHistoryEntry, 'id'>) => {
    setRollHistory(prev => [{ ...entry, id: ++rollIdRef.current }, ...prev]);
  }, []);

  // Encounter state
  const [encounters, setEncounters] = useState<Encounter[]>([
    { id: 1, name: 'Encounter 1', creatures: [] },
  ]);
  const [activeEnc, setActiveEnc] = useState(0);
  const [partySize, setPartySize] = useState(4);
  const [partyLevel, setPartyLevel] = useState(3);
  const encounterStateLoaded = useRef(false);

  // Column widths (px); statblock takes remaining flex space
  const [filtersWidth, setFiltersWidth] = useState(220);
  const [resultsWidth, setResultsWidth] = useState(260);
  const [encounterWidth, setEncounterWidth] = useState(280);
  const dragRef = useRef<{ col: 'filters' | 'results' | 'encounter'; startX: number; startW: number } | null>(null);

  const onHandlePointerDown = useCallback(
    (col: 'filters' | 'results' | 'encounter') => (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        col,
        startX: e.clientX,
        startW: col === 'filters' ? filtersWidth : col === 'results' ? resultsWidth : encounterWidth,
      };
    },
    [filtersWidth, resultsWidth, encounterWidth]
  );

  const onHandlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    const newW = Math.max(160, dragRef.current.startW + delta);
    if (dragRef.current.col === 'filters') setFiltersWidth(Math.min(400, newW));
    else if (dragRef.current.col === 'results') setResultsWidth(newW);
    else setEncounterWidth(newW);
  }, []);

  const onHandlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

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
    loadEncounterState().then(saved => {
      if (saved) {
        setEncounters(saved.encounters);
        setActiveEnc(saved.activeEnc);
        setPartySize(saved.partySize);
        setPartyLevel(saved.partyLevel);
      }
      encounterStateLoaded.current = true;
    }).catch(() => { encounterStateLoaded.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!encounterStateLoaded.current) return;
    saveEncounterState({ encounters, activeEnc, partySize, partyLevel }).catch(() => {});
  }, [encounters, activeEnc, partySize, partyLevel]);

  // ── Encounter management ──
  const addToEncounter = useCallback(
    (c: CreatureRecord) => {
      const pf2e = c.data as PF2ECreature;
      const level = pf2e.system?.details?.level?.value ?? 0;
      const maxHp = pf2e.system?.attributes?.hp?.max ?? 10;
      const ac = pf2e.system?.attributes?.ac?.value ?? 10;
      const fort = pf2e.system?.saves?.fortitude?.value;
      const ref = pf2e.system?.saves?.reflex?.value;
      const will = pf2e.system?.saves?.will?.value;
      const entry: EncounterCreature = {
        uid: `${c.id}-${Date.now()}-${Math.random()}`,
        creatureId: c.id,
        name: c.name,
        level,
        hp: maxHp,
        maxHp,
        ac,
        fort,
        ref,
        will,
        init: 0,
        conditions: [],
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

  const renameEncounter = useCallback((idx: number, name: string) => {
    setEncounters(prev => prev.map((enc, i) => i === idx ? { ...enc, name } : enc));
  }, []);

  const deleteEncounter = useCallback((idx: number) => {
    setEncounters(prev => {
      if (prev.length <= 1) return prev; // never delete the last encounter
      return prev.filter((_, i) => i !== idx);
    });
    setActiveEnc(prev => {
      if (idx < prev) return prev - 1;
      if (idx === prev) return Math.max(0, idx - 1);
      return prev;
    });
  }, []);

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
                creatures: enc.creatures.map(c => {
                  if (c.uid !== uid) return c;
                  const newHp = Math.max(0, c.hp + delta);
                  // For placeholder creatures with no stats (maxHp=0), manually setting HP
                  // via delta expands maxHp if newHp exceeds it
                  if (c.custom && c.maxHp === 0) {
                    return { ...c, hp: newHp, maxHp: newHp };
                  }
                  return { ...c, hp: Math.min(c.maxHp, newHp) };
                }),
              }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const setHPDirect = useCallback(
    (uid: string, newHp: number) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? {
                ...enc,
                creatures: enc.creatures.map(c => {
                  if (c.uid !== uid) return c;
                  // Placeholder creature: expand maxHp if new value exceeds it
                  if (c.custom && newHp > c.maxHp) {
                    return { ...c, hp: newHp, maxHp: newHp };
                  }
                  return { ...c, hp: Math.max(0, Math.min(c.maxHp, newHp)) };
                }),
              }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const updateConditions = useCallback(
    (uid: string, conditions: Condition[]) => {
      setEncounters(prev =>
        prev.map((enc, i) =>
          i === activeEnc
            ? { ...enc, creatures: enc.creatures.map(c => c.uid === uid ? { ...c, conditions } : c) }
            : enc
        )
      );
    },
    [activeEnc]
  );

  const selectCreatureById = useCallback(async (id: string) => {
    const creature = await db.creatures.get(id);
    if (creature) setSelected(creature);
  }, []);

  const openWizard = useCallback(() => {
    setSelected(null);
    setWizardOpen(true);
  }, []);

  const handleWizardSave = useCallback(async (creature: import('./db/schema').CreatureRecord) => {
    setWizardOpen(false);
    setSelected(creature);
    // Refresh search so the new creature appears in results
    const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
    setResults(r);
    setTotalCount(tc);
    await refreshCount();
  }, [refreshCount]);

  const handleDeleteCreature = useCallback(async (id: string) => {
    await db.creatures.delete(id);
    setSelected(null);
    const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
    setResults(r);
    setTotalCount(tc);
    await refreshCount();
  }, [refreshCount]);

  const addCustomCreature = useCallback(
    (name: string, level: number, hp?: number, ac?: number, fort?: number, ref?: number, will?: number, attacks?: import('./types/encounter').CustomAttack[], abilities?: import('./types/encounter').CustomAbility[], isEnemy?: boolean) => {
      const isPlaceholder = hp == null && ac == null;
      const maxHp = hp ?? 0;
      const entry: EncounterCreature = {
        uid: `custom-${Date.now()}`,
        name,
        level,
        hp: maxHp,
        maxHp,
        ac: ac ?? 0,
        fort,
        ref,
        will,
        attacks,
        abilities,
        init: 0,
        conditions: [],
        custom: true,
        isEnemy: isEnemy ?? !isPlaceholder,
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
      <TopBar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        historyCount={rollHistory.length}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen(o => !o)}
      />
      {historyOpen && (
        <RollHistory
          entries={rollHistory}
          onClear={() => setRollHistory([])}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      <div className={styles.content}>
        {activeSection === 'gm' && (
          <div className={`${styles.gmLayout} ${!filtersOpen ? styles.gmLayoutCollapsed : ''}`}>
            <div className={`${styles.filterCol} ${filtersOpen ? styles.filterColOpen : ''}`} style={filtersOpen ? { width: filtersWidth } : {}}>
              <SearchPanel
                filters={filters}
                onChange={setFilters}
                disabled={isSyncing && creatureCount === 0}
                partyLevel={partyLevel}
              />
            </div>
            <div className={styles.resultsCol} style={{ flexBasis: resultsWidth, flexGrow: 0, flexShrink: 0 }}>
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
                onOpenWizard={openWizard}
              />
            </div>
            {filtersOpen && (
              <div
                className={styles.resizeHandle}
                onPointerDown={onHandlePointerDown('filters')}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
              />
            )}
            <div
              className={styles.resizeHandle}
              onPointerDown={onHandlePointerDown('results')}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            />
            <div className={styles.encounterCol} style={{ flexBasis: encounterWidth, flexGrow: 0, flexShrink: 0 }}>
              <EncounterManager
                encounters={encounters}
                activeEnc={activeEnc}
                partySize={partySize}
                partyLevel={partyLevel}
                onActiveEncChange={setActiveEnc}
                onPartySizeChange={setPartySize}
                onPartyLevelChange={setPartyLevel}
                onAddEncounter={addEncounter}
                onRenameEncounter={renameEncounter}
                onDeleteEncounter={deleteEncounter}
                onRemoveCreature={removeCreature}
                onUpdateHP={updateHP}
                onSetHP={setHPDirect}
                onAddCustomCreature={addCustomCreature}
                onSelectCreature={selectCreatureById}
                onUpdateConditions={updateConditions}
                onRoll={addRollEntry}
              />
            </div>
            <div
              className={styles.resizeHandle}
              onPointerDown={onHandlePointerDown('encounter')}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            />
            <div className={styles.statblockCol}>
              <StatblockDrawer
                creature={selected}
                onClose={() => setSelected(null)}
                onAddToEncounter={addToEncounter}
                wizardOpen={wizardOpen}
                partyLevel={partyLevel}
                onWizardSave={handleWizardSave}
                onWizardCancel={() => setWizardOpen(false)}
                onDeleteCreature={handleDeleteCreature}
                onRoll={addRollEntry}
              />
            </div>
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
