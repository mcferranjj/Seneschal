import type { ReactNode } from 'react';
import styles from './RaritySection.module.css';

export interface RaritySectionProps {
  rarity: string;
  children: ReactNode;
  /** When true, the rarity header is hidden so the section visually collapses
   *  along with the cards inside it. */
  hideHeader?: boolean;
}

export function RaritySection({ rarity, children, hideHeader }: RaritySectionProps) {
  return (
    <div className={`${styles.rarityGroup} ${hideHeader ? styles.rarityGroupCollapsed : ''}`}>
      <div
        className={`${styles.rarityHeader} ${styles[`rarity_${rarity}`]} ${hideHeader ? styles.rarityHeaderHidden : ''}`}
        aria-hidden={hideHeader || undefined}
      >
        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
      </div>
      {children}
    </div>
  );
}
