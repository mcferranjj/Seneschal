import { useState } from 'react';
import type { CharacterRecord, SkillRank } from '../../../db/schema';
import { proficiencyBonus, abilityMod, formatMod, RANK_ABBR } from '../utils/proficiency';
import { STANDARD_SKILLS } from '../utils/skillHelpers';
import { useInlineRoll } from '../hooks/useInlineRoll';
import styles from './SheetSkills.module.css';

interface SheetSkillsProps {
  character: CharacterRecord;
}

const RANK_COLORS = ['', styles.trained, styles.expert, styles.master, styles.legendary];

interface SkillRowProps {
  name: string;
  rank: SkillRank;
  abilityKey: string;
  abilityScore: number;
  level: number;
  onRoll: (name: string, mod: number) => void;
}

function SkillRow({ name, rank, abilityKey, abilityScore, level, onRoll }: SkillRowProps) {
  const mod = proficiencyBonus(rank, level) + abilityMod(abilityScore);
  return (
    <button className={styles.skillRow} onClick={() => onRoll(name, mod)} title={`Roll ${name}`}>
      {rank > 0 && (
        <span className={`${styles.rankBadge} ${RANK_COLORS[rank]}`}>
          {RANK_ABBR[rank]}
        </span>
      )}
      {rank === 0 && <span className={`${styles.rankBadge} ${styles.untrained}`}>U</span>}
      <span className={styles.skillName}>{name}</span>
      <span className={styles.skillAbility}>({abilityKey.toUpperCase()})</span>
      <span className={styles.skillMod}>{formatMod(mod)}</span>
    </button>
  );
}

export function SheetSkills({ character }: SheetSkillsProps) {
  const { skills, abilityScores, level } = character;
  const [showUntrained, setShowUntrained] = useState(false);
  const { activeRoll, roll: rollSkill } = useInlineRoll();

  function getSkillMod(rank: SkillRank, abilityScore: number): number {
    return proficiencyBonus(rank, level) + abilityMod(abilityScore);
  }

  const trainedSkills = STANDARD_SKILLS.filter(s => (skills[s.key] as SkillRank) > 0);
  const untrainedSkills = STANDARD_SKILLS.filter(s => (skills[s.key] as SkillRank) === 0);
  const loreEntries = Object.entries(skills.loreSkills);

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <h3 className={styles.title}>Skills</h3>
        <button
          className={styles.toggleBtn}
          onClick={() => setShowUntrained(v => !v)}
        >
          {showUntrained ? 'Hide Untrained' : 'Show Untrained'}
        </button>
      </div>

      {activeRoll && (
        <div className={styles.rollResult}>
          <span className={styles.rollLabel}>{activeRoll.label}:</span>
          <span className={styles.rollDice}>d20({activeRoll.d20})</span>
          <span className={styles.rollMod}>{formatMod(activeRoll.mod)}</span>
          <span className={styles.rollEq}>=</span>
          <span className={`${styles.rollTotal} ${activeRoll.d20 === 20 ? styles.crit : activeRoll.d20 === 1 ? styles.fumble : ''}`}>
            {activeRoll.total}
          </span>
        </div>
      )}

      <div className={styles.list}>
        {trainedSkills.map(s => (
          <SkillRow
            key={s.key}
            name={s.name}
            rank={skills[s.key] as SkillRank}
            abilityKey={s.ability}
            abilityScore={abilityScores[s.ability]}
            level={level}
            onRoll={rollSkill}
          />
        ))}

        {loreEntries.map(([loreName, rank]) => (
          <button
            key={loreName}
            className={styles.skillRow}
            onClick={() => rollSkill(loreName, getSkillMod(rank, abilityScores.int))}
            title={`Roll ${loreName}`}
          >
            <span className={`${styles.rankBadge} ${RANK_COLORS[rank] ?? styles.trained}`}>
              {RANK_ABBR[rank] ?? 'T'}
            </span>
            <span className={styles.skillName}>{loreName}</span>
            <span className={styles.skillAbility}>(INT)</span>
            <span className={styles.skillMod}>{formatMod(getSkillMod(rank, abilityScores.int))}</span>
          </button>
        ))}

        {showUntrained && untrainedSkills.length > 0 && (
          <>
            <div className={styles.divider} />
            {untrainedSkills.map(s => (
              <SkillRow
                key={s.key}
                name={s.name}
                rank={0}
                abilityKey={s.ability}
                abilityScore={abilityScores[s.ability]}
                level={level}
                onRoll={rollSkill}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
