import type { WizardStep, WizardStepMeta } from '../hooks/useCharacterWizard';
import styles from './WizardProgress.module.css';

interface WizardProgressProps {
  stepMeta: WizardStepMeta[];
  activeStep: WizardStep;
  onJump: (step: WizardStep) => void;
}

export function WizardProgress({ stepMeta, activeStep, onJump }: WizardProgressProps) {
  return (
    <div className={styles.bar}>
      {stepMeta.map((meta, i) => {
        const isActive = meta.key === activeStep;
        const isCompleted = meta.completed && !isActive;
        const activeIdx = stepMeta.findIndex(m => m.key === activeStep);
        const isFuture = i > activeIdx;

        return (
          <button
            key={meta.key}
            className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${isFuture ? styles.future : ''}`}
            onClick={() => !isFuture && onJump(meta.key)}
            disabled={isFuture}
            title={meta.label}
          >
            <span className={styles.stepNum}>
              {isCompleted ? '✓' : i + 1}
            </span>
            <span className={styles.stepLabel}>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
