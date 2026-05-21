/**
 * Pure helpers backing the character wizard. Kept free of React so they can
 * be unit-tested without rendering and reused outside the hook (e.g. for
 * preview rendering on the Review step).
 */

import type { BoostChoicesByLevel, CharacterRecord } from '../../../db/schema';
import { blankSkills } from '../utils/skillHelpers';
import { computeAbilityScores } from '../utils/abilityComputation';
import { computeDerivedStats } from '../utils/derivedStats';
import type { CharacterDraft, WizardStep } from './wizardTypes';

export function blankBoosts(): BoostChoicesByLevel {
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

export function blankDraft(): CharacterDraft {
  return {
    name: 'Unnamed',
    playerName: '',
    level: 1,
    ancestry: null,
    heritage: null,
    background: null,
    class: null,
    boostChoices: blankBoosts(),
    skills: blankSkills(),
    feats: [],
  };
}

/**
 * Step-by-step gating used by both the progress bar (to mark previous steps
 * "completed") and the Next button (to allow advancing). Steps after class
 * have no hard requirements — the user can always step through them.
 */
export function isStepComplete(step: WizardStep, draft: CharacterDraft): boolean {
  switch (step) {
    case 'lineage':    return draft.ancestry !== null && draft.heritage !== null;
    case 'background': return draft.background !== null;
    case 'class':      return draft.class !== null && draft.boostChoices.classKeyAbility !== null;
    case 'abilities':
    case 'skills':
    case 'feats':
    case 'review':
      return true;
    default: return false;
  }
}

/** Generate a unique character id even when two saves land in the same ms. */
export function newCharacterId(now: number = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `pc-${now}-${rand}`;
}

/**
 * Build a finalized `CharacterRecord` from a draft. Pure function — accepts
 * a `now` for deterministic test output. Computes ability scores and derived
 * stats internally so callers don't have to thread those through.
 */
export function buildCharacterFromDraft(
  draft: CharacterDraft,
  now: number = Date.now(),
): CharacterRecord {
  const fixedBoosts = draft.ancestry?.fixedBoosts ?? [];
  const flaw = draft.ancestry?.flaw ?? null;
  const abilityScores = computeAbilityScores(
    draft.boostChoices, fixedBoosts, flaw, draft.level,
  );
  const derivedStats = computeDerivedStats(
    abilityScores, draft.class, draft.ancestry, draft.level, draft.boostChoices,
  );
  const trimmedName = draft.name.trim();
  return {
    id: newCharacterId(now),
    name: trimmedName.length > 0 ? trimmedName : 'Unnamed',
    playerName: draft.playerName,
    createdAt: now,
    updatedAt: now,
    level: draft.level,
    ancestry: draft.ancestry,
    heritage: draft.heritage,
    background: draft.background,
    class: draft.class,
    abilityScores,
    boostChoices: draft.boostChoices,
    skills: draft.skills,
    feats: draft.feats,
    currentHp: derivedStats.maxHp,
    tempHp: 0,
    derivedStats,
  };
}
