import type { ReactNode } from 'react';
import styles from './RaritySection.module.css';

export interface RaritySectionProps {
  rarity: string;
  children: ReactNode;
}

export function RaritySection({ rarity, children }: RaritySectionProps) {
  return (
    <div className={styles.rarityGroup}>
      <div className={`${styles.rarityHeader} ${styles[`rarity_${rarity}`]}`}>
        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
      </div>
      {children}
    </div>
  );
}
