import type { CharacterRecord } from '../../../db/schema';
import { useCharacterWizard } from '../hooks/useCharacterWizard';
import { WizardProgress } from './WizardProgress';
import { WizardNav } from './WizardNav';
import { WizardStepInfo } from './steps/WizardStepInfo';
import { WizardStepAncestry } from './steps/WizardStepAncestry';
import { WizardStepHeritage } from './steps/WizardStepHeritage';
import { WizardStepBackground } from './steps/WizardStepBackground';
import { WizardStepClass } from './steps/WizardStepClass';
import { WizardStepAbilities } from './steps/WizardStepAbilities';
import { WizardStepSkills } from './steps/WizardStepSkills';
import { WizardStepFeats } from './steps/WizardStepFeats';
import { WizardStepReview } from './steps/WizardStepReview';
import styles from './CharacterWizard.module.css';

interface CharacterWizardProps {
  onComplete: (record: CharacterRecord) => Promise<void>;
  onCancel: () => void;
}

export function CharacterWizard({ onComplete, onCancel }: CharacterWizardProps) {
  const wizard = useCharacterWizard();
  const {
    draft, activeStep, stepMeta,
    canBack, canNext, isLastStep, canFinish, saving,
    setSaving, goBack, goNext, jumpTo,
    updateDraft, setAncestry, setHeritage, setBackground, setClass,
    setBoostChoices, setSkills, setFeats, buildCharacter,
  } = wizard;

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
        <h2 className={styles.title}>Character Builder</h2>
      </div>
      <WizardProgress
        stepMeta={stepMeta}
        activeStep={activeStep}
        onJump={jumpTo}
      />
      <div className={styles.body}>
        {activeStep === 'info' && (
          <WizardStepInfo
            name={draft.name}
            playerName={draft.playerName}
            level={draft.level}
            onChange={updateDraft}
          />
        )}
        {activeStep === 'ancestry' && (
          <WizardStepAncestry
            selected={draft.ancestry}
            onSelect={setAncestry}
          />
        )}
        {activeStep === 'heritage' && (
          <WizardStepHeritage
            ancestrySlug={draft.ancestry?.slug}
            selected={draft.heritage}
            onSelect={setHeritage}
          />
        )}
        {activeStep === 'background' && (
          <WizardStepBackground
            selected={draft.background}
            onSelect={setBackground}
          />
        )}
        {activeStep === 'class' && (
          <WizardStepClass
            selected={draft.class}
            keyAbility={draft.boostChoices.classKeyAbility}
            onSelect={setClass}
            onKeyAbilityChange={(ka) => setBoostChoices({ ...draft.boostChoices, classKeyAbility: ka })}
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
      </div>
      <WizardNav
        canBack={canBack}
        canNext={canNext}
        isLastStep={isLastStep}
        canFinish={canFinish}
        onBack={goBack}
        onNext={goNext}
        onFinish={handleFinish}
        onCancel={onCancel}
        saving={saving}
      />
    </div>
  );
}
