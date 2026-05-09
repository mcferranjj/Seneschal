import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CreatureRecord } from './db/schema';
import { searchCreatures, DEFAULT_FILTERS } from './search/search';
import type { SearchFilters } from './search/search';
import { runSync, getLastSynced, getCreatureCount, resetDatabase } from './sync/sync';
import { initTraitDescriptions } from './components/StatblockDrawer/statblockHelpers';
import type { SyncProgress } from './sync/sync';
import type { PF2ECreature } from './types/pf2e';
import type { Section, Encounter, EncounterCreature, Condition } from './types/encounter';
import type { RollHistoryEntry } from './types/diceHistory';
import { db, loadEncounterState, saveEncounterState } from './db/db';
import { importCreatureAsCustom } from './utils/importCreature';
import { buildScaledCreature, adjustedMaxHp } from './utils/levelScaling';
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

  // Filter + results sidebars
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(true);

  // Custom creature wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardEditCreature, setWizardEditCreature] = useState<import('./db/schema').CreatureRecord | undefined>(undefined);

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
    [], // no dependencies — always stable
  );

  // Stable forever — all mutable data accessed through refs
  const onHandlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !gmLayoutRef.current) return;
    const { prop, min, max } = COL_META[drag.col];
    const raw = drag.startW + (e.clientX - drag.startX);
    const newW = Math.min(max, Math.max(min, raw));
    // Write straight to DOM — zero React renders during the drag
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
    triggerSync().then(() => initTraitDescriptions()).catch(() => {});
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
      const strMod = pf2e.system?.abilities?.str?.mod;
      const dexMod = pf2e.system?.abilities?.dex?.mod;
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
        strMod,
        dexMod,
        traits: c.traits,
        rarity: c.rarity,
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

  const reorderEncounters = useCallback((fromIdx: number, toIdx: number) => {
    setEncounters(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setActiveEnc(prev => {
      if (prev === fromIdx) return toIdx;
      if (fromIdx < toIdx) {
        if (prev > fromIdx && prev <= toIdx) return prev - 1;
      } else {
        if (prev >= toIdx && prev < fromIdx) return prev + 1;
      }
      return prev;
    });
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
                  const newHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
                  return { ...c, hp: newHp };
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

  const setEliteWeak = useCallback(
    (uid: string, adjustment: 'elite' | 'weak' | undefined) => {
      setEncounters(prev =>
        prev.map((enc, i) => {
          if (i !== activeEnc) return enc;
          return {
            ...enc,
            creatures: enc.creatures.map(c => {
              if (c.uid !== uid) return c;
              // Preserve the raw base HP so toggling elite/weak multiple times doesn't stack
              const baseMaxHp = c.baseMaxHp ?? c.maxHp;
              const updated = { ...c, eliteWeak: adjustment, baseMaxHp };
              const newMax = adjustedMaxHp(updated);
              return { ...updated, maxHp: newMax, hp: newMax };
            }),
          };
        })
      );
    },
    [activeEnc]
  );

  const setScaledLevel = useCallback(
    async (uid: string, level: number | undefined) => {
      // Look up the CreatureRecord so we can compute (or restore) scaled stats for the card
      const enc = encounters.find((_, i) => i === activeEnc);
      const creature = enc?.creatures.find(c => c.uid === uid);
      const creatureId = creature?.creatureId;
      const record = creatureId ? await db.creatures.get(creatureId) : undefined;

      setEncounters(prev =>
        prev.map((enc, i) => {
          if (i !== activeEnc) return enc;
          return {
            ...enc,
            creatures: enc.creatures.map(c => {
              if (c.uid !== uid) return c;
              if (level == null || !record) {
                // Remove scaling — restore original stats from DB record
                const pf2e = record?.data as import('./types/pf2e').PF2ECreature | undefined;
                const restoredBase = pf2e?.system?.attributes?.hp?.max ?? (c.baseMaxHp ?? c.maxHp);
                return {
                  ...c,
                  scaledLevel: undefined,
                  baseMaxHp: undefined, // reset; elite/weak will recompute from restored maxHp
                  ac:    pf2e?.system?.attributes?.ac?.value ?? c.ac,
                  maxHp: restoredBase,
                  hp:    restoredBase,
                  fort:  pf2e?.system?.saves?.fortitude?.value ?? c.fort,
                  ref:   pf2e?.system?.saves?.reflex?.value ?? c.ref,
                  will:  pf2e?.system?.saves?.will?.value ?? c.will,
                };
              }
              // Apply scaling — use buildScaledCreature to get new card values
              const scaled = buildScaledCreature(record, level);
              return {
                ...c,
                scaledLevel: level,
                baseMaxHp: undefined, // reset so elite/weak recomputes from new scaled base
                ac:    scaled.ac,
                maxHp: scaled.hp,
                hp:    Math.min(c.hp, scaled.hp), // keep current HP if it's lower than new max
                fort:  scaled.fort,
                ref:   scaled.ref,
                will:  scaled.will,
              };
            }),
          };
        })
      );
    },
    [activeEnc, encounters]
  );

  const duplicateCreature = useCallback(
    (uid: string) => {
      setEncounters(prev =>
        prev.map((enc, i) => {
          if (i !== activeEnc) return enc;
          const original = enc.creatures.find(c => c.uid === uid);
          if (!original) return enc;
          const duplicate: EncounterCreature = {
            ...original,
            uid: `${original.custom ? 'custom' : original.creatureId ?? 'creature'}-${Date.now()}-${Math.random()}`,
            hp: original.maxHp,
            conditions: [],
          };
          return { ...enc, creatures: [...enc.creatures, duplicate] };
        })
      );
    },
    [activeEnc]
  );

  // uid of the specific encounter creature instance whose statblock is shown
  const [selectedEncounterUid, setSelectedEncounterUid] = useState<string | null>(null);

  const selectCreatureById = useCallback(async (id: string, encounterUid?: string) => {
    const creature = await db.creatures.get(id);
    if (creature) {
      setSelected(creature);
      setSelectedEncounterUid(encounterUid ?? null);
    }
  }, []);

  // Select a custom/placeholder creature by its encounter uid (no DB record)
  const selectEncounterCreature = useCallback((_uid: string) => {
    // Custom creatures don't have a statblock in the DB — nothing to show in the drawer.
    // This hook exists so future expansion can open a custom creature view.
  }, []);

  const handleCopyCreature = useCallback((creature: import('./db/schema').CreatureRecord) => {
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

  const openEditWizard = useCallback((creature: import('./db/schema').CreatureRecord) => {
    setWizardEditCreature(creature);
    setWizardOpen(true);
  }, []);

  const handleWizardSave = useCallback(async (creature: import('./db/schema').CreatureRecord) => {
    setWizardOpen(false);
    setWizardEditCreature(undefined);
    setSelected(creature);
    // Refresh search so the new creature appears in results
    const { results: r, totalCount: tc } = await searchCreatures(filtersRef.current);
    setResults(r);
    setTotalCount(tc);
    await refreshCount();
  }, [refreshCount]);

  const handleResetDatabase = useCallback(async () => {
    await resetDatabase();
    setCreatureCount(0);
    setResults([]);
    setTotalCount(0);
    setLastSynced(null);
    // Kick off a fresh sync immediately
    triggerSync().then(() => initTraitDescriptions()).catch(() => {});
  }, [triggerSync]);

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

  // Keep CSS custom properties in sync with React state (initial mount + any
  // programmatic changes). During a drag this effect does NOT run — we write
  // directly to the DOM — so there are zero extra renders on pointermove.
  useEffect(() => {
    if (!gmLayoutRef.current) return;
    gmLayoutRef.current.style.setProperty('--filters-width', `${filtersWidth}px`);
    gmLayoutRef.current.style.setProperty('--results-width', `${resultsWidth}px`);
    gmLayoutRef.current.style.setProperty('--encounter-width', `${encounterWidth}px`);
  }, [filtersWidth, resultsWidth, encounterWidth]);

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
            <div className={`${styles.filterCol} ${filtersOpen ? styles.filterColOpen : ''}`}>
              <SearchPanel
                filters={filters}
                onChange={setFilters}
                disabled={isSyncing && creatureCount === 0}
                partyLevel={partyLevel}
              />
            </div>
            <div
              className={`${styles.resizeHandle} ${!(filtersOpen && resultsOpen) ? styles.resizeHandleHidden : ''}`}
              onPointerDown={onHandlePointerDown('filters')}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
            />
            <div className={`${styles.resultsCol} ${resultsOpen ? styles.resultsColOpen : ''}`}>
              {isSyncing && <SyncProgressBar progress={syncProgress} />}
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
                onSortChange={s => setFilters(f => ({ ...f, sortBy: s }))}
                onSortDirChange={s => setFilters(f => ({ ...f, sortDir: s }))}
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen(o => !o)}
                onOpenWizard={openWizard}
              />
            </div>
            <div
              className={`${styles.resizeHandle} ${!resultsOpen ? styles.resizeHandleHidden : ''}`}
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
                onSelectEncounterCreature={selectEncounterCreature}
                onUpdateConditions={updateConditions}
                onSetEliteWeak={setEliteWeak}
                onSetScaledLevel={setScaledLevel}
                onRoll={addRollEntry}
                resultsOpen={resultsOpen}
                onToggleResults={() => {
                  if (resultsOpen) {
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
                onWizardSave={handleWizardSave}
                onWizardCancel={() => { setWizardOpen(false); setWizardEditCreature(undefined); }}
                onDeleteCreature={handleDeleteCreature}
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
