import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import type { CharacterRecord } from '../../../../db/schema';
import { computeAbilityScores } from '../../utils/abilityComputation';
import { computeDerivedStats } from '../../utils/derivedStats';
import { CharacterSheet } from '../../sheet/CharacterSheet';
import styles from './WizardStepReview.module.css';

interface WizardStepReviewProps {
  draft: CharacterDraft;
  onFinish: () => void;
  saving: boolean;
}

export function WizardStepReview({ draft, onFinish, saving }: WizardStepReviewProps) {
  // Build preview character record from draft
  const fixedBoosts = draft.ancestry?.fixedBoosts ?? [];
  const flaw = draft.ancestry?.flaw ?? null;
  const abilityScores = computeAbilityScores(
    draft.boostChoices,
    fixedBoosts,
    flaw,
    draft.level,
  );
  const derivedStats = computeDerivedStats(
    abilityScores,
    draft.class,
    draft.ancestry,
    draft.level,
    draft.boostChoices,
  );

  const previewRecord: CharacterRecord = {
    id: 'preview',
    name: draft.name,
    playerName: draft.playerName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    level: draft.level,
    ancestry: draft.ancestry,
    heritage: draft.heritage,
    background: draft.background,
    class: draft.class,
    subclass: draft.subclass,
    abilityScores,
    boostChoices: draft.boostChoices,
    skills: draft.skills,
    feats: draft.feats,
    currentHp: derivedStats.maxHp,
    tempHp: 0,
    derivedStats,
  };

  return (
    <div className={styles.step}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h3 className={styles.title}>Review Your Character</h3>
          <p className={styles.sub}>Review your character sheet before creating.</p>
        </div>
        <button
          className={styles.finishBtn}
          onClick={onFinish}
          disabled={saving}
        >
          {saving ? 'Creating…' : 'Create Character'}
        </button>
      </div>

      <div className={styles.preview}>
        <CharacterSheet
          character={previewRecord}
          onUpdate={async () => {}} // no-op for preview
          onDelete={() => {}} // no-op for preview
          previewMode={true}
        />
      </div>
    </div>
  );
}
