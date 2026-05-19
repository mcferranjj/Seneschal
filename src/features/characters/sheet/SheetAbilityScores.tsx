import type { AbilityScores } from '../../../db/schema';
import { abilityMod, formatMod } from '../utils/proficiency';
import { ABILITY_ABBR } from '../utils/abilityComputation';
import type { AbilityKey } from '../../../db/schema';
import styles from './SheetAbilityScores.module.css';

interface SheetAbilityScoresProps {
  scores: AbilityScores;
}

const ABILITY_ORDER: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function SheetAbilityScores({ scores }: SheetAbilityScoresProps) {
  return (
    <div className={styles.row}>
      {ABILITY_ORDER.map(ab => {
        const score = scores[ab];
        const mod = abilityMod(score);
        const modClass = mod > 0 ? styles.modPos : mod < 0 ? styles.modNeg : styles.modZero;
        return (
          <div key={ab} className={styles.cell}>
            <span className={styles.abbr}>{ABILITY_ABBR[ab]}</span>
            <span className={styles.score}>{score}</span>
            <span className={`${styles.mod} ${modClass}`}>{formatMod(mod)}</span>
          </div>
        );
      })}
    </div>
  );
}
