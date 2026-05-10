import { useEffect, useRef } from 'react';
import type { RollHistoryEntry } from '../../types/diceHistory';
import { formatTime } from '../../utils/formatters';
import styles from './RollHistory.module.css';

interface RollHistoryProps {
  entries: RollHistoryEntry[];
  onClear: () => void;
  onClose: () => void;
}

export function RollHistory({ entries, onClear, onClose }: RollHistoryProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  // Scroll to top when new entry arrives
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [entries.length]);

  return (
    <div ref={panelRef} className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>🎲 Roll History</span>
        <div className={styles.headerActions}>
          <button className={styles.clearBtn} onClick={onClear} title="Clear history" disabled={entries.length === 0}>
            Clear
          </button>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close history">✕</button>
        </div>
      </div>
      <div ref={listRef} className={styles.list}>
        {entries.length === 0 ? (
          <div className={styles.empty}>No rolls yet</div>
        ) : (
          entries.map(entry => {
            const sides = parseInt(entry.expression.match(/d(\d+)/i)?.[1] ?? '0');
            const isD20 = sides === 20 && entry.rolls.length === 1;
            const isNat20 = isD20 && entry.rolls[0] === 20;
            const isNat1  = isD20 && entry.rolls[0] === 1;
            const totalColorClass = isNat20 ? styles.entryTotalCrit
              : isNat1 ? styles.entryTotalFumble
              : styles.entryTotalNormal;
            return (
              <div key={entry.id} className={styles.entry}>
                <div className={styles.entryLeft}>
                  {entry.label && <span className={styles.entryLabel}>{entry.label}</span>}
                  <span className={styles.entryExpr}>{entry.expression}</span>
                  <span className={styles.entryBreakdown}>
                    [{entry.rolls.join(', ')}]
                    {entry.modifier !== 0 ? ` ${entry.modifier >= 0 ? '+' : ''}${entry.modifier}` : ''}
                  </span>
                  <span className={styles.entryTime}>{formatTime(entry.timestamp)}</span>
                </div>
                <span className={`${styles.entryTotal} ${totalColorClass}`}>
                  {entry.total}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
