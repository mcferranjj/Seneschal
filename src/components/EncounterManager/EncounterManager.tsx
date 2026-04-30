import { useEffect, useState } from 'react';
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
  return 10;
}

function getDifficulty(adjXP: number) {
  if (adjXP >= 120) return { label: 'Extreme', color: '#8a2a18', pct: 100 };
  if (adjXP >= 80) return { label: 'Severe', color: '#8a5a18', pct: (adjXP / 120) * 100 };
  if (adjXP >= 60) return { label: 'Moderate', color: '#6a7a18', pct: (adjXP / 120) * 100 };
  if (adjXP >= 40) return { label: 'Low', color: '#3a6a5a', pct: (adjXP / 120) * 100 };
  return { label: 'Trivial', color: '#5a7a3a', pct: (adjXP / 120) * 100 };
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

  const enc = encounters[activeEnc] ?? encounters[0];

  // Reset combat when switching encounters
  useEffect(() => {
    setCombatMode(false);
    setRound(1);
    setActiveTurn(0);
    setCombatCreatures([]);
  }, [activeEnc]);

  const rawXP = enc.creatures.reduce((s, c) => s + xpFor(c.level, partyLevel), 0);
  const adjXP = Math.round(rawXP * (4 / partySize));
  const diff = getDifficulty(adjXP);

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
              <span className={styles.xpTotal}>{adjXP} XP</span>
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
                    <div className={`${styles.initBadge} ${isActive ? styles.initBadgeActive : ''}`}>
                      {c.init}
                    </div>
                    <div className={styles.combatCreatureInfo}>
                      <span
                        className={`${styles.combatName} ${isActive ? styles.combatNameActive : ''}`}
                      >
                        {c.name}
                        {isActive && <span className={styles.activePill}>ACTIVE</span>}
                      </span>
                      <span className={styles.combatAC}>AC {c.ac}</span>
                    </div>
                    <span className={styles.hpDisplay} style={{ color: hpColor }}>
                      {c.hp}/{c.maxHp}
                    </span>
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
          </div>
        </div>
      )}
    </div>
  );
}
