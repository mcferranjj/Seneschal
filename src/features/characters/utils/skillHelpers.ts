import type { CharacterSkills, SkillRank, CharacterBackgroundRef, CharacterClassRef } from '../../../db/schema';

export const STANDARD_SKILLS: Array<{ key: keyof Omit<CharacterSkills, 'loreSkills'>; label: string; ability: string }> = [
  { key: 'acrobatics',    label: 'Acrobatics',    ability: 'dex' },
  { key: 'arcana',        label: 'Arcana',         ability: 'int' },
  { key: 'athletics',     label: 'Athletics',      ability: 'str' },
  { key: 'crafting',      label: 'Crafting',       ability: 'int' },
  { key: 'deception',     label: 'Deception',      ability: 'cha' },
  { key: 'diplomacy',     label: 'Diplomacy',      ability: 'cha' },
  { key: 'intimidation',  label: 'Intimidation',   ability: 'cha' },
  { key: 'medicine',      label: 'Medicine',       ability: 'wis' },
  { key: 'nature',        label: 'Nature',         ability: 'wis' },
  { key: 'occultism',     label: 'Occultism',      ability: 'int' },
  { key: 'performance',   label: 'Performance',    ability: 'cha' },
  { key: 'religion',      label: 'Religion',       ability: 'wis' },
  { key: 'society',       label: 'Society',        ability: 'int' },
  { key: 'stealth',       label: 'Stealth',        ability: 'dex' },
  { key: 'survival',      label: 'Survival',       ability: 'wis' },
  { key: 'thievery',      label: 'Thievery',       ability: 'dex' },
];

export function blankSkills(): CharacterSkills {
  return {
    acrobatics: 0, arcana: 0, athletics: 0, crafting: 0,
    deception: 0, diplomacy: 0, intimidation: 0, medicine: 0,
    nature: 0, occultism: 0, performance: 0, religion: 0,
    society: 0, stealth: 0, survival: 0, thievery: 0,
    loreSkills: {},
  };
}

/**
 * Apply locked (always-trained) skills from background and class.
 * Returns a new skills object with those skills set to at least rank 1.
 */
export function applyLockedSkills(
  skills: CharacterSkills,
  background: CharacterBackgroundRef | null,
  cls: CharacterClassRef | null,
): CharacterSkills {
  const result = { ...skills, loreSkills: { ...skills.loreSkills } };

  const locked = new Set<string>();

  if (background) {
    for (const s of background.trainedSkills) {
      locked.add(s);
    }
    for (const loreName of background.trainedLoreSkills) {
      result.loreSkills = { ...result.loreSkills, [loreName]: 1 as SkillRank };
    }
  }

  if (cls) {
    for (const s of cls.trainedSkills) {
      locked.add(s);
    }
  }

  for (const skillDef of STANDARD_SKILLS) {
    if (locked.has(skillDef.key) && result[skillDef.key] < 1) {
      (result as Record<string, unknown>)[skillDef.key] = 1;
    }
  }

  return result;
}

/**
 * Returns the set of skill keys that are locked trained (background + class).
 */
export function getLockedSkillKeys(
  background: CharacterBackgroundRef | null,
  cls: CharacterClassRef | null,
): Set<string> {
  const locked = new Set<string>();
  if (background) {
    for (const s of background.trainedSkills) locked.add(s);
  }
  if (cls) {
    for (const s of cls.trainedSkills) locked.add(s);
  }
  return locked;
}
