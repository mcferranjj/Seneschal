import type { ReactNode } from 'react';
import type { WizardStep, WizardStepMeta } from '../hooks/useCharacterWizard';
import styles from './WizardProgress.module.css';

interface WizardProgressProps {
  stepMeta: WizardStepMeta[];
  activeStep: WizardStep;
  onJump: (step: WizardStep) => void;
  actions?: ReactNode;
}

export function WizardProgress({ stepMeta, activeStep, onJump, actions }: WizardProgressProps) {
  const activeIdx = stepMeta.findIndex(m => m.key === activeStep);

  return (
    <div className={styles.bar}>
      <div className={styles.steps}>
        {stepMeta.map((meta, i) => {
          const isActive = meta.key === activeStep;
          // Only mark prior steps as completed (the ones the user has actually moved past).
          const isCompleted = i < activeIdx && meta.completed;
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
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
