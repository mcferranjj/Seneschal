import styles from './EmptyCharacterState.module.css';

interface EmptyCharacterStateProps {
  onNew: () => void;
}

export function EmptyCharacterState({ onNew }: EmptyCharacterStateProps) {
  return (
    <div className={styles.container}>
      <span className={styles.icon}>✦</span>
      <h2 className={styles.heading}>No Characters</h2>
      <button className={styles.btn} onClick={onNew}>
        Create Character
      </button>
    </div>
  );
}
