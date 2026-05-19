import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import type { CharacterSkills, SkillRank } from '../../../../db/schema';
import { STANDARD_SKILLS, getLockedSkillKeys } from '../../utils/skillHelpers';
import { computeAbilityScores } from '../../utils/abilityComputation';
import { abilityMod } from '../../utils/proficiency';
import styles from './WizardStepSkills.module.css';

interface WizardStepSkillsProps {
  draft: CharacterDraft;
  onChange: (skills: CharacterSkills) => void;
}

export function WizardStepSkills({ draft, onChange }: WizardStepSkillsProps) {
  const { background, class: cls, skills } = draft;

  const lockedKeys = getLockedSkillKeys(background, cls);

  const computedScores = computeAbilityScores(
    draft.boostChoices,
    draft.ancestry?.fixedBoosts ?? [],
    draft.ancestry?.flaw ?? null,
    draft.level,
  );
  const intMod = abilityMod(computedScores.int);
  const additionalSkills = (cls?.additionalSkills ?? 0) + Math.max(0, intMod);

  // Count currently-trained free skills (not locked)
  const trainedFreeSkills = STANDARD_SKILLS.filter(s =>
    !lockedKeys.has(s.key) && skills[s.key] >= 1
  ).length;

  const remaining = additionalSkills - trainedFreeSkills;

  function toggleSkill(key: keyof Omit<CharacterSkills, 'loreSkills'>) {
    if (lockedKeys.has(key)) return; // locked, can't change
    const current = skills[key];
    if (current >= 1) {
      onChange({ ...skills, [key]: 0 as SkillRank });
    } else {
      if (remaining <= 0) return; // no free slots
      onChange({ ...skills, [key]: 1 as SkillRank });
    }
  }

  return (
    <div className={styles.step}>
      <div className={styles.heading}>
        <h3 className={styles.title}>Choose Skills</h3>
        <p className={styles.sub}>
          Select additional trained skills from your class.
        </p>
      </div>

      <div className={styles.counter}>
        <span className={`${styles.remaining} ${remaining === 0 ? styles.done : ''}`}>
          {remaining > 0
            ? `Choose ${remaining} more skill${remaining !== 1 ? 's' : ''}`
            : 'All skills chosen'}
        </span>
      </div>

      <div className={styles.skillList}>
        {STANDARD_SKILLS.map(skillDef => {
          const key = skillDef.key;
          const rank = skills[key];
          const isLocked = lockedKeys.has(key);
          const isTrained = rank >= 1;

          return (
            <button
              key={key}
              className={`${styles.skillRow} ${isTrained ? styles.trained : ''} ${isLocked ? styles.locked : ''}`}
              onClick={() => toggleSkill(key)}
              disabled={isLocked}
            >
              <span className={`${styles.rankBadge} ${isTrained ? styles.rankTrained : styles.rankUntrained}`}>
                {isTrained ? 'T' : 'U'}
              </span>
              <span className={styles.skillName}>{skillDef.label}</span>
              <span className={styles.skillAbility}>{skillDef.ability.toUpperCase()}</span>
              {isLocked && <span className={styles.lockIcon} title="Locked by background or class">🔒</span>}
            </button>
          );
        })}
      </div>

      {background?.trainedLoreSkills && background.trainedLoreSkills.length > 0 && (
        <div className={styles.loreSection}>
          <div className={styles.loreSectionLabel}>Lore Skills (from Background)</div>
          {background.trainedLoreSkills.map(s => (
            <div key={s} className={`${styles.skillRow} ${styles.trained} ${styles.locked}`}>
              <span className={`${styles.rankBadge} ${styles.rankTrained}`}>T</span>
              <span className={styles.skillName}>{s} Lore</span>
              <span className={styles.skillAbility}>INT</span>
              <span className={styles.lockIcon}>🔒</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
