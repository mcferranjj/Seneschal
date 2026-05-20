import type { ReactNode, Ref } from 'react';
import styles from './EntityCard.module.css';

export interface EntityCardAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface EntityCardProps {
  name: string;
  selected?: boolean;
  stats?: ReactNode;
  traits?: string[];
  onClick: () => void;
  onDoubleClick?: () => void;
  /** Optional action button rendered at the bottom of the card. */
  action?: EntityCardAction;
  /**
   * When true, the card animates to a hidden, zero-height state. Used by the
   * ancestry picker to collapse non-selected cards away after the user locks
   * in their choice while still keeping the DOM nodes around for the reverse
   * animation when they deselect.
   */
  collapsed?: boolean;
  /** Optional DOM ref forwarded to the root card element, used by parents for scroll-into-view etc. */
  domRef?: Ref<HTMLDivElement>;
}

export function EntityCard({ name, selected, stats, traits, onClick, onDoubleClick, action, collapsed, domRef }: EntityCardProps) {
  return (
    <div
      ref={domRef}
      className={`${styles.card} ${selected ? styles.cardSelected : ''} ${collapsed ? styles.cardCollapsed : ''}`}
      onClick={collapsed ? undefined : onClick}
      onDoubleClick={collapsed ? undefined : onDoubleClick}
      role="button"
      tabIndex={collapsed ? -1 : 0}
      aria-hidden={collapsed || undefined}
      onKeyDown={e => {
        if (collapsed) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
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
      {action && (
        <button
          type="button"
          className={`${styles.actionBtn} ${action.variant === 'secondary' ? styles.actionBtnSecondary : styles.actionBtnPrimary}`}
          onClick={e => {
            e.stopPropagation();
            action.onClick();
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
