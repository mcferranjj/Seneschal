import type { ReactNode } from 'react';
import { WizardRightPanelSlot } from '../WizardRightPanelContext';
import styles from './PickerLayout.module.css';

interface PickerLayoutPropsWithSearch {
  suppressSearch?: false;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
}

interface PickerLayoutPropsWithoutSearch {
  suppressSearch: true;
  search?: never;
  onSearchChange?: never;
  searchPlaceholder?: never;
}

type PickerLayoutSearchProps = PickerLayoutPropsWithSearch | PickerLayoutPropsWithoutSearch;

export type PickerLayoutProps = PickerLayoutSearchProps & {
  title?: string;
  sub?: string;
  loading?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  detail?: ReactNode;
  detailPlaceholder?: string;
  /** When true, this picker does not project anything into the wizard's right-hand column. */
  suppressDetailPanel?: boolean;
  /**
   * When true, the list container does not create its own scroll context —
   * the parent scroll container is responsible instead. Use this when you want
   * the heading to scroll away naturally rather than always being visible.
   */
  suppressListScroll?: boolean;
};

export function PickerLayout({
  title,
  sub,
  loading = false,
  emptyMessage,
  children,
  detail,
  detailPlaceholder = 'Select an option to see details.',
  suppressDetailPanel = false,
  suppressSearch = false,
  suppressListScroll = false,
  ...searchProps
}: PickerLayoutProps) {
  const search           = suppressSearch ? '' : (searchProps as PickerLayoutPropsWithSearch).search;
  const onSearchChange   = suppressSearch ? undefined : (searchProps as PickerLayoutPropsWithSearch).onSearchChange;
  const searchPlaceholder = suppressSearch ? 'Search…' : ((searchProps as PickerLayoutPropsWithSearch).searchPlaceholder ?? 'Search…');
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
          {!suppressSearch && onSearchChange && (
            <input
              className={styles.search}
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          )}
          {loading && <div className={styles.loading}>Loading…</div>}
          {!loading && emptyMessage && <div className={styles.loading}>{emptyMessage}</div>}
          {!loading && (
            <div className={suppressListScroll ? styles.listContainerFlat : styles.listContainer}>
              {children}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
