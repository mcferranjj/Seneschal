import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import styles from './WizardStepInfo.module.css';

interface WizardStepInfoProps {
  name: string;
  playerName: string;
  level: number;
  onChange: (patch: Partial<CharacterDraft>) => void;
}

export function WizardStepInfo({ name, playerName, level, onChange }: WizardStepInfoProps) {
  return (
    <div className={styles.step}>
      <div className={styles.heading}>
        <h3 className={styles.title}>Character Info</h3>
        <p className={styles.sub}>Basic information about your character.</p>
      </div>

      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Character Name <span className={styles.required}>*</span></span>
          <input
            className={styles.input}
            value={name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="e.g. Aldric Ironveil"
            autoFocus
          />
          {!name.trim() && (
            <span className={styles.hint}>Character name is required to continue.</span>
          )}
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Player Name</span>
          <input
            className={styles.input}
            value={playerName}
            onChange={e => onChange({ playerName: e.target.value })}
            placeholder="e.g. Joshua"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Starting Level</span>
          <div className={styles.levelRow}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
              <button
                key={l}
                className={`${styles.levelBtn} ${level === l ? styles.levelActive : ''}`}
                onClick={() => onChange({ level: l })}
              >
                {l}
              </button>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}
