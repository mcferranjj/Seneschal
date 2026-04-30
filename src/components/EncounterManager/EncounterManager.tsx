import { useEffect, useRef, useState } from 'react';
import type { Encounter, EncounterCreature } from '../../types/encounter';
import styles from './EncounterManager.module.css';

interface CombatCreature extends EncounterCreature {
  init: number;
}

interface EncounterManagerProps {
  encounters: Encounter[];
  activeEnc: number;
  partySize: number;
  partyLevel: number;
  onActiveEncChange: (idx: number) => void;
  onPartySizeChange: (size: number) => void;
  onPartyLevelChange: (level: number) => void;
  onAddEncounter: () => void;
  onRemoveCreature: (uid: string) => void;
  onUpdateHP: (uid: string, delta: number) => void;
  onAddCustomCreature: (name: string, level: number) => void;
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
  onRemoveCreature,
  onUpdateHP,
  onAddCustomCreature,
}: EncounterManagerProps) {
  const [combatMode, setCombatMode] = useState(false);
  const [round, setRound] = useState(1);
  const [activeTurn, setActiveTurn] = useState(0);
  const [combatCreatures, setCombatCreatures] = useState<CombatCreature[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLevel, setCustomLevel] = useState(1);

  // Inline editing
  const [editingInit, setEditingInit] = useState<string | null>(null);
  const [editInitVal, setEditInitVal] = useState('');
  const [editingHp, setEditingHp] = useState<string | null>(null);
  const [editHpVal, setEditHpVal] = useState('');

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
      .map(c => ({ ...c, init: Math.floor(Math.random() * 20) + 1 }));
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

  const totalXP = enc.creatures.reduce((s, c) => s + xpFor(c.level, partyLevel), 0);
  const diff = getDifficulty(totalXP, partySize);

  // During combat, look up live HP from encounter state
  const liveCombatCreatures: CombatCreature[] = combatCreatures.map(cc => {
    const live = enc.creatures.find(c => c.uid === cc.uid);
    return live ? { ...cc, hp: live.hp } : cc;
  });

  function startCombat() {
    const rolled: CombatCreature[] = enc.creatures
      .map(c => ({ ...c, init: Math.floor(Math.random() * 20) + 1 }))
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
    const next = (activeTurn + 1) % liveCombatCreatures.length;
    if (next === 0) setRound(r => r + 1);
    setActiveTurn(next);
  }

  function handleAddCustom() {
    if (!customName.trim()) return;
    onAddCustomCreature(customName.trim(), customLevel);
    setCustomName('');
    setShowCustomForm(false);
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

  function commitHp(uid: string, currentHp: number) {
    const val = parseInt(editHpVal, 10);
    if (!isNaN(val)) {
      onUpdateHP(uid, val - currentHp);
    }
    setEditingHp(null);
  }

  return (
    <div className={styles.manager}>
      {/* Encounter tabs */}
      <div className={styles.tabs}>
        {encounters.map((en, i) => (
          <button
            key={en.id}
            className={`${styles.tab} ${i === activeEnc ? styles.tabActive : ''}`}
            onClick={() => onActiveEncChange(i)}
          >
            {en.name}
          </button>
        ))}
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
              <span className={styles.xpTotal}>{totalXP} XP</span>
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
            {enc.creatures.map(c => (
              <div key={c.uid} className={styles.creatureCard}>
                <div className={styles.creatureInfo}>
                  <span className={styles.creatureName}>{c.name}</span>
                  <span className={styles.creatureMeta}>
                    Lvl {c.level} · {xpFor(c.level, partyLevel)} XP
                  </span>
                </div>
                <button className={styles.removeBtn} onClick={() => onRemoveCreature(c.uid)}>
                  ✕
                </button>
              </div>
            ))}

            {showCustomForm ? (
              <div className={styles.customForm}>
                <div className={styles.sectionLabel}>Custom Creature</div>
                <input
                  className={styles.customInput}
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Name…"
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                />
                <div className={styles.customLevelRow}>
                  <span className={styles.partyLabel}>Level</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => setCustomLevel(l => Math.max(-1, l - 1))}
                  >
                    −
                  </button>
                  <span className={styles.partyVal}>{customLevel}</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => setCustomLevel(l => Math.min(25, l + 1))}
                  >
                    +
                  </button>
                </div>
                <div className={styles.customActions}>
                  <button className={styles.addCustomBtn} onClick={handleAddCustom}>
                    Add
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowCustomForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
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
          <div className={styles.combatHeader}>
            <span className={styles.roundLabel}>Round {round}</span>
            <button className={styles.nextTurnBtn} onClick={nextTurn}>
              Next Turn
            </button>
            <button className={styles.endCombatBtn} onClick={endCombat}>
              ✕ End
            </button>
          </div>
          <div className={styles.combatList}>
            {liveCombatCreatures.map((c, i) => {
              const isActive = i === activeTurn;
              const hpPct = c.maxHp > 0 ? c.hp / c.maxHp : 0;
              const hpColor =
                hpPct > 0.5 ? '#3a7a3a' : hpPct > 0.25 ? '#8a6a18' : '#8a2a18';
              return (
                <div
                  key={c.uid}
                  className={`${styles.combatCard} ${isActive ? styles.combatCardActive : ''}`}
                >
                  <div className={styles.combatCardTop}>
                    {editingInit === c.uid ? (
                      <input
                        className={styles.initInput}
                        type="number"
                        value={editInitVal}
                        autoFocus
                        onChange={e => setEditInitVal(e.target.value)}
                        onBlur={() => commitInit(c.uid)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitInit(c.uid);
                          if (e.key === 'Escape') setEditingInit(null);
                        }}
                      />
                    ) : (
                      <div
                        className={`${styles.initBadge} ${isActive ? styles.initBadgeActive : ''} ${styles.initBadgeClickable}`}
                        title="Click to edit initiative"
                        onClick={() => { setEditingInit(c.uid); setEditInitVal(String(c.init)); }}
                      >
                        {c.init}
                      </div>
                    )}
                    <div className={styles.combatCreatureInfo}>
                      <span
                        className={`${styles.combatName} ${isActive ? styles.combatNameActive : ''}`}
                      >
                        {c.name}
                        {isActive && <span className={styles.activePill}>ACTIVE</span>}
                      </span>
                      <span className={styles.combatAC}>AC {c.ac}</span>
                    </div>
                    {editingHp === c.uid ? (
                      <input
                        className={styles.hpInput}
                        type="number"
                        value={editHpVal}
                        autoFocus
                        onChange={e => setEditHpVal(e.target.value)}
                        onBlur={() => commitHp(c.uid, c.hp)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitHp(c.uid, c.hp);
                          if (e.key === 'Escape') setEditingHp(null);
                        }}
                      />
                    ) : (
                      <span
                        className={`${styles.hpDisplay} ${styles.hpDisplayClickable}`}
                        style={{ color: hpColor }}
                        title="Click to set HP"
                        onClick={() => { setEditingHp(c.uid); setEditHpVal(String(c.hp)); }}
                      >
                        {c.hp}/{c.maxHp}
                      </span>
                    )}
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
                        onClick={() => onUpdateHP(c.uid, v)}
                      >
                        {v > 0 ? `+${v}` : v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Add creatures during combat */}
            {showCustomForm ? (
              <div className={styles.customForm}>
                <div className={styles.sectionLabel}>Add to Combat</div>
                <input
                  className={styles.customInput}
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Name…"
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                />
                <div className={styles.customLevelRow}>
                  <span className={styles.partyLabel}>Level</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => setCustomLevel(l => Math.max(-1, l - 1))}
                  >
                    −
                  </button>
                  <span className={styles.partyVal}>{customLevel}</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => setCustomLevel(l => Math.min(25, l + 1))}
                  >
                    +
                  </button>
                </div>
                <div className={styles.customActions}>
                  <button className={styles.addCustomBtn} onClick={handleAddCustom}>
                    Add
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setShowCustomForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={styles.addPlaceholderBtn}
                onClick={() => setShowCustomForm(true)}
              >
                ＋ Add Creature
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
