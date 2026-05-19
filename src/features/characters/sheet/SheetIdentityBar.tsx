import { useState } from 'react';
import type { CharacterRecord } from '../../../db/schema';
import styles from './SheetIdentityBar.module.css';

interface SheetIdentityBarProps {
  character: CharacterRecord;
  onDelete: () => void;
}

export function SheetIdentityBar({ character, onDelete }: SheetIdentityBarProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const ancestry = character.ancestry?.name ?? '';
  const heritage = character.heritage?.name ?? '';
  const background = character.background?.name ?? '';
  const cls = character.class?.name ?? '';

  const subLine = [ancestry, heritage, background, cls]
    .filter(Boolean)
    .join(' · ');

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
  }

  return (
    <div className={styles.bar}>
      <div className={styles.identity}>
        <h2 className={styles.name}>{character.name || 'Unnamed'}</h2>
        <div className={styles.sub}>
          {character.playerName && <span className={styles.player}>{character.playerName}</span>}
          {subLine && <span className={styles.subLine}>{subLine}</span>}
          <span className={styles.level}>Level {character.level}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.levelUpBtn}
          disabled
          title="Coming soon"
        >
          Level Up
        </button>
        {confirmDelete ? (
          <>
            <span className={styles.confirmText}>Delete?</span>
            <button className={styles.confirmDeleteBtn} onClick={handleDelete}>Yes</button>
            <button className={styles.cancelDeleteBtn} onClick={() => setConfirmDelete(false)}>No</button>
          </>
        ) : (
          <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
        )}
      </div>
    </div>
  );
}
