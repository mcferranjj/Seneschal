import type { ReactNode } from 'react';
import type { WizardStep, WizardStepMeta } from './wizardTypes';
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
          const isActive    = meta.key === activeStep;
          const isCompleted = meta.completed && !isActive;
          const isReachable = meta.reachable;

          return (
            <button
              key={meta.key}
              className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${!isReachable ? styles.future : ''}`}
              onClick={() => isReachable && onJump(meta.key)}
              disabled={!isReachable}
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
