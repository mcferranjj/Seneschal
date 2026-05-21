import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import type { CharacterRecord } from '../../../db/schema';
import { useCharacterWizard } from '../hooks/useCharacterWizard';
import { useCharBuilderSync } from '../hooks/useCharBuilderSync';
import { CharBuilderSyncBanner } from '../CharBuilderSyncBanner';
import { WizardProgress } from './WizardProgress';
import { WizardRightPanelProvider } from './WizardRightPanelContext';
import { WizardStepLineage } from './steps/WizardStepLineage';
import { WizardStepBackground } from './steps/WizardStepBackground';
import { WizardStepClass } from './steps/WizardStepClass';
import { WizardStepAbilities } from './steps/WizardStepAbilities';
import { WizardStepSkills } from './steps/WizardStepSkills';
import { WizardStepFeats } from './steps/WizardStepFeats';
import { WizardStepReview } from './steps/WizardStepReview';
import { useNav } from '../../../nav/NavContext';
import styles from './CharacterWizard.module.css';

interface CharacterWizardProps {
  onComplete: (record: CharacterRecord) => Promise<void>;
  onCancel: () => void;
  /** Optional node rendered at the start of the header row (e.g. sidebar expand button). */
  headerLeft?: React.ReactNode;
}

export function CharacterWizard({ onComplete, onCancel, headerLeft }: CharacterWizardProps) {
  const { isSyncing, progress, triggerSync, hasData } = useCharBuilderSync();
  const wizard = useCharacterWizard();
  const {
    draft, activeStep, stepMeta,
    canBack, canNext, isLastStep, canFinish, saving,
    setSaving, goBack, goNext, jumpTo,
    updateDraft, setAncestry, setHeritage, setBackground, setClass,
    setBoostChoices, setSkills, setFeats, buildCharacter,
  } = wizard;

  // Stable ref to activeStep so the undo closure below captures the step we
  // were on at click-time, not whatever state was current when the wizard
  // first rendered.
  type WizardStep = Parameters<typeof jumpTo>[0];
  const activeStepRef = useRef(activeStep);
  activeStepRef.current = activeStep;

  const { push: navPush } = useNav();

  // Push an undo entry that restores the given prior step, then run `apply`.
  // `goNext` and `jumpTo` differ (goNext respects validation rules, jumpTo
  // only allows going backwards), so we can't collapse this to useNavSetter
  // here — but the wrapping pattern is the same.
  const pushStepUndo = useCallback((stepBefore: WizardStep) => {
    navPush({
      undo: () => jumpTo(stepBefore),
      label: `Back to ${stepMeta.find(s => s.key === stepBefore)?.label ?? stepBefore}`,
      scope: 'characters',
    });
  }, [navPush, jumpTo, stepMeta]);

  function handleGoNext() {
    pushStepUndo(activeStepRef.current);
    goNext();
  }

  function handleJumpTo(step: WizardStep) {
    const stepBefore = activeStepRef.current;
    if (step === stepBefore) return;
    pushStepUndo(stepBefore);
    jumpTo(step);
  }

  // Right-panel portal target — captured via callback ref so children can
  // portal into it on first render after mount.
  const [rightTarget, setRightTarget] = useState<HTMLElement | null>(null);

  async function handleFinish() {
    if (!canFinish) return;
    setSaving(true);
    try {
      const record = buildCharacter();
      await onComplete(record);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.header}>
        {headerLeft && <div className={styles.headerLeft}>{headerLeft}</div>}
        <h2 className={styles.title}>Character Builder</h2>
      </div>
      <WizardProgress
        stepMeta={stepMeta}
        activeStep={activeStep}
        onJump={handleJumpTo}
        actions={
          <>
            <button
              className={styles.navCancelBtn}
              onClick={onCancel}
              disabled={saving}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.navBackBtn}
              onClick={goBack}
              disabled={!canBack || saving}
              type="button"
            >
              ← Back
            </button>
            {isLastStep ? (
              <button
                className={styles.navFinishBtn}
                onClick={handleFinish}
                disabled={saving || !canFinish}
                type="button"
              >
                {saving ? 'Creating…' : 'Create Character'}
              </button>
            ) : (
              <button
                className={styles.navNextBtn}
                onClick={handleGoNext}
                disabled={!canNext || saving}
                type="button"
              >
                Next →
              </button>
            )}
          </>
        }
      />
      {hasData === false && (
        <CharBuilderSyncBanner
          isSyncing={isSyncing}
          progress={progress}
          onSync={triggerSync}
        />
      )}
      <div className={styles.body}>
        <div className={styles.bodyLeft}>
          <WizardRightPanelProvider target={rightTarget}>
            {activeStep === 'lineage' && (
              <WizardStepLineage
                draft={draft}
                onChange={updateDraft}
                onAncestrySelect={setAncestry}
                onHeritageSelect={setHeritage}
                onAdvance={handleGoNext}
              />
            )}
            {activeStep === 'background' && (
              <WizardStepBackground
                selected={draft.background}
                onSelect={setBackground}
                onConfirm={handleGoNext}
              />
            )}
            {activeStep === 'class' && (
              <WizardStepClass
                selected={draft.class}
                keyAbility={draft.boostChoices.classKeyAbility}
                onSelect={setClass}
                onKeyAbilityChange={(ka) => setBoostChoices({ ...draft.boostChoices, classKeyAbility: ka })}
                onConfirm={handleGoNext}
              />
            )}
            {activeStep === 'abilities' && (
              <WizardStepAbilities
                draft={draft}
                onChange={setBoostChoices}
              />
            )}
            {activeStep === 'skills' && (
              <WizardStepSkills
                draft={draft}
                onChange={setSkills}
              />
            )}
            {activeStep === 'feats' && (
              <WizardStepFeats
                draft={draft}
                onChange={setFeats}
              />
            )}
            {activeStep === 'review' && (
              <WizardStepReview
                draft={draft}
                onFinish={handleFinish}
                saving={saving}
              />
            )}
          </WizardRightPanelProvider>
        </div>
        <aside ref={setRightTarget} className={styles.bodyRight} />
      </div>
    </div>
  );
}

