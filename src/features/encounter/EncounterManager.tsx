import { useEffect, useRef, useState, useCallback } from 'react';
import type { Encounter, EncounterCreature, Condition, CustomAttack, CustomAbility } from '../../types/encounter';
import type { RollHistoryEntry } from '../../types/diceHistory';
import { getRecallKnowledge, RK_DC_TABLE, RK_RARITY_ADJUSTMENT, RK_SKILLS } from '../../utils/recallKnowledge';
import { computePenalties, computeAttackPenalty, computeDamagePenalty } from '../../utils/conditionEffects';
import { buildEncounterExport, downloadJson } from '../../utils/exportImport';
import { DiceRoller } from '../dice/DiceRoller';
import { ManualRollInput } from '../dice/ManualRollInput';
import { cryptoD } from '../../utils/dice';
import styles from './EncounterManager.module.css';
import { eliteWeakLevel } from '../../utils/levelScaling';
import { QuickCreatureForm } from './QuickCreatureForm';
import { ConditionPicker } from './ConditionPicker';
import { PartyPickerMenu } from '../parties';
import type { PartyRecord, CreatureRecord } from '../../db/schema';
import { creatureRepository } from '../../db/repositories/CreatureRepository';
import { readDndPayload, writeDndPayload } from '../../utils/dnd';
import { computeInitForDrop } from '../../utils/initiative';


// Only Frightened auto-reduces by 1 at end of each creature's turn per PF2e rules.
const AUTO_REDUCE_CONDITIONS = new Set(['frightened']);

interface CombatCreature extends EncounterCreature {
  init: number;
}

// Re-export so existing importers of these symbols from EncounterManager don't break.
export { getRecallKnowledge, RK_DC_TABLE, RK_RARITY_ADJUSTMENT, RK_SKILLS };

interface EncounterManagerProps {
  encounters: Encounter[];
  activeEnc: number;
  partySize: number;
  partyLevel: number;
  onActiveEncChange: (idx: number) => void;
  onPartySizeChange: (size: number) => void;
  onPartyLevelChange: (level: number) => void;
  onAddEncounter: () => void;
  onRenameEncounter: (idx: number, name: string) => void;
  onDeleteEncounter: (idx: number) => void;
  onReorderEncounters: (fromIdx: number, toIdx: number) => void;
  onRemoveCreature: (uid: string) => void;
  onRenameCreature: (uid: string, name: string) => void;
  onDuplicateCreature: (uid: string) => void;
  onUpdateHP: (uid: string, delta: number) => void;
  onSetHP: (uid: string, newHp: number) => void;
  onSetCreatureInit?: (uid: string, init: number) => void;
  onAddCreatureRecord?: (record: CreatureRecord) => void;
  onAddCustomCreature: (name: string, level: number, hp?: number, ac?: number, fort?: number, ref?: number, will?: number, attacks?: CustomAttack[], abilities?: CustomAbility[], isEnemy?: boolean) => void;
  onSelectCreature: (id: string, encounterUid: string) => void;
  onSelectEncounterCreature: (uid: string) => void;
  selectedEncounterUid?: string | null;
  onUpdateConditions: (uid: string, conditions: Condition[]) => void;
  onSetEliteWeak: (uid: string, adjustment: 'elite' | 'weak' | undefined) => void;
  onSetScaledLevel: (uid: string, level: number | undefined) => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  resultsOpen?: boolean;
  onToggleResults?: () => void;
  parties?: PartyRecord[];
  activeParty?: PartyRecord | null;
  activePartyId?: string | null;
  onApplyParty?: (p: PartyRecord) => void;
  onInsertPartyAsCreatures?: (p: PartyRecord) => void;
  onSetActivePartyId?: (id: string | null) => void;
  onOpenPartyEditor?: (partyId: string | null) => void;
}

function xpFor(monsterLevel: number, partyLevel: number): number {
  const d = monsterLevel - partyLevel;
  if (d >= 4) return 160;
  if (d === 3) return 120;
  if (d === 2) return 80;
  if (d === 1) return 60;
  if (d === 0) return 40;
  if (d === -1) return 30;
  if (d === -2) return 20;
  if (d === -3) return 15;
  if (d === -4) return 10;
  return 0;
}

function getDifficulty(totalXP: number, partySize: number) {
  const adj = partySize - 4;
  const low      = 60  + 20 * adj;
  const moderate = 80  + 20 * adj;
  const severe   = 120 + 30 * adj;
  const extreme  = 160 + 40 * adj;
  if (totalXP >= extreme)  return { label: 'Extreme',  color: '#8a2a18', pct: 100 };
  if (totalXP >= severe)   return { label: 'Severe',   color: '#8a5a18', pct: (totalXP / extreme) * 100 };
  if (totalXP >= moderate) return { label: 'Moderate', color: '#6a7a18', pct: (totalXP / extreme) * 100 };
  if (totalXP >= low)      return { label: 'Low',      color: '#3a6a5a', pct: (totalXP / extreme) * 100 };
  return                          { label: 'Trivial',  color: '#5a7a3a', pct: (totalXP / extreme) * 100 };
}

