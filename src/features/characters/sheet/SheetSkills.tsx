import { useState } from 'react';
import type { CharacterRecord, SkillRank, AbilityKey } from '../../../db/schema';
import type { RollHistoryEntry } from '../../../types/diceHistory';
import { proficiencyBonus, abilityMod, formatMod, RANK_ABBR } from '../utils/proficiency';
import { STANDARD_SKILLS } from '../utils/skillHelpers';
import { DiceRoller } from '../../dice/DiceRoller';
import styles from './SheetSkills.module.css';

interface SheetSkillsProps {
  character: CharacterRecord;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
}

const RANK_COLORS = ['', styles.trained, styles.expert, styles.master, styles.legendary];

interface SkillRowProps {
  name: string;
  rank: SkillRank;
  abilityKey: string;
  abilityScore: number;
  level: number;
  onRoll?: (e: React.MouseEvent<HTMLButtonElement>, name: string, mod: number) => void;
}

function SkillRow({ name, rank, abilityKey, abilityScore, level, onRoll }: SkillRowProps) {
  const mod = proficiencyBonus(rank, level) + abilityMod(abilityScore);
  return (
    <button className={styles.skillRow} onClick={(e) => onRoll?.(e, name, mod)} title={`Roll ${name}`}>
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

export function SheetSkills({ character, onRoll }: SheetSkillsProps) {
  const { skills, abilityScores, level } = character;
  const [showUntrained, setShowUntrained] = useState(false);
  const [diceRoll, setDiceRoll] = useState<{ expr: string; label?: string; x: number; y: number } | null>(null);

  function getSkillMod(rank: SkillRank, abilityScore: number): number {
    return proficiencyBonus(rank, level) + abilityMod(abilityScore);
  }

  function handleSkillRoll(e: React.MouseEvent<HTMLButtonElement>, name: string, mod: number) {
    const expr = `1d20${mod >= 0 ? `+${mod}` : String(mod)}`;
    setDiceRoll({
      expr,
      label: name,
      x: e.clientX,
      y: e.clientY - 160,
    });
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

      <div className={styles.list}>
        {trainedSkills.map(s => (
          <SkillRow
            key={s.key}
            name={s.label}
            rank={skills[s.key] as SkillRank}
            abilityKey={s.ability}
            abilityScore={abilityScores[s.ability as AbilityKey]}
            level={level}
            onRoll={handleSkillRoll}
          />
        ))}

        {loreEntries.map(([loreName, rank]) => (
          <button
            key={loreName}
            className={styles.skillRow}
            onClick={(e) => handleSkillRoll(e, loreName, getSkillMod(rank, abilityScores.int))}
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
                name={s.label}
                rank={0}
                abilityKey={s.ability}
                abilityScore={abilityScores[s.ability as AbilityKey]}
                level={level}
                onRoll={handleSkillRoll}
              />
            ))}
          </>
        )}
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
