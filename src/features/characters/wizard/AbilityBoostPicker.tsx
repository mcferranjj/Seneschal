import type { AbilityKey } from '../../../db/schema';
import { ALL_ABILITIES, ABILITY_ABBR } from '../utils/abilityComputation';
import styles from './AbilityBoostPicker.module.css';

interface AbilityBoostPickerProps {
  /** How many boosts can be chosen from this source. */
  count: number;
  chosen: AbilityKey[];
  /** Abilities that are off-limits because another group already claims them. */
  disabledInOtherGroups?: AbilityKey[];
  /** Abilities that are permanently boosted (shown as locked, not clickable). */
  lockedBoosts?: AbilityKey[];
  /** Abilities that are permanently flawed (shown as flaw, not clickable). */
  lockedFlaws?: AbilityKey[];
  onChange: (chosen: AbilityKey[]) => void;
}

export function AbilityBoostPicker({
  count,
  chosen,
  disabledInOtherGroups = [],
  lockedBoosts = [],
  lockedFlaws = [],
  onChange,
}: AbilityBoostPickerProps) {
  function toggle(ability: AbilityKey) {
    if (chosen.includes(ability)) {
      onChange(chosen.filter(a => a !== ability));
    } else if (chosen.length < count) {
      onChange([...chosen, ability]);
    }
  }

  const remaining = count - chosen.length;

  return (
    <div className={styles.group}>
      <div className={styles.abilityBtns}>
        {ALL_ABILITIES.map(ability => {
          const isLockedBoost  = lockedBoosts.includes(ability);
          const isLockedFlaw   = lockedFlaws.includes(ability);
          const isChosen       = chosen.includes(ability);
          const isRestricted   = disabledInOtherGroups.includes(ability);
          const isFlawBoosted  = isLockedFlaw && isChosen;
          // Locked boosts and restricted abilities can't be toggled; flaw CAN be chosen
          const isDisabled     = isLockedBoost || isRestricted || (!isChosen && remaining === 0);

          return (
            <button
              key={ability}
              className={[
                styles.abilityBtn,
                isLockedBoost                    ? styles.lockedBoost : '',
                isLockedFlaw && !isFlawBoosted   ? styles.lockedFlaw  : '',
                isFlawBoosted                    ? styles.flawBoosted : '',
                isChosen && !isLockedBoost && !isLockedFlaw ? styles.chosen : '',
                isDisabled && !isLockedBoost     ? styles.disabled    : '',
              ].join(' ')}
              onClick={() => !isDisabled && toggle(ability)}
              disabled={isDisabled}
              title={
                isLockedBoost ? 'Fixed ancestry boost' :
                isFlawBoosted ? 'Ancestry flaw — boosted (net ±0)' :
                isLockedFlaw  ? 'Ancestry flaw — click to boost' :
                isRestricted  ? 'Not available for this source' :
                undefined
              }
            >
              {ABILITY_ABBR[ability]}
            </button>
          );
        })}
      </div>
      {count > 0 && (
        <div className={styles.progress}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className={`${styles.pip} ${i < chosen.length ? styles.pipFilled : ''}`} />
          ))}
          <span className={styles.progressLabel}>
            {chosen.length}/{count} chosen
          </span>
        </div>
      )}
    </div>
  );
}
