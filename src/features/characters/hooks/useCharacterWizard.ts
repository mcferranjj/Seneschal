import { useState, useCallback } from 'react';
import type {
  CharacterRecord, CharacterSkills,
  BoostChoicesByLevel, FeatChoice, CharacterAncestryRef, CharacterHeritageRef,
  CharacterBackgroundRef, CharacterClassRef, CharacterSubclassRef,
} from '../../../db/schema';
import { blankSkills, applyLockedSkills } from '../utils/skillHelpers';
import { computeFeatSlots, mergeFeatChoices } from '../utils/featSlots';
import {
  WIZARD_STEPS, WIZARD_STEP_LABELS,
  type WizardStep, type WizardStepMeta, type CharacterDraft,
} from '../wizard/wizardTypes';
import { blankDraft, isStepComplete, buildCharacterFromDraft } from '../wizard/wizardDraft';

// Re-export so existing callers can keep their `import { … } from '../hooks/useCharacterWizard'`
// paths working. New code should import directly from `wizard/wizardTypes`.
export type { WizardStep, WizardStepMeta, CharacterDraft };

export function useCharacterWizard() {
  const [draft, setDraft] = useState<CharacterDraft>(blankDraft());
  const [activeStep, setActiveStep] = useState<WizardStep>('lineage');
  // The furthest step index ever reached — used to keep checkmarks and allow
  // jumping forward to any previously-visited step.
  const [highWaterMark, setHighWaterMark] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeIndex = WIZARD_STEPS.indexOf(activeStep);

  const stepMeta: WizardStepMeta[] = WIZARD_STEPS.map((key, i) => ({
    key,
    label: WIZARD_STEP_LABELS[key],
    // A step is completed only if the user has advanced *past* it (i.e. it sits
    // behind the high-water mark) AND its own completion check still passes.
    // Steps at or ahead of the high-water mark are merely "reachable" or active.
    completed: i < highWaterMark && isStepComplete(key, draft),
    reachable: i <= highWaterMark,
  }));

  const canBack = activeIndex > 0;
  const canNext = activeIndex < WIZARD_STEPS.length - 1 && isStepComplete(activeStep, draft);
  const isLastStep = activeIndex === WIZARD_STEPS.length - 1;
  const canFinish = isLastStep && (['lineage', 'background', 'class'] as WizardStep[])
    .every(s => isStepComplete(s, draft));

  const goBack = useCallback(() => {
    setActiveStep(prev => {
      const i = WIZARD_STEPS.indexOf(prev);
      return i > 0 ? WIZARD_STEPS[i - 1] : prev;
    });
  }, []);

  const goNext = useCallback(() => {
    setActiveStep(prev => {
      const i = WIZARD_STEPS.indexOf(prev);
      const next = i < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[i + 1] : prev;
      setHighWaterMark(hw => Math.max(hw, WIZARD_STEPS.indexOf(next)));
      return next;
    });
  }, []);

  const jumpTo = useCallback((step: WizardStep) => {
    const targetIdx = WIZARD_STEPS.indexOf(step);
    // Allow jumping to any step within the high-water mark
    if (targetIdx <= highWaterMark) {
      setActiveStep(step);
    }
  }, [highWaterMark]);

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
        subclass: null, // reset subclass whenever the class changes
        boostChoices: { ...prev.boostChoices, classKeyAbility: cls?.keyAbilityOptions[0] ?? null },
        skills: newSkills,
        feats: newFeats,
      };
    });
  }, []);

  const setSubclass = useCallback((subclass: CharacterSubclassRef | null) => {
    setDraft(prev => ({ ...prev, subclass }));
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

  const buildCharacter = useCallback((): CharacterRecord => buildCharacterFromDraft(draft), [draft]);

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
    setSubclass,
    setBoostChoices,
    setSkills,
    setFeats,
    buildCharacter,
    reset,
  };
}
