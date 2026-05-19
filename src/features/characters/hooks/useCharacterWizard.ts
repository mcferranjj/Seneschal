import { useState, useCallback } from 'react';
import type {
  CharacterRecord, CharacterSkills,
  BoostChoicesByLevel, FeatChoice, CharacterAncestryRef, CharacterHeritageRef,
  CharacterBackgroundRef, CharacterClassRef,
} from '../../../db/schema';
import { blankSkills, applyLockedSkills } from '../utils/skillHelpers';
import { computeAbilityScores } from '../utils/abilityComputation';
import { computeDerivedStats } from '../utils/derivedStats';
import { computeFeatSlots, mergeFeatChoices } from '../utils/featSlots';

export type WizardStep =
  | 'lineage'
  | 'background'
  | 'class'
  | 'abilities'
  | 'skills'
  | 'feats'
  | 'review';

export interface WizardStepMeta {
  key: WizardStep;
  label: string;
  completed: boolean;
}

export interface CharacterDraft {
  name: string;
  playerName: string;
  level: number;
  ancestry: CharacterAncestryRef | null;
  heritage: CharacterHeritageRef | null;
  background: CharacterBackgroundRef | null;
  class: CharacterClassRef | null;
  boostChoices: BoostChoicesByLevel;
  skills: CharacterSkills;
  feats: FeatChoice[];
}

const STEPS: WizardStep[] = [
  'lineage', 'background', 'class',
  'abilities', 'skills', 'feats', 'review',
];

function blankBoosts(): BoostChoicesByLevel {
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

function blankDraft(): CharacterDraft {
  return {
    name: '',
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

function isStepComplete(step: WizardStep, draft: CharacterDraft): boolean {
  switch (step) {
    case 'lineage': return draft.name.trim().length > 0 && draft.ancestry !== null && draft.heritage !== null;
    case 'background': return draft.background !== null;
    case 'class': return draft.class !== null && draft.boostChoices.classKeyAbility !== null;
    case 'abilities': return true; // always passable
    case 'skills': return true;
    case 'feats': return true;
    case 'review': return true;
    default: return false;
  }
}

export function useCharacterWizard() {
  const [draft, setDraft] = useState<CharacterDraft>(blankDraft());
  const [activeStep, setActiveStep] = useState<WizardStep>('lineage');
  const [saving, setSaving] = useState(false);

  const activeIndex = STEPS.indexOf(activeStep);

  const stepLabels: Record<WizardStep, string> = {
    'lineage': 'Lineage',
    'background': 'Background',
    'class': 'Class',
    'abilities': 'Abilities',
    'skills': 'Skills',
    'feats': 'Feats',
    'review': 'Review',
  };

  const stepMeta: WizardStepMeta[] = STEPS.map((key, i) => ({
    key,
    label: stepLabels[key],
    completed: i < activeIndex || isStepComplete(key, draft),
  }));

  const canBack = activeIndex > 0;
  const canNext = activeIndex < STEPS.length - 1 && isStepComplete(activeStep, draft);
  const isLastStep = activeIndex === STEPS.length - 1;
  const canFinish = isLastStep && (['lineage', 'background', 'class'] as WizardStep[])
    .every(s => isStepComplete(s, draft));

  const goBack = useCallback(() => {
    setActiveStep(prev => {
      const i = STEPS.indexOf(prev);
      return i > 0 ? STEPS[i - 1] : prev;
    });
  }, []);

  const goNext = useCallback(() => {
    setActiveStep(prev => {
      const i = STEPS.indexOf(prev);
      return i < STEPS.length - 1 ? STEPS[i + 1] : prev;
    });
  }, []);

  const jumpTo = useCallback((step: WizardStep) => {
    const targetIdx = STEPS.indexOf(step);
    const currentIdx = STEPS.indexOf(activeStep);
    if (targetIdx <= currentIdx) {
      setActiveStep(step);
    }
  }, [activeStep]);

  const updateDraft = useCallback((patch: Partial<CharacterDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const setAncestry = useCallback((ancestry: CharacterAncestryRef | null) => {
    setDraft(prev => ({
      ...prev,
      ancestry,
      heritage: null, // reset heritage when ancestry changes
      boostChoices: { ...prev.boostChoices, ancestryBoosts: [] },
    }));
  }, []);

  const setHeritage = useCallback((heritage: CharacterHeritageRef | null) => {
    setDraft(prev => ({ ...prev, heritage }));
  }, []);

  const setBackground = useCallback((background: CharacterBackgroundRef | null) => {
    setDraft(prev => {
      const newSkills = applyLockedSkills(blankSkills(), background, prev.class);
      return {
        ...prev,
        background,
        boostChoices: { ...prev.boostChoices, backgroundBoost: null, backgroundFreeBoost: null },
        skills: newSkills,
      };
    });
  }, []);

  const setClass = useCallback((cls: CharacterClassRef | null) => {
    setDraft(prev => {
      const newSkills = applyLockedSkills(blankSkills(), prev.background, cls);
      const slots = computeFeatSlots(cls, prev.level);
      const newFeats = mergeFeatChoices(slots, prev.feats);
      return {
        ...prev,
        class: cls,
        boostChoices: { ...prev.boostChoices, classKeyAbility: cls?.keyAbilityOptions[0] ?? null },
        skills: newSkills,
        feats: newFeats,
      };
    });
  }, []);

  const setBoostChoices = useCallback((boostChoices: BoostChoicesByLevel) => {
    setDraft(prev => ({ ...prev, boostChoices }));
  }, []);

  const setSkills = useCallback((skills: CharacterSkills) => {
    setDraft(prev => ({ ...prev, skills }));
  }, []);

  const setFeats = useCallback((feats: FeatChoice[]) => {
    setDraft(prev => ({ ...prev, feats }));
  }, []);

  const buildCharacter = useCallback((): CharacterRecord => {
    const fixedBoosts = draft.ancestry?.fixedBoosts ?? [];
    const flaw = draft.ancestry?.flaw ?? null;
    const abilityScores = computeAbilityScores(
      draft.boostChoices, fixedBoosts, flaw, draft.level,
    );
    const derivedStats = computeDerivedStats(
      abilityScores, draft.class, draft.ancestry, draft.level, draft.boostChoices,
    );
    const now = Date.now();
    return {
      id: `pc-${now}`,
      name: draft.name,
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
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(blankDraft());
    setActiveStep('lineage');
  }, []);

  return {
    draft,
    activeStep,
    stepMeta,
    canBack,
    canNext,
    isLastStep,
    canFinish,
    saving,
    setSaving,
    goBack,
    goNext,
    jumpTo,
    updateDraft,
    setAncestry,
    setHeritage,
    setBackground,
    setClass,
    setBoostChoices,
    setSkills,
    setFeats,
    buildCharacter,
    reset,
  };
}
