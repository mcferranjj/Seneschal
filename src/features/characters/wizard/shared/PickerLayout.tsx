import type { ReactNode } from 'react';
import { WizardRightPanelSlot } from '../WizardRightPanelContext';
import styles from './PickerLayout.module.css';

export interface PickerLayoutProps {
  title?: string;
  sub?: string;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  detail?: ReactNode;
  detailPlaceholder?: string;
  /** When true, this picker does not project anything into the wizard's right-hand column. */
  suppressDetailPanel?: boolean;
}

export function PickerLayout({
  title,
  sub,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  loading = false,
  emptyMessage,
  children,
  detail,
  detailPlaceholder = 'Select an option to see details.',
  suppressDetailPanel = false,
}: PickerLayoutProps) {
  return (
    <>
      {!suppressDetailPanel && (
        <WizardRightPanelSlot>
          {detail ?? (
            <div className={styles.detailPlaceholder}>
              <p>{detailPlaceholder}</p>
            </div>
          )}
        </WizardRightPanelSlot>
      )}
      <div className={styles.step}>
        <div className={styles.left}>
          {title && (
            <div className={styles.heading}>
              <h3 className={styles.title}>{title}</h3>
              {sub && <p className={styles.sub}>{sub}</p>}
            </div>
          )}
          <input
            className={styles.search}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
          {loading && <div className={styles.loading}>Loading…</div>}
          {!loading && emptyMessage && <div className={styles.loading}>{emptyMessage}</div>}
          {!loading && <div className={styles.listContainer}>{children}</div>}
        </div>
      </div>
    </>
  );
}
