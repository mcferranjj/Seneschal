import { describe, it, expect } from 'vitest';
import { computeFeatSlots, mergeFeatChoices } from './featSlots';
import type { CharacterClassRef, FeatChoice } from '../../../db/schema';

const cls: CharacterClassRef = {
  id: 'c1', name: 'Wizard', slug: 'wizard',
  hp: 6, keyAbilityOptions: ['int'], perception: 1,
  savingThrows: { fortitude: 1, reflex: 1, will: 2 },
  unarmoredRank: 1, trainedSkills: ['arcana'], additionalSkills: 2,
  ancestryFeatLevels: [1, 5, 9, 13, 17],
  classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  generalFeatLevels: [3, 7, 11, 15, 19],
  skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
  subclassTag: 'wizard-arcane-school', subclassLabel: 'Arcane School',
};

describe('computeFeatSlots', () => {
  it('returns no slots when no class is selected', () => {
    expect(computeFeatSlots(null, 5)).toEqual([]);
  });

  it('returns only slots at or below the given level', () => {
    const slots = computeFeatSlots(cls, 3);
    const levels = slots.map(s => s.level);
    expect(levels.every(l => l <= 3)).toBe(true);
  });

  it('includes all expected slot types at level 5', () => {
    const slots = computeFeatSlots(cls, 5);
    const types = new Set(slots.map(s => s.slotType));
    expect(types.has('ancestry')).toBe(true);
    expect(types.has('class')).toBe(true);
    expect(types.has('general')).toBe(true);
    expect(types.has('skill')).toBe(true);
  });

  it('orders slots by level (and slotType as tiebreaker)', () => {
    const slots = computeFeatSlots(cls, 4);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].level >= slots[i - 1].level).toBe(true);
    }
  });

  it('at level 1 returns exactly the ancestry feat slot', () => {
    const slots = computeFeatSlots(cls, 1);
    expect(slots).toHaveLength(1);
    expect(slots[0].slotType).toBe('ancestry');
    expect(slots[0].level).toBe(1);
  });
});

describe('mergeFeatChoices', () => {
  it('preserves prior choices that still match a slot', () => {
    const slots = computeFeatSlots(cls, 5);
    const existing: FeatChoice[] = [
      { slotType: 'ancestry', level: 1, featId: 'feat-1', featName: 'Ancestral Memory' },
    ];
    const merged = mergeFeatChoices(slots, existing);
    const a = merged.find(c => c.slotType === 'ancestry' && c.level === 1);
    expect(a?.featId).toBe('feat-1');
    expect(a?.featName).toBe('Ancestral Memory');
  });

  it('drops choices whose slot no longer exists (e.g. level dropped)', () => {
    const slots = computeFeatSlots(cls, 1);
    const existing: FeatChoice[] = [
      { slotType: 'class', level: 2, featId: 'x', featName: 'X' },
    ];
    const merged = mergeFeatChoices(slots, existing);
    expect(merged.find(c => c.slotType === 'class')).toBeUndefined();
  });

  it('produces an empty (null) entry for every slot that lacks a prior choice', () => {
    const slots = computeFeatSlots(cls, 2);
    const merged = mergeFeatChoices(slots, []);
    expect(merged).toHaveLength(slots.length);
    for (const c of merged) {
      expect(c.featId).toBeNull();
      expect(c.featName).toBeNull();
    }
  });
});
