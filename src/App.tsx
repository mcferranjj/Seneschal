import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CreatureRecord } from './db/schema';
import { creatureRepository } from './db/repositories/CreatureRepository';
import { importCreatureAsCustom } from './utils/importCreature';
import type { Section } from './types/encounter';
import type { RollHistoryEntry } from './types/diceHistory';
import type { SyncProgress } from './sync/sync';
import { useEncounter } from './hooks/useEncounter';
import { useSearch } from './hooks/useSearch';
import { TopBar } from './features/shell/TopBar';
import { SearchPanel } from './features/creatures/SearchPanel/SearchPanel';
import { ResultsList } from './features/creatures/ResultsList/ResultsList';
import { StatblockDrawer } from './features/statblock/StatblockDrawer';
import { EncounterManager } from './features/encounter/EncounterManager';
import { RulesSection } from './features/rules/RulesSection';
import { CharactersSection } from './features/characters/CharactersSection';
import { RollHistory } from './features/roll-history/RollHistory';
import styles from './features/shell/App.module.css';

export default function App() {
  // Section navigation
  const [activeSection, setActiveSection] = useState<Section>('gm');

  // Search + sync state
  const {
    filters,
    setFilters,
    results,
    totalCount,
    searchLoading,
    creatureCount,
    syncProgress,
    isSyncing,
    triggerSync,
    handleResetDatabase,
    handleDeleteCreature,
    handleWizardSave,
  } = useSearch();

  // Encounter state + callbacks
  const {
    encounters,
    activeEnc,
    partySize,
    partyLevel,
    setActiveEnc,
    setPartySize,
    setPartyLevel,
    addToEncounter,
    addEncounter,
    renameEncounter,
    reorderEncounters,
    deleteEncounter,
    removeCreature,
    updateHP,
    setHPDirect,
    updateConditions,
    setEliteWeak,
    setScaledLevel,
    duplicateCreature,
    addCustomCreature,
  } = useEncounter();

  // Filter + results sidebars.
  // Open state is tracked in refs and applied directly to the DOM (no re-render)
  // so CSS animations fire on the very next paint frame without React batching delay.
  const filtersOpenRef = useRef(true);
  const resultsOpenRef = useRef(true);
  // Separate minimal state just for the ResultsList toggle button label & aria.
  const [filtersOpenLabel, setFiltersOpenLabel] = useState(true);
  const [resultsOpenLabel, setResultsOpenLabel] = useState(true);

  // Refs to the actual column/handle DOM nodes so we can toggle classes directly.
  const filterColRef  = useRef<HTMLDivElement>(null);
  const filterHandleRef = useRef<HTMLDivElement>(null);
  const resultsColRef = useRef<HTMLDivElement>(null);
  const resultsHandleRef = useRef<HTMLDivElement>(null);

  const setFiltersOpen = useCallback((open: boolean) => {
    filtersOpenRef.current = open;
    const el = filterColRef.current;
    if (el) {
      if (open) {
        // Force the browser to commit the closed (width:0, opacity:0) state before
        // adding the open class, so the transition always has a visible start frame.
        void el.offsetWidth;
      }
      el.classList.toggle(styles.filterColOpen, open);
    }
    // Filter resize handle is visible only when both panels are open
    filterHandleRef.current?.classList.toggle(
      styles.resizeHandleHidden,
      !(open && resultsOpenRef.current),
    );
    setFiltersOpenLabel(open);
  }, []);

  const setResultsOpen = useCallback((open: boolean) => {
    resultsOpenRef.current = open;
    const el = resultsColRef.current;
    if (el) {
      if (open) {
        void el.offsetWidth;
      }
      el.classList.toggle(styles.resultsColOpen, open);
    }
    resultsHandleRef.current?.classList.toggle(styles.resizeHandleHidden, !open);
    // Filter resize handle also depends on resultsOpen
    filterHandleRef.current?.classList.toggle(
      styles.resizeHandleHidden,
      !(filtersOpenRef.current && open),
    );
    setResultsOpenLabel(open);
  }, []);

  // Custom creature wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardEditCreature, setWizardEditCreature] = useState<CreatureRecord | undefined>(undefined);

  // Roll history
  const [rollHistory, setRollHistory] = useState<RollHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const rollIdRef = useRef(0);

  const addRollEntry = useCallback((entry: Omit<RollHistoryEntry, 'id'>) => {
    setRollHistory(prev => [{ ...entry, id: ++rollIdRef.current }, ...prev]);
  }, []);

  // Selected creature (statblock drawer)
  const [selected, setSelected] = useState<CreatureRecord | null>(null);
  const [selectedEncounterUid, setSelectedEncounterUid] = useState<string | null>(null);

  // Column widths (px) — React state is the source of truth at rest.
  // During a drag we write directly to the CSS custom property on the layout
  // element to avoid re-rendering the whole tree on every pointermove.
  const [filtersWidth, setFiltersWidth] = useState(220);
  const [resultsWidth, setResultsWidth] = useState(260);
  const [encounterWidth, setEncounterWidth] = useState(280);

  const gmLayoutRef = useRef<HTMLDivElement>(null);

  // Keep a ref to current widths so pointer handlers never close over stale state
  // and never need to be recreated when widths change.
  const widthsRef = useRef({ filtersWidth, resultsWidth, encounterWidth });
  widthsRef.current = { filtersWidth, resultsWidth, encounterWidth };

  const dragRef = useRef<{
    col: 'filters' | 'results' | 'encounter';
    startX: number;
    startW: number;
  } | null>(null);

  const COL_META = {
    filters:   { prop: '--filters-width',   min: 160, max: 400 },
    results:   { prop: '--results-width',   min: 160, max: Infinity },
    encounter: { prop: '--encounter-width', min: 160, max: Infinity },
  } as const;

  // Stable forever — reads widths from ref, no state dependencies
  const onHandlePointerDown = useCallback(
    (col: 'filters' | 'results' | 'encounter') => (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const startW = widthsRef.current[`${col}Width` as keyof typeof widthsRef.current];
      dragRef.current = { col, startX: e.clientX, startW };
    },
    [],
  );

  // Stable forever — all mutable data accessed through refs
  const onHandlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !gmLayoutRef.current) return;
    const { prop, min, max } = COL_META[drag.col];
    const raw = drag.startW + (e.clientX - drag.startX);
    const newW = Math.min(max, Math.max(min, raw));
    gmLayoutRef.current.style.setProperty(prop, `${newW}px`);
  }, []);

  // Stable forever — commits the final DOM value to React state exactly once
  const onHandlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !gmLayoutRef.current) return;
    const { prop, min, max } = COL_META[drag.col];
    const raw = parseInt(gmLayoutRef.current.style.getPropertyValue(prop), 10);
    const px = isNaN(raw) ? drag.startW : Math.min(max, Math.max(min, raw));
    if (drag.col === 'filters') setFiltersWidth(px);
    else if (drag.col === 'results') setResultsWidth(px);
    else setEncounterWidth(px);
  }, []);

  // Keep CSS custom properties in sync with React state (initial mount + any
  // programmatic changes). During a drag this effect does NOT run — we write
  // directly to the DOM — so there are zero extra renders on pointermove.
  useEffect(() => {
    if (!gmLayoutRef.current) return;
    gmLayoutRef.current.style.setProperty('--filters-width', `${filtersWidth}px`);
    gmLayoutRef.current.style.setProperty('--results-width', `${resultsWidth}px`);
    gmLayoutRef.current.style.setProperty('--encounter-width', `${encounterWidth}px`);
  }, [filtersWidth, resultsWidth, encounterWidth]);

  const selectCreatureById = useCallback(async (id: string, encounterUid?: string) => {
    const creature = await creatureRepository.get(id);
    if (creature) {
      setSelected(creature);
      setSelectedEncounterUid(encounterUid ?? null);
    }
  }, []);

  const handleCopyCreature = useCallback((creature: CreatureRecord) => {
    const draft = importCreatureAsCustom(creature);
    setWizardEditCreature(draft);
    setSelected(null);
    setWizardOpen(true);
  }, []);

  const openWizard = useCallback(() => {
    setSelected(null);
    setWizardEditCreature(undefined);
    setWizardOpen(true);
  }, []);

  const openEditWizard = useCallback((creature: CreatureRecord) => {
    setWizardEditCreature(creature);
    setWizardOpen(true);
  }, []);

  const onWizardSave = useCallback(async (creature: CreatureRecord) => {
    await handleWizardSave(creature, saved => {
      setWizardOpen(false);
      setWizardEditCreature(undefined);
      setSelected(saved);
    });
  }, [handleWizardSave]);

  const onDeleteCreature = useCallback(async (id: string) => {
    await handleDeleteCreature(id, () => setSelected(null));
  }, [handleDeleteCreature]);

  return (
    <div className={styles.app}>
      <TopBar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        historyCount={rollHistory.length}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen(o => !o)}
        onResetDatabase={handleResetDatabase}
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
          <div ref={gmLayoutRef} className={styles.gmLayout}>
            <div ref={filterColRef} className={`${styles.filterCol} ${styles.filterColOpen}`}>
              <SearchPanel
                filters={filters}
                onChange={setFilters}
                disabled={isSyncing && creatureCount === 0}
                partyLevel={partyLevel}
              />
            </div>
            <div
              ref={filterHandleRef}
              className={styles.resizeHandle}
              onPointerDown={onHandlePointerDown('filters')}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            />
            <div ref={resultsColRef} className={`${styles.resultsCol} ${styles.resultsColOpen}`}>
              {(isSyncing || syncProgress.phase === 'error') && <SyncProgressBar progress={syncProgress} onRetry={triggerSync} />}
              <ResultsList
                results={results}
                totalCount={totalCount}
                selectedId={selected?.id ?? null}
                onSelect={c => { setSelected(prev => (prev?.id === c.id ? null : c)); setSelectedEncounterUid(null); }}
                onAddToEncounter={addToEncounter}
                loading={searchLoading}
                syncing={isSyncing}
                creatureCount={creatureCount}
                sortBy={filters.sortBy}
                sortDir={filters.sortDir}
                onSortChange={s => setFilters({ ...filters, sortBy: s })}
                onSortDirChange={s => setFilters({ ...filters, sortDir: s })}
                filtersOpen={filtersOpenLabel}
                onToggleFilters={() => setFiltersOpen(!filtersOpenRef.current)}
                onOpenWizard={openWizard}
              />
            </div>
            <div
              ref={resultsHandleRef}
              className={styles.resizeHandle}
              onPointerDown={onHandlePointerDown('results')}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            />
            <div className={styles.encounterCol}>
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
                onReorderEncounters={reorderEncounters}
                onRemoveCreature={removeCreature}
                onDuplicateCreature={duplicateCreature}
                onUpdateHP={updateHP}
                onSetHP={setHPDirect}
                onAddCustomCreature={addCustomCreature}
                onSelectCreature={(id, uid) => selectCreatureById(id, uid)}
                onSelectEncounterCreature={() => {
                  // Custom creatures don't have a statblock in the DB — nothing to show.
                }}
                onUpdateConditions={updateConditions}
                onSetEliteWeak={setEliteWeak}
                onSetScaledLevel={setScaledLevel}
                onRoll={addRollEntry}
                resultsOpen={resultsOpenLabel}
                onToggleResults={() => {
                  if (resultsOpenRef.current) {
                    setResultsOpen(false);
                    setFiltersOpen(false);
                  } else {
                    setResultsOpen(true);
                  }
                }}
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
                wizardEditCreature={wizardEditCreature}
                partyLevel={partyLevel}
                onWizardSave={onWizardSave}
                onWizardCancel={() => { setWizardOpen(false); setWizardEditCreature(undefined); }}
                onDeleteCreature={onDeleteCreature}
                onEditCreature={openEditWizard}
                onRoll={addRollEntry}
                onCopyAsCustom={handleCopyCreature}
                activeConditions={
                  selected && selectedEncounterUid
                    ? (encounters[activeEnc]?.creatures.find(c => c.uid === selectedEncounterUid)?.conditions ?? [])
                    : []
                }
                activeEliteWeak={
                  selected && selectedEncounterUid
                    ? encounters[activeEnc]?.creatures.find(c => c.uid === selectedEncounterUid)?.eliteWeak
                    : undefined
                }
                activeScaledLevel={
                  selected && selectedEncounterUid
                    ? encounters[activeEnc]?.creatures.find(c => c.uid === selectedEncounterUid)?.scaledLevel
                    : undefined
                }
                onSetScaledLevel={
                  selectedEncounterUid
                    ? (level) => setScaledLevel(selectedEncounterUid, level)
                    : undefined
                }
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

function SyncProgressBar({ progress, onRetry }: { progress: SyncProgress; onRetry: () => void }) {
  const { phase, done, total, message } = progress;
  const pct =
    phase === 'fetching' && total && total > 0
      ? Math.round(((done ?? 0) / total) * 100)
      : null;

  if (phase === 'error') {
    return (
      <div className={styles.progressBar} data-error>
        <div className={styles.progressLabel}>{message ?? 'Sync failed.'}</div>
        <button className={styles.retryBtn} onClick={onRetry}>Retry</button>
      </div>
    );
  }

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
