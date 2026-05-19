import { useState } from 'react';
import type { CharacterRecord } from '../../../db/schema';
import styles from './SheetCharacterInfo.module.css';

interface SheetCharacterInfoProps {
  character: CharacterRecord;
}

export function SheetCharacterInfo({ character }: SheetCharacterInfoProps) {
  const [open, setOpen] = useState(false);
  const { ancestry, heritage, background, class: cls } = character;

  const speed = ancestry?.speed ?? null;
  const size = ancestry?.size ?? null;
  const vision = ancestry?.vision ?? null;
  const traits = ancestry?.traits ?? [];
  const languages = ancestry?.languages ?? [];

  return (
    <div className={styles.block}>
      <button className={styles.header} onClick={() => setOpen(v => !v)}>
        <h3 className={styles.title}>Character Info</h3>
        <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className={styles.body}>
          {speed !== null && (
            <div className={styles.row}>
              <span className={styles.label}>Speed</span>
              <span className={styles.value}>{speed} ft.</span>
            </div>
          )}
          {size && (
            <div className={styles.row}>
              <span className={styles.label}>Size</span>
              <span className={styles.value}>{size.charAt(0).toUpperCase() + size.slice(1)}</span>
            </div>
          )}
          {vision && (
            <div className={styles.row}>
              <span className={styles.label}>Vision</span>
              <span className={styles.value}>{vision.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            </div>
          )}
          {background?.grantedFeatName && (
            <div className={styles.row}>
              <span className={styles.label}>Background Feat</span>
              <span className={styles.value}>{background.grantedFeatName}</span>
            </div>
          )}
          {cls && (
            <div className={styles.row}>
              <span className={styles.label}>Class HP/Level</span>
              <span className={styles.value}>{cls.hp}</span>
            </div>
          )}
          {traits.length > 0 && (
            <div className={styles.traitRow}>
              <span className={styles.label}>Traits</span>
              <div className={styles.chips}>
                {traits.map(t => (
                  <span key={t} className={styles.chip}>{t}</span>
                ))}
                {heritage && (
                  <span className={styles.chip}>{heritage.name}</span>
                )}
              </div>
            </div>
          )}
          {languages.length > 0 && (
            <div className={styles.row}>
              <span className={styles.label}>Languages</span>
              <span className={styles.value}>{languages.join(', ')}</span>
            </div>
          )}
          {!ancestry && !cls && (
            <p className={styles.empty}>No character info available.</p>
          )}
        </div>
      )}
    </div>
  );
}
