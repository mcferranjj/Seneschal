import type { AbilityScores, CharacterClassRef, CharacterAncestryRef, CharacterDerivedStats, SkillRank, BoostChoicesByLevel } from '../../../db/schema';
import { abilityMod, proficiencyBonus } from './proficiency';

/** Compute derived statistics from a built character. */
export function computeDerivedStats(
  abilityScores: AbilityScores,
  cls: CharacterClassRef | null,
  ancestry: CharacterAncestryRef | null,
  level: number,
  boostChoices?: BoostChoicesByLevel,
): CharacterDerivedStats {
  const conMod = abilityMod(abilityScores.con);
  const wisMod = abilityMod(abilityScores.wis);
  const dexMod = abilityMod(abilityScores.dex);

  const classHpPerLevel = cls?.hp ?? 0;
  const ancestryHp = ancestry?.hp ?? 0;
  const maxHp = ancestryHp + (classHpPerLevel * level) + (conMod * level);

  const unarmoredRank = (cls?.unarmoredRank ?? 1) as SkillRank;
  const ac = 10 + proficiencyBonus(unarmoredRank, level) + dexMod;

  const percRank = (cls?.perception ?? 1) as SkillRank;
  const perception = proficiencyBonus(percRank, level) + wisMod;

  const fortRank = (cls?.savingThrows.fortitude ?? 1) as SkillRank;
  const refRank  = (cls?.savingThrows.reflex  ?? 1) as SkillRank;
  const willRank = (cls?.savingThrows.will    ?? 1) as SkillRank;

  const fort = proficiencyBonus(fortRank, level) + conMod;
  const ref  = proficiencyBonus(refRank,  level) + dexMod;
  const will = proficiencyBonus(willRank, level) + wisMod;

  const keyAbility = boostChoices?.classKeyAbility ?? null;
  const keyAbilityMod = keyAbility ? abilityMod(abilityScores[keyAbility]) : 0;
  const classDC = 10 + proficiencyBonus(1 as SkillRank, level) + keyAbilityMod;

  return { maxHp: Math.max(1, maxHp), ac, perception, fort, ref, will, classDC };
}
