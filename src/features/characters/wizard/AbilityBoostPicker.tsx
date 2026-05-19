import type { AbilityKey } from '../../../db/schema';
import { ALL_ABILITIES, ABILITY_ABBR } from '../utils/abilityComputation';
import styles from './AbilityBoostPicker.module.css';

interface AbilityBoostPickerProps {
  label: string;
  count: number;
  chosen: AbilityKey[];
  disabledInOtherGroups?: AbilityKey[];
  lockedBoosts?: AbilityKey[];
  lockedFlaws?: AbilityKey[];
  onChange: (chosen: AbilityKey[]) => void;
}

export function AbilityBoostPicker({
  label,
  count,
  chosen,
  disabledInOtherGroups = [],
  lockedBoosts = [],
  lockedFlaws = [],
  onChange,
}: AbilityBoostPickerProps) {
  function toggleAbility(ability: AbilityKey, slotIndex: number) {
    const newChosen = [...chosen];
    if (newChosen[slotIndex] === ability) {
      // Deselect
      newChosen[slotIndex] = undefined as unknown as AbilityKey;
      onChange(newChosen.filter((x): x is AbilityKey => x !== undefined));
      return;
    }
    newChosen[slotIndex] = ability;
    onChange(newChosen.filter((x): x is AbilityKey => x !== undefined));
  }

  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>{label}</div>

      {lockedBoosts.length > 0 && (
        <div className={styles.lockedRow}>
          {lockedBoosts.map((a, i) => (
            <span key={`lb-${i}`} className={styles.lockedBoost}>
              {ABILITY_ABBR[a]}
            </span>
          ))}
        </div>
      )}

      {lockedFlaws.length > 0 && (
        <div className={styles.lockedRow}>
          {lockedFlaws.map((a, i) => (
            <span key={`lf-${i}`} className={styles.lockedFlaw}>
              {ABILITY_ABBR[a]} ▼
            </span>
          ))}
        </div>
      )}

      {Array.from({ length: count }, (_, slotIdx) => {
        const slotChoice = chosen[slotIdx] ?? null;
        // Other slots in this group already chose
        const otherInGroup = chosen.filter((_, i) => i !== slotIdx);

        return (
          <div key={slotIdx} className={styles.slotRow}>
            <span className={styles.slotNum}>{slotIdx + 1}</span>
            <div className={styles.abilityBtns}>
              {ALL_ABILITIES.map(ability => {
                const isChosen = slotChoice === ability;
                const isDisabledOtherGroup = disabledInOtherGroups.includes(ability);
                const isChosenInOtherSlot = otherInGroup.includes(ability);
                const isDisabled = isDisabledOtherGroup || isChosenInOtherSlot;

                return (
                  <button
                    key={ability}
                    className={`${styles.abilityBtn} ${isChosen ? styles.chosen : ''} ${isDisabled ? styles.disabled : ''}`}
                    onClick={() => !isDisabled && toggleAbility(ability, slotIdx)}
                    disabled={isDisabled}
                    title={isDisabledOtherGroup ? 'Already chosen in another group' : isChosenInOtherSlot ? 'Already chosen in another slot' : undefined}
                  >
                    {ABILITY_ABBR[ability]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
