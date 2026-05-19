import type { ReactNode } from 'react';
import styles from './EntityCard.module.css';

export interface EntityCardProps {
  name: string;
  selected?: boolean;
  stats?: ReactNode;
  traits?: string[];
  onClick: () => void;
}

export function EntityCard({ name, selected, stats, traits, onClick }: EntityCardProps) {
  return (
    <button
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      onClick={onClick}
    >
      <div className={styles.cardName}>{name}</div>
      {stats && <div className={styles.cardStats}>{stats}</div>}
      {traits && traits.length > 0 && (
        <div className={styles.traits}>
          {traits.map(t => (
            <span key={t} className={styles.trait}>{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}
