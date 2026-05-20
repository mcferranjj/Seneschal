import { describe, it, expect } from 'vitest';
import { computeAbilityScores } from './abilityComputation';
import type { BoostChoicesByLevel } from '../../../db/schema';

function emptyBoosts(): BoostChoicesByLevel {
  return {
    ancestryBoosts: [],
    backgroundBoost: null,
    backgroundFreeBoost: null,
    classKeyAbility: null,
    level1FreeBoosts: [],
    level5: [],
    level10: [],
    level15: [],
    level20: [],
  };
}

describe('computeAbilityScores', () => {
  it('returns the 10/10/10/10/10/10 baseline when no choices have been made', () => {
    const scores = computeAbilityScores(emptyBoosts());
    expect(scores).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  });

  it('boosts add +2 below 18', () => {
    const boosts = emptyBoosts();
    boosts.classKeyAbility = 'int';
    const scores = computeAbilityScores(boosts);
    expect(scores.int).toBe(12);
  });

  it('boosts add only +1 once a score has reached 18', () => {
    const boosts = emptyBoosts();
    // Force int to 18 first via level-1 free boosts (4 boosts), then bump once more.
    boosts.level1FreeBoosts = ['int', 'int', 'int', 'int']; // 10 → 12 → 14 → 16 → 18
    boosts.classKeyAbility = 'int';                          // 18 → 19 (+1, not +2)
    const scores = computeAbilityScores(boosts);
    expect(scores.int).toBe(19);
  });

  it('applies the ancestry flaw (–2) to the named ability', () => {
    const scores = computeAbilityScores(emptyBoosts(), [], 'con');
    expect(scores.con).toBe(8);
  });

  it('applies fixed-ancestry single-entry boosts', () => {
    // Elf: fixed [dex], [int]
    const scores = computeAbilityScores(emptyBoosts(), [['dex'], ['int']], 'con');
    expect(scores.dex).toBe(12);
    expect(scores.int).toBe(12);
    expect(scores.con).toBe(8);
  });

  it('ignores future-level boosts when the character is below that level', () => {
    const boosts = emptyBoosts();
    boosts.level5 = ['str', 'dex', 'con', 'int'];
    const scoresLow = computeAbilityScores(boosts, [], null, 4);
    expect(scoresLow.str).toBe(10);

    const scoresHigh = computeAbilityScores(boosts, [], null, 5);
    expect(scoresHigh.str).toBe(12);
  });

  it('applies the background boost and the chosen free background boost', () => {
    const boosts = emptyBoosts();
    boosts.backgroundBoost = 'wis';
    boosts.backgroundFreeBoost = 'cha';
    const scores = computeAbilityScores(boosts);
    expect(scores.wis).toBe(12);
    expect(scores.cha).toBe(12);
  });
});
