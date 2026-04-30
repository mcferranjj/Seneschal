import type { CreatureRecord } from '../../db/schema';
import { CreatureRow } from './CreatureRow';
import styles from './ResultsList.module.css';

interface ResultsListProps {
  results: CreatureRecord[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (creature: CreatureRecord) => void;
  loading: boolean;
  syncing: boolean;
  creatureCount: number;
  sortBy: 'name' | 'level';
  onSortChange: (sort: 'name' | 'level') => void;
}

export function ResultsList({
  results,
  totalCount,
  selectedId,
  onSelect,
  loading,
  syncing,
  creatureCount,
  sortBy,
  onSortChange,
}: ResultsListProps) {
  if (syncing && creatureCount === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>Syncing creature database…</p>
        <p className={styles.emptyHint}>This may take a few minutes on first launch.</p>
      </div>
    );
  }

  if (loading) {
    return <div className={styles.emptyState}><span className={styles.loading}>Searching…</span></div>;
  }

  if (results.length === 0 && creatureCount === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No creatures yet</p>
        <p className={styles.emptyHint}>Sync with GitHub to load the PF2E bestiary.</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No results</p>
        <p className={styles.emptyHint}>Try broadening your search filters.</p>
      </div>
    );
  }

  return (
    <div className={styles.list} role="listbox" aria-label="Creature results">
      <div className={styles.toolbar}>
        <div className={styles.resultCount}>
          {`${totalCount} result${totalCount !== 1 ? 's' : ''}`}
        </div>
        <div className={styles.sortGroup}>
          <button
            className={`${styles.sortBtn} ${sortBy === 'level' ? styles.sortBtnActive : ''}`}
            onClick={() => onSortChange('level')}
            aria-pressed={sortBy === 'level'}
          >
            Level
          </button>
          <button
            className={`${styles.sortBtn} ${sortBy === 'name' ? styles.sortBtnActive : ''}`}
            onClick={() => onSortChange('name')}
            aria-pressed={sortBy === 'name'}
          >
            Name
          </button>
        </div>
      </div>
      {results.map(c => (
        <CreatureRow
          key={c.id}
          creature={c}
          isSelected={c.id === selectedId}
          onClick={() => onSelect(c)}
        />
      ))}
    </div>
  );
}
