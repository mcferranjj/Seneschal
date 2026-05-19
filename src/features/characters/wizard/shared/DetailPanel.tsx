import type { ReactNode } from 'react';
import styles from './DetailPanel.module.css';

export interface DetailPanelProps {
  name: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DetailPanel({ name, badge, children, className }: DetailPanelProps) {
  return (
    <div className={`${styles.detail} ${className || ''}`}>
      {badge ? (
        <div className={styles.detailHeader}>
          <h4 className={styles.detailName}>{name}</h4>
          {badge}
        </div>
      ) : (
        <h4 className={styles.detailName}>{name}</h4>
      )}
      {children}
    </div>
  );
}

export interface DetailSectionProps {
  label: string;
  children: ReactNode;
}

export function DetailSection({ label, children }: DetailSectionProps) {
  return (
    <div className={styles.detailSection}>
      <div className={styles.detailSectionLabel}>{label}</div>
      {children}
    </div>
  );
}
