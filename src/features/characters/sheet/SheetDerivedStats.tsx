import { useState } from 'react';
import type { CharacterDerivedStats } from '../../../db/schema';
import type { RollHistoryEntry } from '../../../types/diceHistory';
import { DiceRoller } from '../../dice/DiceRoller';
import { formatMod } from '../utils/proficiency';
import styles from './SheetDerivedStats.module.css';

interface SheetDerivedStatsProps {
  derived: CharacterDerivedStats;
  level: number;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
}

export function SheetDerivedStats({ derived, level: _level, onRoll }: SheetDerivedStatsProps) {
  const [diceRoll, setDiceRoll] = useState<{ expr: string; label?: string; x: number; y: number } | null>(null);

  const percMod = derived.perception;
  const fortMod = derived.fort;
  const refMod  = derived.ref;
  const willMod = derived.will;

  function handleRoll(label: string, mod: number, e: React.MouseEvent<HTMLButtonElement>) {
    const expr = `1d20${mod >= 0 ? `+${mod}` : String(mod)}`;
    setDiceRoll({
      expr,
      label,
      x: e.clientX,
      y: e.clientY - 160,
    });
  }

  return (
    <div className={styles.block}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>AC</span>
          <span className={styles.statVal}>{derived.ac}</span>
        </div>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={(e) => handleRoll('Perception', percMod, e)} title="Roll Perception">
          <span className={styles.statLabel}>Perception</span>
          <span className={styles.statVal}>{formatMod(percMod)}</span>
        </button>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={(e) => handleRoll('Fortitude', fortMod, e)} title="Roll Fortitude Save">
          <span className={styles.statLabel}>Fort</span>
          <span className={styles.statVal}>{formatMod(fortMod)}</span>
        </button>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={(e) => handleRoll('Reflex', refMod, e)} title="Roll Reflex Save">
          <span className={styles.statLabel}>Reflex</span>
          <span className={styles.statVal}>{formatMod(refMod)}</span>
        </button>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={(e) => handleRoll('Will', willMod, e)} title="Roll Will Save">
          <span className={styles.statLabel}>Will</span>
          <span className={styles.statVal}>{formatMod(willMod)}</span>
        </button>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Class DC</span>
          <span className={styles.statVal}>{derived.classDC}</span>
        </div>
      </div>

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
    </div>
  );
}
