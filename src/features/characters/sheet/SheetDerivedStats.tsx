import type { CharacterDerivedStats } from '../../../db/schema';
import { useInlineRoll } from '../hooks/useInlineRoll';
import { formatMod } from '../utils/proficiency';
import styles from './SheetDerivedStats.module.css';

interface SheetDerivedStatsProps {
  derived: CharacterDerivedStats;
  level: number;
}

export function SheetDerivedStats({ derived, level: _level }: SheetDerivedStatsProps) {
  const { activeRoll, roll } = useInlineRoll();

  const percMod = derived.perception;
  const fortMod = derived.fort;
  const refMod  = derived.ref;
  const willMod = derived.will;

  return (
    <div className={styles.block}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>AC</span>
          <span className={styles.statVal}>{derived.ac}</span>
        </div>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={() => roll('Perception', percMod)} title="Roll Perception">
          <span className={styles.statLabel}>Perception</span>
          <span className={styles.statVal}>{formatMod(percMod)}</span>
        </button>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={() => roll('Fortitude', fortMod)} title="Roll Fortitude Save">
          <span className={styles.statLabel}>Fort</span>
          <span className={styles.statVal}>{formatMod(fortMod)}</span>
        </button>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={() => roll('Reflex', refMod)} title="Roll Reflex Save">
          <span className={styles.statLabel}>Reflex</span>
          <span className={styles.statVal}>{formatMod(refMod)}</span>
        </button>
        <button className={`${styles.stat} ${styles.rollable}`} onClick={() => roll('Will', willMod)} title="Roll Will Save">
          <span className={styles.statLabel}>Will</span>
          <span className={styles.statVal}>{formatMod(willMod)}</span>
        </button>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Class DC</span>
          <span className={styles.statVal}>{derived.classDC}</span>
        </div>
      </div>

      {activeRoll && (
        <div className={styles.rollResult}>
          <span className={styles.rollLabel}>{activeRoll.label}:</span>
          <span className={styles.rollDice}>d20({activeRoll.d20})</span>
          <span className={styles.rollMod}>{formatMod(activeRoll.mod)}</span>
          <span className={styles.rollEq}>=</span>
          <span className={`${styles.rollTotal} ${activeRoll.d20 === 20 ? styles.crit : activeRoll.d20 === 1 ? styles.fumble : ''}`}>
            {activeRoll.total}
            {activeRoll.d20 === 20 && ' ✦'}
            {activeRoll.d20 === 1 && ' ✕'}
          </span>
        </div>
      )}
    </div>
  );
}
