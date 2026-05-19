import styles from './WizardNav.module.css';

interface WizardNavProps {
  canBack: boolean;
  canNext: boolean;
  isLastStep: boolean;
  canFinish: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function WizardNav({
  canBack, canNext, isLastStep, canFinish, onBack, onNext, onFinish, onCancel, saving,
}: WizardNavProps) {
  return (
    <div className={styles.bar}>
      <button className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
        Cancel
      </button>
      <div className={styles.navBtns}>
        <button
          className={styles.backBtn}
          onClick={onBack}
          disabled={!canBack || saving}
        >
          ← Back
        </button>
        {isLastStep ? (
          <button
            className={styles.finishBtn}
            onClick={onFinish}
            disabled={saving || !canFinish}
          >
            {saving ? 'Creating…' : 'Create Character'}
          </button>
        ) : (
          <button
            className={styles.nextBtn}
            onClick={onNext}
            disabled={!canNext || saving}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
