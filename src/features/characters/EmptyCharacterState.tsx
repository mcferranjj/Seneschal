import styles from './EmptyCharacterState.module.css';

interface EmptyCharacterStateProps {
  onNew: () => void;
}

export function EmptyCharacterState({ onNew }: EmptyCharacterStateProps) {
  return (
    <div className={styles.container}>
      <span className={styles.icon}>✦</span>
      <h2 className={styles.heading}>No Characters</h2>
      <p className={styles.sub}>
        Build a PF2e Remaster character step by step, or import one later.
      </p>
      <button className={styles.btn} onClick={onNew}>
        Create Character
      </button>
    </div>
  );
}