export function EncounterManager({
  encounters,
  activeEnc,
  partySize,
  partyLevel,
  onActiveEncChange,
  onPartySizeChange,
  onPartyLevelChange,
  onAddEncounter,
  onRenameEncounter,
  onDeleteEncounter,
  onReorderEncounters,
  onRemoveCreature,
  onRenameCreature,
  onDuplicateCreature,
  onUpdateHP,
  onSetHP,
  onSetCreatureInit,
  onAddCreatureRecord,
  onAddCustomCreature,
  onSelectCreature,
  onSelectEncounterCreature,
  selectedEncounterUid,
  onUpdateConditions,
  onSetEliteWeak,
  onSetScaledLevel: _onSetScaledLevel,
  onRoll,
  resultsOpen = true,
  onToggleResults,
  parties = [],
  activeParty = null,
  activePartyId = null,
  onApplyParty,
  onInsertPartyAsCreatures,
  onSetActivePartyId,
  onOpenPartyEditor,
}: EncounterManagerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);
  const [combatMode, setCombatMode] = useState(false);
  const [round, setRound] = useState(1);
  const [activeTurn, setActiveTurn] = useState(0);
  const [combatCreatures, setCombatCreatures] = useState<CombatCreature[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [conditionPickerUid, setConditionPickerUid] = useState<string | null>(null);
  const [conditionPickerAnchor, setConditionPickerAnchor] = useState<{ x: number; y: number; top: number; spaceBelow: number; spaceAbove: number } | null>(null);
  /** When editing an existing valued condition, pre-seed the stepper. */
  const [conditionPickerInitial, setConditionPickerInitial] = useState<{ name: string; value: number } | undefined>(undefined);

  // Dice roller
  const [diceRoll, setDiceRoll] = useState<{ expr: string; label?: string; x: number; y: number } | null>(null);
  // Manual roll input (right-click)
  const [manualRoll, setManualRoll] = useState<{ expr: string; label?: string; x: number; y: number } | null>(null);

  // Encounter tab rename/delete/drag
  const [renamingTab, setRenamingTab] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [confirmDeleteTab, setConfirmDeleteTab] = useState<number | null>(null);
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);


  // Combat header width — used to shorten "Round N"→"Rnd N", "Next Turn"→"Next", "✕ End"→"✕"
  const combatHeaderRef = useRef<HTMLDivElement>(null);
  const combatHeaderRoRef = useRef<ResizeObserver | null>(null);
  const [combatHeaderNarrow, setCombatHeaderNarrow] = useState(false);
  const combatHeaderCallbackRef = useCallback((el: HTMLDivElement | null) => {
    // Disconnect any previous observer
    combatHeaderRoRef.current?.disconnect();
    combatHeaderRoRef.current = null;
    (combatHeaderRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const width = el.getBoundingClientRect().width;
      setCombatHeaderNarrow(width < 212);
    });
    ro.observe(el);
    combatHeaderRoRef.current = ro;
  }, []);

  // Click-outside to cancel delete confirmation
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const tabWrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // When the active encounter changes, scroll its tab's left edge into view
  useEffect(() => {
    const scroll = tabsScrollRef.current;
    const wrapper = tabWrapperRefs.current.get(activeEnc);
    if (!scroll || !wrapper) return;
    const scrollRect = scroll.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    // Position of the wrapper's left edge relative to the scroll container's visible area
    const relLeft = wrapRect.left - scrollRect.left;
    const relRight = wrapRect.right - scrollRect.left;
    if (relLeft < 0) {
      // Tab is off to the left — scroll so its left edge is flush with the container
      scroll.scrollTo({ left: scroll.scrollLeft + relLeft, behavior: 'smooth' });
    } else if (relRight > scrollRect.width) {
      // Tab is off to the right — scroll so its left edge is flush with the container
      scroll.scrollTo({ left: scroll.scrollLeft + relLeft, behavior: 'smooth' });
    }
  }, [activeEnc]);

  // When the delete-confirm buttons appear, scroll their tab wrapper into view
  useEffect(() => {
    if (confirmDeleteTab === null) return;
    const scroll = tabsScrollRef.current;
    const wrapper = tabWrapperRefs.current.get(confirmDeleteTab);
    if (!scroll || !wrapper) return;
    const scrollRect = scroll.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    const relLeft = wrapRect.left - scrollRect.left;
    const relRight = wrapRect.right - scrollRect.left;
    if (relLeft < 0) {
      scroll.scrollTo({ left: scroll.scrollLeft + relLeft, behavior: 'smooth' });
    } else if (relRight > scrollRect.width) {
      scroll.scrollTo({ left: scroll.scrollLeft + (relRight - scrollRect.width), behavior: 'smooth' });
    }
  }, [confirmDeleteTab]);
  useEffect(() => {
    if (confirmDeleteTab === null) return;
    function onPointerDown(e: PointerEvent) {
      if (tabsRef.current && !tabsRef.current.contains(e.target as Node)) {
        setConfirmDeleteTab(null);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [confirmDeleteTab]);

  // Inline editing
  const [editingInit, setEditingInit] = useState<string | null>(null);
  const [editInitVal, setEditInitVal] = useState('');
  const [editingHp, setEditingHp] = useState<string | null>(null);
  const [editHpVal, setEditHpVal] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameVal, setEditNameVal] = useState('');

  // Drag-and-drop for combat cards
  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ uid: string; position: 'above' | 'below' } | null>(null);

  function commitName(uid: string) {
    const trimmed = editNameVal.trim();
    if (trimmed) onRenameCreature(uid, trimmed);
    setEditingName(null);
  }

  const enc = encounters[activeEnc] ?? encounters[0];

  // Reset combat when switching encounters
  useEffect(() => {
    setCombatMode(false);
    setRound(1);
    setActiveTurn(0);
    setCombatCreatures([]);
  }, [activeEnc]);

  // Pick up creatures added (or removed) while combat is running
  const combatCreaturesRef = useRef(combatCreatures);
  combatCreaturesRef.current = combatCreatures;
  const activeTurnRef = useRef(activeTurn);
  activeTurnRef.current = activeTurn;

  useEffect(() => {
    if (!combatMode) return;
    const prev = combatCreaturesRef.current;
    const encUids = new Set(enc.creatures.map(c => c.uid));
    const prevUids = new Set(prev.map(c => c.uid));

    const newOnes = enc.creatures
      .filter(c => !prevUids.has(c.uid))
      .map(c => {
        const { init, roll, mod, label } = rollInitiative(c);
        if (onRoll) {
          onRoll({
            expression: `1d20${mod >= 0 ? `+${mod}` : mod}`,
            label,
            creatureName: c.name,
            rolls: [roll],
            modifier: mod,
            total: init,
            timestamp: Date.now(),
          });
        }
        return { ...c, init };
      });
    const kept = prev.filter(c => encUids.has(c.uid));

    if (newOnes.length === 0 && kept.length === prev.length) return;

    const activeUid = prev[activeTurnRef.current]?.uid;
    const next = [...kept, ...newOnes].sort((a, b) => b.init - a.init);
    setCombatCreatures(next);
    if (activeUid) {
      const newIdx = next.findIndex(c => c.uid === activeUid);
      if (newIdx !== -1) setActiveTurn(newIdx);
    }
  }, [combatMode, enc.creatures]);

  // Custom creatures with isEnemy=false don't count toward XP budget.
  // scaledLevel takes priority over the base level for XP; elite/weak still applies on top.
  const totalXP = enc.creatures.reduce((s, c) => {
    if (c.custom && c.isEnemy === false) return s;
    const effectiveBaseLevel = c.scaledLevel ?? c.level;
    return s + xpFor(eliteWeakLevel(effectiveBaseLevel, c.eliteWeak), partyLevel);
  }, 0);
  const diff = getDifficulty(totalXP, partySize);

  // During combat, look up live HP/maxHp/conditions from encounter state (already elite/weak adjusted in state).
  const liveCombatCreatures: CombatCreature[] = combatCreatures.map(cc => {
    const live = enc.creatures.find(c => c.uid === cc.uid);
    return live ? { ...cc, hp: live.hp, maxHp: live.maxHp, conditions: live.conditions } : cc;
  });

  function rollInitiative(c: EncounterCreature): { init: number; roll: number; mod: number; label: string } {
    const roll = cryptoD(20);
    if (c.isHazard) {
      const mod = c.stealthMod ?? 0;
      return { init: roll + mod, roll, mod, label: `${c.name} · Stealth (Initiative)` };
    } else {
      const mod = c.perception ?? 0;
      return { init: roll + mod, roll, mod, label: `${c.name} · Perception (Initiative)` };
    }
  }

  function startCombat() {
    const rolled: CombatCreature[] = enc.creatures
      .map(c => {
        const { init, roll, mod, label } = rollInitiative(c);
        if (onRoll) {
          onRoll({
            expression: `1d20${mod >= 0 ? `+${mod}` : mod}`,
            label,
            creatureName: c.name,
            rolls: [roll],
            modifier: mod,
            total: init,
            timestamp: Date.now(),
          });
        }
        return { ...c, init };
      })
      .sort((a, b) => b.init - a.init);
    setCombatCreatures(rolled);
    setCombatMode(true);
    setRound(1);
    setActiveTurn(0);
  }

  function endCombat() {
    setCombatMode(false);
    setRound(1);
    setActiveTurn(0);
    setCombatCreatures([]);
  }

  function nextTurn() {
    // Auto-reduce valued conditions on the creature ending their turn
    const ending = liveCombatCreatures[activeTurn];
    if (ending) {
      const updated = ending.conditions
        .map(cond => {
          if (cond.value != null && AUTO_REDUCE_CONDITIONS.has(cond.name.toLowerCase())) {
            return { ...cond, value: cond.value - 1 };
          }
          return cond;
        })
        .filter(cond => cond.value == null || cond.value > 0);
      if (updated.length !== ending.conditions.length || updated.some((c, i) => c.value !== ending.conditions[i]?.value)) {
        onUpdateConditions(ending.uid, updated);
      }
    }
    const next = (activeTurn + 1) % liveCombatCreatures.length;
    if (next === 0) setRound(r => r + 1);
    setActiveTurn(next);
  }

  function applyCondition(uid: string, name: string, value?: number) {
    const creature = enc.creatures.find(c => c.uid === uid);
    if (!creature) return;
    const existing = creature.conditions.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    let next: Condition[];
    if (existing >= 0) {
      next = creature.conditions.map((c, i) => (i === existing ? { ...c, value } : c));
    } else {
      next = [...creature.conditions, { name, value }];
    }
    onUpdateConditions(uid, next);
    setConditionPickerUid(null);
    setConditionPickerAnchor(null);
  }

  function removeCondition(uid: string, condName: string) {
    const creature = enc.creatures.find(c => c.uid === uid);
    if (!creature) return;
    onUpdateConditions(uid, creature.conditions.filter(c => c.name !== condName));
  }

  function commitInit(uid: string) {
    const val = parseInt(editInitVal, 10);
    if (!isNaN(val)) {
      const activeUid = liveCombatCreatures[activeTurn]?.uid;
      setCombatCreatures(prev => {
        const updated = prev
          .map(c => (c.uid === uid ? { ...c, init: val } : c))
          .sort((a, b) => b.init - a.init);
        if (activeUid) {
          const newIdx = updated.findIndex(c => c.uid === activeUid);
          if (newIdx !== -1) setActiveTurn(newIdx);
        }
        return updated;
      });
    }
    setEditingInit(null);
  }

  function commitHp(uid: string) {
    const raw = editHpVal.trim();
    if (raw === '') { setEditingHp(null); return; }
    const relMatch = raw.match(/^([+-])(\d+)$/);
    if (relMatch) {
      // Relative: +4 or -14 → delta from current HP
      const delta = parseInt(relMatch[1] + relMatch[2], 10);
      onUpdateHP(uid, delta);
    } else {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) onSetHP(uid, val);
    }
    setEditingHp(null);
  }

  const handleExportEncounter = async (encounterId: number, encounterName: string) => {
    try {
      const file = await buildEncounterExport(String(encounterId));
      // Sanitize filename: keep alphanumeric, dashes, underscores
      const sanitized = encounterName.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      downloadJson(`encounter-${sanitized}-${dateStr}.json`, file);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className={styles.manager}>
      {/* Encounter tabs */}
      <div className={styles.tabs} ref={tabsRef}>
        <button
          className={styles.openResultsBtn}
          onClick={onToggleResults}
          title={resultsOpen ? 'Hide search results' : 'Show search results'}
          aria-label={resultsOpen ? 'Hide search results' : 'Show search results'}
        >
          {resultsOpen ? '‹‹' : '››'}
        </button>
        <div className={styles.tabsScroll} ref={tabsScrollRef}>
          {encounters.map((en, i) => (
            <div
              key={en.id}
              ref={el => { if (el) tabWrapperRefs.current.set(i, el); else tabWrapperRefs.current.delete(i); }}
              className={`${styles.tabWrapper} ${i === activeEnc ? styles.tabWrapperActive : ''} ${dragOverIdx === i ? styles.tabWrapperDragOver : ''}`}
              draggable={renamingTab !== i}
              onDragStart={() => setDragTabIdx(i)}
              onDragEnd={() => { setDragTabIdx(null); setDragOverIdx(null); }}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(i); }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => {
                if (dragTabIdx !== null && dragTabIdx !== i) {
                  onReorderEncounters(dragTabIdx, i);
                }
                setDragTabIdx(null);
                setDragOverIdx(null);
              }}
            >
              {renamingTab === i ? (
                <input
                  className={styles.tabRenameInput}
                  value={renameVal}
                  autoFocus
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => {
                    if (renameVal.trim()) onRenameEncounter(i, renameVal.trim());
                    setRenamingTab(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (renameVal.trim()) onRenameEncounter(i, renameVal.trim());
                      setRenamingTab(null);
                    }
                    if (e.key === 'Escape') setRenamingTab(null);
                  }}
                />
              ) : (
                <button
                  className={`${styles.tab} ${i === activeEnc ? styles.tabActive : ''}`}
                  onClick={() => onActiveEncChange(i)}
                  onDoubleClick={e => { e.preventDefault(); setRenamingTab(i); setRenameVal(en.name); }}
                  title="Double-click to rename"
                >
                  {en.name}
                </button>
              )}
              {confirmDeleteTab === i ? (
                <span className={styles.tabDeleteConfirm}>
                  <button className={styles.tabDeleteYes} onClick={() => { onDeleteEncounter(i); setConfirmDeleteTab(null); }}>✓</button>
                  <button className={styles.tabDeleteNo} onClick={() => setConfirmDeleteTab(null)}>✕</button>
                </span>
              ) : (
                i === activeEnc && (
                  <>
                    <button
                      className={styles.tabExportBtn}
                      onClick={() => handleExportEncounter(en.id, en.name)}
                      title="Export encounter"
                    >
                      💾
                    </button>
                    {encounters.length > 1 && (
                      <button
                        className={styles.tabDeleteBtn}
                        onClick={() => setConfirmDeleteTab(i)}
                        title="Delete encounter"
                      >
                        ×
                      </button>
                    )}
                  </>
                )
              )}
            </div>
          ))}
        </div>
        <button className={styles.addTabBtn} onClick={onAddEncounter} title="New encounter">
          ＋
        </button>
      </div>

      {!combatMode ? (
        <>
          {/* XP Budget */}
          <div className={styles.budget}>
            <div className={styles.budgetHeader}>
              <span className={styles.sectionLabel}>Budget</span>
              <span className={styles.xpTotal}>{totalXP} XP</span>
              <span className={styles.diffLabel} style={{ color: diff.color }}>
                {diff.label}
              </span>
            </div>
            <div className={styles.budgetBar}>
              <div
                className={styles.budgetFill}
                style={{ width: `${Math.min(100, diff.pct)}%`, background: diff.color }}
              />
            </div>
            <div className={styles.partyRow}>
              <div className={styles.partyControls}>
                <span className={styles.partyLabel}>Party</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => onPartySizeChange(Math.max(1, partySize - 1))}
                >
                  −
                </button>
                <span className={styles.partyVal}>{partySize}</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => onPartySizeChange(Math.min(8, partySize + 1))}
                >
                  +
                </button>
                <div className={styles.partyLvlGroup}>
                  <span className={styles.partyLabel}>× Lvl</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => onPartyLevelChange(Math.max(1, partyLevel - 1))}
                  >
                    −
                  </button>
                  <span className={styles.partyVal}>{partyLevel}</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => onPartyLevelChange(Math.min(20, partyLevel + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                ref={pickerBtnRef}
                className={styles.partyPickerBtn}
                onClick={() => setPickerOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
              >
                {activeParty ? activeParty.name : 'Party…'}
                <span className={styles.caret}>&#9660;</span>
              </button>
              {pickerOpen && (
                <PartyPickerMenu
                  parties={parties}
                  activePartyId={activePartyId}
                  anchorRef={pickerBtnRef}
                  onCreate={() => { setPickerOpen(false); onOpenPartyEditor?.(null); }}
                  onUse={(p) => { setPickerOpen(false); onApplyParty?.(p); }}
                  onInsert={(p) => { setPickerOpen(false); onInsertPartyAsCreatures?.(p); }}
                  onEdit={(p) => { setPickerOpen(false); onOpenPartyEditor?.(p.id); }}
                  onDetach={() => { setPickerOpen(false); onSetActivePartyId?.(null); }}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
          </div>

          {/* Creature list */}
          <div className={styles.creatureList}>
            <div className={styles.sectionLabel}>Creatures ({enc.creatures.length})</div>
            {enc.creatures.length === 0 && (
              <div className={styles.emptyHint}>
                Click <strong>+</strong> on any creature to add it
              </div>
            )}
            {enc.creatures.map(c => {
              const effectiveBaseLevel = c.scaledLevel ?? c.level;
              const effLevel = eliteWeakLevel(effectiveBaseLevel, c.eliteWeak);
              const xp = (c.custom && c.isEnemy === false) ? 0 : xpFor(effLevel, partyLevel);
              const ewMod = c.eliteWeak === 'elite' ? 2 : c.eliteWeak === 'weak' ? -2 : 0;
              const ewValStyle = c.eliteWeak === 'elite'
                ? { color: '#8a6a18', fontWeight: 700 } as const
                : c.eliteWeak === 'weak'
                  ? { color: '#2a5a8a', fontWeight: 700 } as const
                  : undefined;
              const effAc   = c.ac > 0   ? c.ac + ewMod       : null;
              const effFort = c.fort != null ? c.fort + ewMod  : null;
              const effRef  = c.ref  != null ? c.ref  + ewMod  : null;
              const effWill = c.will != null ? c.will + ewMod  : null;
              const effMaxHp = c.maxHp > 0 ? c.maxHp : null;
              const hpDelta = c.eliteWeak && c.baseMaxHp != null ? c.maxHp - c.baseMaxHp : 0;
              return (
                <div
                  key={c.uid}
                  className={`${styles.plannerCard} ${selectedEncounterUid === c.uid ? styles.plannerCardSelected : ''}`}
                  onClick={() => {
                    if (c.creatureId) onSelectCreature(c.creatureId, c.uid);
                    else onSelectEncounterCreature(c.uid);
                  }}
                  title={c.creatureId ? 'View statblock' : undefined}
                  style={{ cursor: c.creatureId ? 'pointer' : 'default' }}
                >
                  {/* Top row: name + HP + buttons */}
                  <div className={styles.plannerCardTop}>
                    {editingName === c.uid ? (
                      <input
                        className={styles.nameInput}
                        value={editNameVal}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onChange={e => setEditNameVal(e.target.value)}
                        onBlur={() => commitName(c.uid)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.stopPropagation(); commitName(c.uid); }
                          if (e.key === 'Escape') setEditingName(null);
                        }}
                      />
                    ) : (
                      <span
                        className={`${styles.plannerName} ${c.creatureId ? styles.creatureNameClickable : ''}`}
                        title="Double-click to rename"
                        onDoubleClick={e => { e.preventDefault(); e.stopPropagation(); setEditingName(c.uid); setEditNameVal(c.name); }}
                      >
                        {c.name}{c.eliteWeak === 'elite' ? ' (Elite)' : c.eliteWeak === 'weak' ? ' (Weak)' : ''}
                      </span>
                    )}
                    <span className={styles.plannerHp} title="Hit Points">
                      <span className={styles.combatDefLabel}>HP</span>
                      <span className={styles.combatDefVal} style={hpDelta !== 0 ? ewValStyle : undefined}>
                        {effMaxHp != null ? effMaxHp : '—'}
                      </span>
                    </span>
                    <div className={styles.plannerBtns}>
                      <button
                        className={styles.duplicateBtn}
                        onClick={e => { e.stopPropagation(); onDuplicateCreature(c.uid); }}
                        title="Duplicate creature"
                      >
                        ⧉
                      </button>
                      <button
                        className={styles.removeBtn}
                        onClick={e => { e.stopPropagation(); onRemoveCreature(c.uid); }}
                        title="Remove from encounter"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Defense stats row — never wraps */}
                  <div className={styles.plannerDefenseRow}>
                    <span className={styles.combatDefStat} title="Armor Class">
                      <span className={styles.combatDefLabel}>AC</span>
                      <span className={styles.combatDefVal} style={ewMod !== 0 && effAc != null ? ewValStyle : undefined}>
                        {effAc != null ? effAc : '—'}
                      </span>
                    </span>
                    <span className={styles.combatDefStat} title="Fortitude">
                      <span className={styles.combatDefLabel}>F</span>
                      <span className={styles.combatDefVal} style={ewMod !== 0 && effFort != null ? ewValStyle : undefined}>
                        {effFort != null ? (effFort >= 0 ? `+${effFort}` : effFort) : '—'}
                      </span>
                    </span>
                    <span className={styles.combatDefStat} title="Reflex">
                      <span className={styles.combatDefLabel}>R</span>
                      <span className={styles.combatDefVal} style={ewMod !== 0 && effRef != null ? ewValStyle : undefined}>
                        {effRef != null ? (effRef >= 0 ? `+${effRef}` : effRef) : '—'}
                      </span>
                    </span>
                    <span className={styles.combatDefStat} title="Will">
                      <span className={styles.combatDefLabel}>W</span>
                      <span className={styles.combatDefVal} style={ewMod !== 0 && effWill != null ? ewValStyle : undefined}>
                        {effWill != null ? (effWill >= 0 ? `+${effWill}` : effWill) : '—'}
                      </span>
                    </span>
                    {(() => {
                      const effPer = c.perception != null ? c.perception + ewMod : null;
                      return (
                        <span className={styles.combatDefStat} title={c.isHazard ? 'Stealth (initiative)' : 'Perception'}>
                          <span className={styles.combatDefLabel}>{c.isHazard ? 'Ste' : 'Per'}</span>
                          <span className={styles.combatDefVal} style={ewMod !== 0 && effPer != null ? ewValStyle : undefined}>
                            {effPer != null ? (effPer >= 0 ? `+${effPer}` : effPer)
                              : c.isHazard && c.stealthMod != null ? (c.stealthMod >= 0 ? `+${c.stealthMod}` : c.stealthMod)
                              : '—'}
                          </span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Bottom row: level/XP + Elite/Weak toggle buttons */}
                  <div className={styles.plannerMetaRow}>
                    <span className={styles.plannerMeta}>
                      {c.scaledLevel != null
                        ? <><span className={styles.scaledBadge} title={`Scaled from level ${c.level}`}>⇅ Lv {effLevel}</span>{` (base ${c.level})`}</>
                        : <>Lvl {effLevel}{c.eliteWeak ? ` (base ${c.level})` : ''}</>
                      }
                      {xp > 0 ? ` · ${xp} XP` : ''}
                    </span>
                    <div className={styles.eliteWeakBtns} onClick={e => e.stopPropagation()}>
                      <button
                        className={`${styles.eliteBtn} ${c.eliteWeak === 'elite' ? styles.eliteBtnActive : ''}`}
                        title="Elite adjustment (+1 level, +2 AC/saves/skills, +HP)"
                        onClick={e => {
                          e.stopPropagation();
                          onSetEliteWeak(c.uid, c.eliteWeak === 'elite' ? undefined : 'elite');
                        }}
                      >
                        Elite
                      </button>
                      <button
                        className={`${styles.weakBtn} ${c.eliteWeak === 'weak' ? styles.weakBtnActive : ''}`}
                        title="Weak adjustment (−1 level, −2 AC/saves/skills, −HP)"
                        onClick={e => {
                          e.stopPropagation();
                          onSetEliteWeak(c.uid, c.eliteWeak === 'weak' ? undefined : 'weak');
                        }}
                      >
                        Weak
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {showCustomForm
              ? (
                <QuickCreatureForm
                  partyLevel={partyLevel}
                  onAdd={(...args) => { onAddCustomCreature(...args); setShowCustomForm(false); }}
                  onCancel={() => setShowCustomForm(false)}
                />
              ) : (
                <button
                  className={styles.addPlaceholderBtn}
                  onClick={() => setShowCustomForm(true)}
                >
                  ＋ Add Placeholder Creature
                </button>
              )}
          </div>

          {enc.creatures.length > 0 && (
            <div className={styles.startCombatRow}>
              <button className={styles.startCombatBtn} onClick={startCombat}>
                ▶ Start Combat
              </button>
            </div>
          )}
        </>
      ) : (
        /* Combat tracker */
        <div className={styles.combat}>
          <div className={styles.combatHeader} ref={combatHeaderCallbackRef}>
            <span className={styles.roundLabel}>{combatHeaderNarrow ? `Rnd ${round}` : `Round ${round}`}</span>
            <button className={styles.nextTurnBtn} onClick={nextTurn}>
              {combatHeaderNarrow ? 'Next' : 'Next Turn'}
            </button>
            <button className={styles.endCombatBtn} onClick={endCombat}>
              {combatHeaderNarrow ? '✕' : '✕ End'}
            </button>
          </div>
          <div
            className={styles.combatList}
            onDragOver={e => {
              if (readDndPayload(e)) e.preventDefault();
            }}
            onDrop={async e => {
              e.preventDefault();
              const parsed = readDndPayload(e);
              if (!parsed) return;
              // Card-level handler takes precedence when dropping on a card.
              // This list-level handler only fires for drops in empty space.
              if (parsed.kind === 'creatureRecord') {
                try {
                  const record = await creatureRepository.get(parsed.payload.creatureId);
                  if (record) {
                    if (onAddCreatureRecord) onAddCreatureRecord(record);
                    else onSelectCreature(parsed.payload.creatureId, '');
                  }
                } catch (err) {
                  console.error('Drop error:', err);
                }
              }
            }}
          >
            {liveCombatCreatures.map((c, i) => {
              const isActive = i === activeTurn;
              const combatEwMod = c.eliteWeak === 'elite' ? 2 : c.eliteWeak === 'weak' ? -2 : 0;
              const hpPct = c.maxHp > 0 ? c.hp / c.maxHp : 0;
              const hpColor =
                hpPct > 0.5 ? '#3a7a3a' : hpPct > 0.25 ? '#8a6a18' : '#8a2a18';
              // Helper: open this creature's statblock (works for DB creatures only)
              const openStatblock = () => {
                if (c.creatureId) onSelectCreature(c.creatureId, c.uid);
              };

              // Only block drag on the card whose own edit input is open —
              // editing another card should not freeze this card's drag handle.
              const isEditingThisCard =
                editingInit === c.uid || editingHp === c.uid || editingName === c.uid;
              const isDraggable = !isEditingThisCard;
              const isDragging = draggingUid === c.uid;
              const showDropAbove = dragOver?.uid === c.uid && dragOver.position === 'above';
              const showDropBelow = dragOver?.uid === c.uid && dragOver.position === 'below';

              const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
                if (!isDraggable) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer!.effectAllowed = 'move';
                writeDndPayload(e.dataTransfer!, { kind: 'combatant', payload: { uid: c.uid } });
                setDraggingUid(c.uid);
              };

              const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
                if (!readDndPayload(e)) return;
                e.preventDefault();

                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const position = e.clientY < midpoint ? 'above' : 'below';

                setDragOver({ uid: c.uid, position });
              };

              const handleDragLeave = () => {
                setDragOver(null);
              };

              const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                const parsed = readDndPayload(e);
                if (!parsed) { setDragOver(null); return; }

                const targetIdx = liveCombatCreatures.findIndex(cr => cr.uid === c.uid);
                const position = dragOver?.position ?? 'below';
                const insertIdx = position === 'above' ? targetIdx : targetIdx + 1;

                if (parsed.kind === 'combatant' && parsed.payload.uid !== c.uid) {
                  const draggedIdx = liveCombatCreatures.findIndex(cr => cr.uid === parsed.payload.uid);
                  if (draggedIdx === -1) { setDragOver(null); return; }

                  const withoutDragged = liveCombatCreatures.filter((_, i) => i !== draggedIdx);
                  // After removal, indices ≥ draggedIdx shift left by one.
                  const adjustedIdx = insertIdx > draggedIdx ? insertIdx - 1 : insertIdx;
                  const clampedIdx = Math.max(0, Math.min(adjustedIdx, withoutDragged.length));
                  const newInit = computeInitForDrop(withoutDragged, clampedIdx);

                  const dragged = liveCombatCreatures[draggedIdx]!;
                  const updated = [
                    ...withoutDragged.slice(0, clampedIdx),
                    { ...dragged, init: newInit },
                    ...withoutDragged.slice(clampedIdx),
                  ].sort((a, b) => b.init - a.init);

                  // Chase the active creature by uid, not by index.
                  const activeUid = liveCombatCreatures[activeTurn]?.uid;
                  if (activeUid) {
                    const newIdx = updated.findIndex(cr => cr.uid === activeUid);
                    if (newIdx !== -1) setActiveTurn(newIdx);
                  }

                  setCombatCreatures(updated);
                  onSetCreatureInit?.(dragged.uid, newInit);
                } else if (parsed.kind === 'creatureRecord' && onAddCreatureRecord) {
                  // Add to encounter; the watcher effect on `enc.creatures` will
                  // assign an auto-rolled initiative and re-sort. Precise drop-
                  // position init is a follow-up: addToEncounter is sync but the
                  // new combatant only lands in `combatCreatures` on the next
                  // effect tick, so we can't reliably target it here without
                  // tracking its uid.
                  try {
                    const record = await creatureRepository.get(parsed.payload.creatureId);
                    if (record) onAddCreatureRecord(record);
                  } catch (err) {
                    console.error('Drop error:', err);
                  }
                }

                setDragOver(null);
              };

              return (
                <div
                  key={c.uid}
                  className={`${styles.combatCard} ${isActive ? styles.combatCardActive : ''} ${c.creatureId ? styles.combatCardClickable : ''} ${selectedEncounterUid === c.uid ? styles.combatCardSelected : ''} ${isDragging ? styles.dragging : ''} ${showDropAbove ? styles.dropAbove : ''} ${showDropBelow ? styles.dropBelow : ''}`}
                  onClick={c.creatureId ? openStatblock : undefined}
                  title={c.creatureId ? 'Click to view statblock' : undefined}
                  draggable={isDraggable}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={() => setDraggingUid(null)}
                >
                  {/* Row 1: init badge · name · hp */}
                  <div className={styles.combatCardTop}>
                    {editingInit === c.uid ? (
                      <input
                        className={styles.initInput}
                        type="number"
                        value={editInitVal}
                        autoFocus
                        onChange={e => setEditInitVal(e.target.value)}
                        onBlur={() => commitInit(c.uid)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitInit(c.uid);
                          if (e.key === 'Escape') setEditingInit(null);
                        }}
                      />
                    ) : (
                      <div
                        className={`${styles.initBadge} ${isActive ? styles.initBadgeActive : ''} ${styles.initBadgeClickable}`}
                        title="Click to edit initiative"
                        onClick={e => { e.stopPropagation(); setEditingInit(c.uid); setEditInitVal(String(c.init)); }}
                      >
                        {c.init}
                      </div>
                    )}

                    {editingName === c.uid ? (
                      <input
                        className={styles.nameInput}
                        value={editNameVal}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onChange={e => setEditNameVal(e.target.value)}
                        onBlur={() => commitName(c.uid)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.stopPropagation(); commitName(c.uid); }
                          if (e.key === 'Escape') setEditingName(null);
                        }}
                      />
                    ) : (
                      <span
                        className={`${styles.combatName} ${isActive ? styles.combatNameActive : ''}`}
                        title="Double-click to rename"
                        onDoubleClick={e => { e.preventDefault(); e.stopPropagation(); setEditingName(c.uid); setEditNameVal(c.name); }}
                      >
                        {c.name}{c.eliteWeak === 'elite' ? ' (Elite)' : c.eliteWeak === 'weak' ? ' (Weak)' : ''}
                      </span>
                    )}

                    {/* HP — on the same row as the name */}
                    {editingHp === c.uid ? (
                      <input
                        className={styles.hpInput}
                        type="text"
                        value={editHpVal}
                        autoFocus
                        placeholder={String(c.hp)}
                        onChange={e => setEditHpVal(e.target.value)}
                        onFocus={e => e.target.select()}
                        onClick={e => e.stopPropagation()}
                        onBlur={() => commitHp(c.uid)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitHp(c.uid);
                          if (e.key === 'Escape') setEditingHp(null);
                        }}
                      />
                    ) : (
                      <span
                        className={`${styles.hpDisplay} ${styles.hpDisplayClickable}`}
                        style={{ color: hpColor }}
                        title="Click to set HP; type +4 or -14 for relative change"
                        onClick={e => { e.stopPropagation(); setEditingHp(c.uid); setEditHpVal(''); }}
                      >
                        {c.hp}/{c.maxHp}
                      </span>
                    )}
                  </div>

                  {/* Row 2: defense stats — always a single unwrapped line */}
                  {(() => {
                    const pen = computePenalties(c.conditions);
                    const effAc   = c.ac > 0 ? c.ac + pen.ac + combatEwMod : null;
                    const effFort = c.fort != null ? c.fort + pen.fort + combatEwMod : null;
                    const effRef  = c.ref  != null ? c.ref  + pen.ref  + combatEwMod : null;
                    const effWill = c.will != null ? c.will + pen.will + combatEwMod : null;
                    // Hazards use stealthMod for initiative; creatures use perception.
                    // Elite/weak applies to perception on creatures (not hazards).
                    const effPer  = c.isHazard
                      ? (c.stealthMod ?? null)
                      : c.perception != null ? c.perception + combatEwMod : null;
                    const perLabel = c.isHazard ? 'Ste' : 'Per';
                    const perTitle = c.isHazard ? 'Stealth (initiative) · right-click to input' : 'Perception · right-click to input';
                    const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;
                    const combatEwStyle = combatEwMod > 0
                      ? { color: '#8a6a18', fontWeight: 700 } as const
                      : { color: '#2a5a8a', fontWeight: 700 } as const;
                    return (
                      <div className={styles.combatDefenseRow}>
                        <span
                          className={styles.combatDefStat}
                          title="Armor Class"
                          onClick={effAc != null ? e => { e.stopPropagation(); openStatblock(); setDiceRoll({ expr: `1d20`, label: 'Armor Class', x: e.clientX, y: e.clientY - 160 }); } : e => e.stopPropagation()}
                        >
                          <span className={styles.combatDefLabel}>AC</span>
                          <span className={styles.combatDefVal} style={pen.ac !== 0 ? debuffStyle : combatEwMod !== 0 && effAc != null ? combatEwStyle : undefined}>
                            {effAc != null ? effAc : '—'}
                          </span>
                        </span>
                        <span
                          className={styles.combatDefStat}
                          title="Fortitude · right-click to input"
                          onClick={effFort != null ? e => { e.stopPropagation(); openStatblock(); setDiceRoll({ expr: `1d20${effFort >= 0 ? `+${effFort}` : effFort}`, label: `${c.name} · Fortitude`, x: e.clientX, y: e.clientY - 160 }); } : e => e.stopPropagation()}
                          onContextMenu={effFort != null ? e => { e.preventDefault(); e.stopPropagation(); setManualRoll({ expr: `1d20${effFort >= 0 ? `+${effFort}` : effFort}`, label: `${c.name} · Fortitude`, x: e.clientX, y: e.clientY - 160 }); } : undefined}
                        >
                          <span className={styles.combatDefLabel}>F</span>
                          <span className={styles.combatDefVal} style={pen.fort !== 0 ? debuffStyle : combatEwMod !== 0 && effFort != null ? combatEwStyle : undefined}>
                            {effFort != null ? (effFort >= 0 ? `+${effFort}` : effFort) : '—'}
                          </span>
                        </span>
                        <span
                          className={styles.combatDefStat}
                          title="Reflex · right-click to input"
                          onClick={effRef != null ? e => { e.stopPropagation(); openStatblock(); setDiceRoll({ expr: `1d20${effRef >= 0 ? `+${effRef}` : effRef}`, label: `${c.name} · Reflex`, x: e.clientX, y: e.clientY - 160 }); } : e => e.stopPropagation()}
                          onContextMenu={effRef != null ? e => { e.preventDefault(); e.stopPropagation(); setManualRoll({ expr: `1d20${effRef >= 0 ? `+${effRef}` : effRef}`, label: `${c.name} · Reflex`, x: e.clientX, y: e.clientY - 160 }); } : undefined}
                        >
                          <span className={styles.combatDefLabel}>R</span>
                          <span className={styles.combatDefVal} style={pen.ref !== 0 ? debuffStyle : combatEwMod !== 0 && effRef != null ? combatEwStyle : undefined}>
                            {effRef != null ? (effRef >= 0 ? `+${effRef}` : effRef) : '—'}
                          </span>
                        </span>
                        <span
                          className={styles.combatDefStat}
                          title="Will · right-click to input"
                          onClick={effWill != null ? e => { e.stopPropagation(); openStatblock(); setDiceRoll({ expr: `1d20${effWill >= 0 ? `+${effWill}` : effWill}`, label: `${c.name} · Will`, x: e.clientX, y: e.clientY - 160 }); } : e => e.stopPropagation()}
                          onContextMenu={effWill != null ? e => { e.preventDefault(); e.stopPropagation(); setManualRoll({ expr: `1d20${effWill >= 0 ? `+${effWill}` : effWill}`, label: `${c.name} · Will`, x: e.clientX, y: e.clientY - 160 }); } : undefined}
                        >
                          <span className={styles.combatDefLabel}>W</span>
                          <span className={styles.combatDefVal} style={pen.will !== 0 ? debuffStyle : combatEwMod !== 0 && effWill != null ? combatEwStyle : undefined}>
                            {effWill != null ? (effWill >= 0 ? `+${effWill}` : effWill) : '—'}
                          </span>
                        </span>
                        <span
                          className={styles.combatDefStat}
                          title={perTitle}
                          onClick={effPer != null ? e => { e.stopPropagation(); openStatblock(); setDiceRoll({ expr: `1d20${effPer >= 0 ? `+${effPer}` : effPer}`, label: `${c.name} · ${c.isHazard ? 'Stealth' : 'Perception'}`, x: e.clientX, y: e.clientY - 160 }); } : e => e.stopPropagation()}
                          onContextMenu={effPer != null ? e => { e.preventDefault(); e.stopPropagation(); setManualRoll({ expr: `1d20${effPer >= 0 ? `+${effPer}` : effPer}`, label: `${c.name} · ${c.isHazard ? 'Stealth' : 'Perception'}`, x: e.clientX, y: e.clientY - 160 }); } : undefined}
                        >
                          <span className={styles.combatDefLabel}>{perLabel}</span>
                          <span className={styles.combatDefVal} style={!c.isHazard && combatEwMod !== 0 && effPer != null ? combatEwStyle : undefined}>
                            {effPer != null ? (effPer >= 0 ? `+${effPer}` : effPer) : '—'}
                          </span>
                        </span>
                      </div>
                    );
                  })()}

                  {/* Attacks */}
                  {c.attacks && c.attacks.length > 0 && (
                    <div className={styles.combatAttacks}>
                      {c.attacks.map((atk, ai) => {
                        const traits = atk.traits ?? [];
                        const atkRollPen = computeAttackPenalty(c.conditions, atk.type, traits, c.strMod, c.dexMod);
                        const dmgPen = computeDamagePenalty(c.conditions, atk.type, traits);
                        const effBonus = atk.bonus + atkRollPen;
                        // Build a damage expression adjusted by flat enfeebled penalty
                        const dmgExpr = dmgPen !== 0
                          ? `${atk.damage}${dmgPen >= 0 ? `+${dmgPen}` : dmgPen}`
                          : atk.damage;
                        return (
                          <div key={ai} className={styles.combatAtkRow}>
                            <span className={styles.combatAtkIcon}>{atk.type === 'melee' ? '⚔' : '🏹'}</span>
                            <span
                              className={`${styles.combatAtkName} ${styles.rollable}`}
                              title="Click to roll attack · right-click to input"
                              onClick={e => { e.stopPropagation(); setDiceRoll({ expr: `1d20${effBonus >= 0 ? `+${effBonus}` : effBonus}`, label: `${c.name} · ${atk.name}`, x: e.clientX, y: e.clientY - 160 }); }}
                              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setManualRoll({ expr: `1d20${effBonus >= 0 ? `+${effBonus}` : effBonus}`, label: `${c.name} · ${atk.name}`, x: e.clientX, y: e.clientY - 160 }); }}
                              style={atkRollPen !== 0 ? { color: '#c0392b' } : undefined}
                            >
                              {atk.name} {effBonus >= 0 ? `+${effBonus}` : effBonus}
                            </span>
                            <span
                              className={`${styles.combatAtkDmg} ${styles.rollable}`}
                              title="Click to roll damage · right-click to input"
                              onClick={e => { e.stopPropagation(); setDiceRoll({ expr: dmgExpr, label: `${c.name} · ${atk.name} dmg`, x: e.clientX, y: e.clientY - 160 }); }}
                              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setManualRoll({ expr: dmgExpr, label: `${c.name} · ${atk.name} dmg`, x: e.clientX, y: e.clientY - 160 }); }}
                              style={dmgPen !== 0 ? { color: '#c0392b' } : undefined}
                            >
                              {dmgExpr}
                            </span>
                            {atk.range != null && <span className={styles.combatAtkRange}>{atk.range}ft</span>}
                            {traits.length > 0 && (
                              <span className={styles.combatAtkTraits}>{traits.join(', ')}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Abilities */}
                  {c.abilities && c.abilities.length > 0 && (
                    <div className={styles.combatAbilities}>
                      {c.abilities.map((ab, ai) => (
                        <span key={ai} className={styles.combatAbilityChip} title={ab.description || undefined}>
                          {ab.actionType === 'single' && <span className={styles.actionIcon}>◆</span>}
                          {ab.actionType === 'two' && <span className={styles.actionIcon}>◆◆</span>}
                          {ab.actionType === 'three' && <span className={styles.actionIcon}>◆◆◆</span>}
                          {ab.actionType === 'reaction' && <span className={styles.actionIcon}>↺</span>}
                          {ab.actionType === 'free' && <span className={styles.actionIcon}>⟳</span>}
                          {ab.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Conditions */}
                  <div className={styles.conditionRow}>
                    {c.conditions.map(cond => {
                      const isValued = cond.value != null;
                      return (
                        <span
                          key={cond.name}
                          className={styles.conditionChip}
                          title={isValued ? `Left-click to edit · Right-click to remove` : `Click to remove`}
                          onClick={e => {
                            e.stopPropagation();
                            if (isValued) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom - 4;
                              const spaceAbove = rect.top - 4;
                              setConditionPickerUid(c.uid);
                              setConditionPickerAnchor({
                                x: rect.left,
                                y: rect.bottom + 4,
                                top: rect.top,
                                spaceBelow,
                                spaceAbove,
                              });
                              setConditionPickerInitial({ name: cond.name, value: cond.value! });
                            } else {
                              removeCondition(c.uid, cond.name);
                            }
                          }}
                          onContextMenu={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeCondition(c.uid, cond.name);
                          }}
                        >
                          {cond.name}{cond.value != null ? ` ${cond.value}` : ''}
                          {isValued ? ' ✎' : ' ×'}
                        </span>
                      );
                    })}
                    <button
                      className={styles.addConditionBtn}
                      onClick={e => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom - 4;
                        const spaceAbove = rect.top - 4;
                        setConditionPickerUid(c.uid);
                        setConditionPickerAnchor({
                          x: rect.left,
                          y: rect.bottom + 4,
                          top: rect.top,
                          spaceBelow,
                          spaceAbove,
                        });
                        setConditionPickerInitial(undefined);
                      }}
                      title="Add condition"
                    >
                      + cond
                    </button>
                  </div>
                  <div className={styles.hpBar}>
                    <div
                      className={styles.hpFill}
                      style={{ width: `${hpPct * 100}%`, background: hpColor }}
                    />
                  </div>
                  <div className={styles.hpBtns}>
                    {([-10, -5, -1, 1, 5, 10] as const).map(v => (
                      <button
                        key={v}
                        className={`${styles.hpBtn} ${v > 0 ? styles.hpBtnHeal : styles.hpBtnDmg}`}
                        onClick={e => { e.stopPropagation(); onUpdateHP(c.uid, v); }}
                      >
                        {v > 0 ? `+${v}` : v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Add creatures during combat */}
            {showCustomForm
              ? (
                <QuickCreatureForm
                  partyLevel={partyLevel}
                  onAdd={(...args) => { onAddCustomCreature(...args); setShowCustomForm(false); }}
                  onCancel={() => setShowCustomForm(false)}
                />
              ) : (
                <button
                  className={styles.addPlaceholderBtn}
                  onClick={() => setShowCustomForm(true)}
                >
                  ＋ Add Placeholder Creature
                </button>
              )}
          </div>
        </div>
      )}

      {diceRoll && (
        <DiceRoller
          expression={diceRoll.expr}
          label={diceRoll.label}
          anchorX={diceRoll.x}
          anchorY={diceRoll.y}
          onClose={() => setDiceRoll(null)}
          onRoll={onRoll}
        />
      )}
      {manualRoll && (
        <ManualRollInput
          expression={manualRoll.expr}
          label={manualRoll.label}
          anchorX={manualRoll.x}
          anchorY={manualRoll.y}
          onClose={() => setManualRoll(null)}
          onRoll={onRoll}
        />
      )}

      {/* ── Condition picker ── */}
      {conditionPickerUid && conditionPickerAnchor && (
        <ConditionPicker
          uid={conditionPickerUid}
          anchor={conditionPickerAnchor}
          initialCondition={conditionPickerInitial}
          onClose={() => {
            setConditionPickerUid(null);
            setConditionPickerAnchor(null);
            setConditionPickerInitial(undefined);
          }}
          onApply={(name, value) => {
            applyCondition(conditionPickerUid, name, value);
            setConditionPickerInitial(undefined);
          }}
        />
      )}
    </div>
  );
}
