import { useEffect, useRef } from 'react';
import type { PartyRecord } from '../../db/schema';
import { useBackable } from '../../nav/useBackable';
import { partyRowSubLabel } from './partySelectors';
import styles from './PartyPickerMenu.module.css';

export interface PartyPickerMenuProps {
  parties: PartyRecord[];
  activePartyId: string | null;
  anchorRef: React.RefObject<HTMLElement | null>;
  onCreate: () => void;
  onInsert: (p: PartyRecord) => void;
  onEdit: (p: PartyRecord) => void;
  onDetach: () => void;
  onClose: () => void;
}

export function PartyPickerMenu({
  parties,
  activePartyId,
  anchorRef,
  onCreate,
  onInsert,
  onEdit,
  onDetach,
  onClose,
}: PartyPickerMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Position the menu below the anchor button
  useEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
  });

  // Close on Escape — handled entirely by useBackable's escClosable. We do NOT
  // register a separate keydown listener here, to avoid double-handling Escape
  // (which would race with the nav stack and could pop two entries at once).
  useBackable(true, onClose, 'Close party menu', { scope: 'gm', escClosable: true });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div ref={menuRef} className={styles.menu} role="menu">
      <div className={styles.menuHeader}>
        <button className={styles.newBtn} onClick={onCreate}>
          + New party
        </button>
        {activePartyId && (
          <button className={styles.detachBtn} onClick={onDetach}>
            Detach active party
          </button>
        )}
      </div>
      <div className={styles.partyList}>
        {parties.length === 0 ? (
          <div className={styles.emptyHint}>No saved parties yet</div>
        ) : (
          parties.map(p => (
            <div
              key={p.id}
              className={`${styles.partyRow} ${p.id === activePartyId ? styles.partyRowActive : ''}`}
            >
              <div className={styles.partyInfo}>
                <div className={styles.partyName}>{p.name}</div>
                <div className={styles.partySub}>{partyRowSubLabel(p)}</div>
              </div>
              <div className={styles.rowActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => onInsert(p)}
                  title="Insert party into encounter"
                >
                  Insert
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => onEdit(p)}
                  title="Edit party"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
