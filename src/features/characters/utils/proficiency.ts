import type { SkillRank } from '../../../db/schema';

export const RANK_LABELS: Record<SkillRank, string> = {
  0: 'Untrained',
  1: 'Trained',
  2: 'Expert',
  3: 'Master',
  4: 'Legendary',
};

export const RANK_ABBR: Record<SkillRank, string> = {
  0: 'U',
  1: 'T',
  2: 'E',
  3: 'M',
  4: 'L',
};

/** PF2e proficiency bonus: level + rank_bonus */
export function proficiencyBonus(rank: SkillRank, level: number): number {
  if (rank === 0) return 0;
  const rankBonus = rank === 1 ? 2 : rank === 2 ? 4 : rank === 3 ? 6 : 8;
  return level + rankBonus;
}

/** Ability modifier from ability score */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Format modifier with sign */
export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export { STANDARD_SKILLS } from './skillHelpers';
