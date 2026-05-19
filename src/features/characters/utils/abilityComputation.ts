import type { AbilityKey, AbilityScores, BoostChoicesByLevel } from '../../../db/schema';

export const ALL_ABILITIES: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_ABBR: Record<AbilityKey, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

function applyBoosts(scores: Record<AbilityKey, number>, boosts: AbilityKey[]): void {
  for (const key of boosts) {
    if (!key) continue;
    // PF2e: boosts above 18 only add 1
    scores[key] = scores[key] >= 18 ? scores[key] + 1 : scores[key] + 2;
  }
}

function applyFlaws(scores: Record<AbilityKey, number>, flaws: AbilityKey[]): void {
  for (const key of flaws) {
    if (!key) continue;
    scores[key] = scores[key] - 2;
  }
}

/**
 * Compute final ability scores from all boost/flaw choices.
 * Starting score is 10 for each ability.
 */
export function computeAbilityScores(
  boostChoices: BoostChoicesByLevel,
  fixedBoosts: AbilityKey[][] = [],
  flaw: AbilityKey | null = null,
  level: number = 1,
): AbilityScores {
  const scores: Record<AbilityKey, number> = {
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  };

  // Fixed ancestry boosts (pairs, pick from each pair — but here the pair choices
  // are already resolved via boostChoices.ancestryBoosts for free slots;
  // fixedBoosts represents forced boosts)
  for (const pair of fixedBoosts) {
    // If pair has exactly 1 entry it's a fixed boost
    if (pair.length === 1) {
      applyBoosts(scores, pair);
    }
  }

  // Ancestry flaw
  if (flaw) {
    applyFlaws(scores, [flaw]);
  }

  // Ancestry free boosts
  applyBoosts(scores, boostChoices.ancestryBoosts);

  // Background boosts
  if (boostChoices.backgroundBoost) {
    applyBoosts(scores, [boostChoices.backgroundBoost]);
  }
  if (boostChoices.backgroundFreeBoost) {
    applyBoosts(scores, [boostChoices.backgroundFreeBoost]);
  }

  // Class key ability
  if (boostChoices.classKeyAbility) {
    applyBoosts(scores, [boostChoices.classKeyAbility]);
  }

  // Level 1 free boosts (4 boosts)
  applyBoosts(scores, boostChoices.level1FreeBoosts);

  // Level 5+ boosts
  if (level >= 5) applyBoosts(scores, boostChoices.level5);
  if (level >= 10) applyBoosts(scores, boostChoices.level10);
  if (level >= 15) applyBoosts(scores, boostChoices.level15);
  if (level >= 20) applyBoosts(scores, boostChoices.level20);

  return scores as AbilityScores;
}
