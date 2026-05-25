import { describe, it, expect } from 'vitest';
import {
  blankDraft, blankBoosts, isStepComplete, newCharacterId, buildCharacterFromDraft,
} from './wizardDraft';
import type { CharacterDraft } from './wizardTypes';
import type { CharacterAncestryRef, CharacterHeritageRef, CharacterBackgroundRef, CharacterClassRef } from '../../../db/schema';

const ancestry: CharacterAncestryRef = {
  id: 'a1', name: 'Elf', slug: 'elf',
  hp: 6, speed: 30, size: 'med', vision: 'low-light-vision',
  traits: ['elf', 'humanoid'], languages: ['common', 'elven'],
  fixedBoosts: [['dex'], ['int']], freeBoostCount: 1, flaw: 'con',
};
const heritage: CharacterHeritageRef = {
  id: 'h1', name: 'Ancient Elf', slug: 'ancient-elf',
  isVersatile: false, versatileAncestrySlug: null,
};
const background: CharacterBackgroundRef = {
  id: 'b1', name: 'Acolyte', slug: 'acolyte',
  boostOptions: [['int', 'wis']], freeBoostCount: 1,
  trainedSkills: ['religion'], trainedLoreSkills: ['scribing'],
  grantedFeatId: null, grantedFeatName: null,
};
const cls: CharacterClassRef = {
  id: 'c1', name: 'Wizard', slug: 'wizard',
  hp: 6, keyAbilityOptions: ['int'], perception: 1,
  savingThrows: { fortitude: 1, reflex: 1, will: 2 },
  unarmoredRank: 1, trainedSkills: ['arcana'], additionalSkills: 2,
  ancestryFeatLevels: [1, 5, 9], classFeatLevels: [2, 4, 6],
  generalFeatLevels: [3, 7], skillFeatLevels: [2, 4, 6],
  skillIncreaseLevels: [3, 5, 7],
  subclassTag: 'wizard-arcane-school', subclassLabel: 'Arcane School',
};

describe('blankDraft', () => {
  it('starts with sensible defaults', () => {
    const d = blankDraft();
    expect(d.name).toBe('Unnamed');
    expect(d.level).toBe(1);
    expect(d.ancestry).toBeNull();
    expect(d.heritage).toBeNull();
    expect(d.background).toBeNull();
    expect(d.class).toBeNull();
    expect(d.feats).toEqual([]);
  });
});

describe('blankBoosts', () => {
  it('initialises every level slot to an empty array or null', () => {
    const b = blankBoosts();
    expect(b.ancestryBoosts).toEqual([]);
    expect(b.backgroundBoost).toBeNull();
    expect(b.classKeyAbility).toBeNull();
    expect(b.level1FreeBoosts).toEqual([]);
  });
});

describe('isStepComplete', () => {
  const baseDraft: CharacterDraft = blankDraft();

  it('lineage requires ancestry AND heritage (name no longer required)', () => {
    expect(isStepComplete('lineage', baseDraft)).toBe(false);
    expect(isStepComplete('lineage', { ...baseDraft, ancestry })).toBe(false);
    expect(isStepComplete('lineage', { ...baseDraft, ancestry, heritage })).toBe(true);
  });

  it('background requires a background', () => {
    expect(isStepComplete('background', baseDraft)).toBe(false);
    expect(isStepComplete('background', { ...baseDraft, background })).toBe(true);
  });

  it('class requires both class and a key-ability choice', () => {
    expect(isStepComplete('class', { ...baseDraft, class: cls })).toBe(false);
    const withKey: CharacterDraft = {
      ...baseDraft, class: cls,
      boostChoices: { ...baseDraft.boostChoices, classKeyAbility: 'int' },
    };
    expect(isStepComplete('class', withKey)).toBe(true);
  });

  it('post-class steps are always considered complete', () => {
    expect(isStepComplete('abilities', baseDraft)).toBe(true);
    expect(isStepComplete('skills', baseDraft)).toBe(true);
    expect(isStepComplete('feats', baseDraft)).toBe(true);
    expect(isStepComplete('review', baseDraft)).toBe(true);
  });
});

describe('newCharacterId', () => {
  it('includes the timestamp plus a random suffix', () => {
    const id = newCharacterId(1234567890);
    expect(id).toMatch(/^pc-1234567890-[a-z0-9]{1,6}$/);
  });

  it('produces unique ids even for the same timestamp', () => {
    const a = newCharacterId(1);
    const b = newCharacterId(1);
    expect(a).not.toBe(b);
  });
});

describe('buildCharacterFromDraft', () => {
  const now = 1_700_000_000_000;
  const draft: CharacterDraft = {
    ...blankDraft(),
    name: 'Aldric',
    ancestry, heritage, background, class: cls,
    boostChoices: { ...blankDraft().boostChoices, classKeyAbility: 'int' },
  };

  it('honours the trimmed user-supplied name', () => {
    const rec = buildCharacterFromDraft({ ...draft, name: '  Aldric  ' }, now);
    expect(rec.name).toBe('Aldric');
  });

  it('falls back to "Unnamed" when the name is blank', () => {
    const rec = buildCharacterFromDraft({ ...draft, name: '   ' }, now);
    expect(rec.name).toBe('Unnamed');
  });

  it('uses `now` for both timestamps and includes it in the id', () => {
    const rec = buildCharacterFromDraft(draft, now);
    expect(rec.createdAt).toBe(now);
    expect(rec.updatedAt).toBe(now);
    expect(rec.id.startsWith(`pc-${now}-`)).toBe(true);
  });

  it('populates currentHp to maxHp and tempHp to 0', () => {
    const rec = buildCharacterFromDraft(draft, now);
    expect(rec.currentHp).toBe(rec.derivedStats.maxHp);
    expect(rec.tempHp).toBe(0);
  });
});
