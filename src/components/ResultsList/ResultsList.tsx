import type { CreatureRecord } from '../../db/schema';
import { CreatureRow } from './CreatureRow';
import styles from './ResultsList.module.css';

interface ResultsListProps {
  results: CreatureRecord[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (creature: CreatureRecord) => void;
  onAddToEncounter: (creature: CreatureRecord) => void;
  loading: boolean;
  syncing: boolean;
  creatureCount: number;
  sortBy: 'name' | 'level';
  onSortChange: (sort: 'name' | 'level') => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

export function ResultsList({
  results,
  totalCount,
  selectedId,
  onSelect,
  onAddToEncounter,
  loading,
  syncing,
  creatureCount,
  sortBy,
  onSortChange,
  filtersOpen,
  onToggleFilters,
}: ResultsListProps) {
  const toolbar = (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <button
          className={styles.filterToggle}
          onClick={onToggleFilters}
          title={filtersOpen ? 'Hide filters' : 'Show filters'}
          aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
        >
          {filtersOpen ? '‹‹' : '››'}
        </button>
        <span className={styles.resultCount}>{totalCount} {totalCount === 1 ? 'result' : 'results'}</span>
      </div>
      <div className={styles.sortGroup}>
        <button
          className={`${styles.sortBtn} ${sortBy === 'level' ? styles.sortBtnActive : ''}`}
          onClick={() => onSortChange('level')}
          aria-pressed={sortBy === 'level'}
        >
          Lvl
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
  );

  if (syncing && creatureCount === 0) {
    return (
      <>
        {toolbar}
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Syncing creature database…</p>
          <p className={styles.emptyHint}>This may take a few minutes on first launch.</p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        {toolbar}
        <div className={styles.emptyState}>
          <span className={styles.loading}>Searching…</span>
        </div>
      </>
    );
  }

  if (results.length === 0 && creatureCount === 0) {
    return (
      <>
        {toolbar}
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No creatures yet</p>
          <p className={styles.emptyHint}>Sync with GitHub to load the PF2E bestiary.</p>
        </div>
      </>
    );
  }

  if (results.length === 0) {
    return (
      <>
        {toolbar}
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No results</p>
          <p className={styles.emptyHint}>Try broadening your search filters.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {toolbar}
      <div className={styles.list} role="listbox" aria-label="Creature results">
      {results.map(c => (
        <CreatureRow
          key={c.id}
          creature={c}
          isSelected={c.id === selectedId}
          onClick={() => onSelect(c)}
          onAddToEncounter={onAddToEncounter}
        />
      ))}
      </div>
    </>
  );
}
