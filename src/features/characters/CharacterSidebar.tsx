import type { CharacterRecord } from '../../db/schema';
import { CharacterSidebarItem } from './CharacterSidebarItem';
import styles from './CharacterSidebar.module.css';

interface CharacterSidebarProps {
  characters: CharacterRecord[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  dimmed: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function CharacterSidebar({
  characters, loading, activeId, onSelect, onNew, dimmed, collapsed, onToggleCollapsed,
}: CharacterSidebarProps) {
  return (
    <aside
      className={`${styles.sidebar} ${dimmed ? styles.dimmed : ''} ${collapsed ? styles.collapsed : ''}`}
    >
      <div className={styles.header}>
        <span className={styles.title}>Characters</span>
        <div className={styles.headerBtns}>
          <button className={styles.newBtn} onClick={onNew} title="Create new character">
            + New
          </button>
          <button
            className={styles.collapseBtn}
            onClick={onToggleCollapsed}
            title="Hide characters"
            aria-label="Hide characters"
            type="button"
          >
            ‹‹
          </button>
        </div>
      </div>
      <div className={styles.list}>
        {loading && (
          <div className={styles.loading}>Loading…</div>
        )}
        {!loading && characters.length === 0 && (
          <div className={styles.empty}>No characters yet</div>
        )}
        {!loading && characters.map(c => (
          <CharacterSidebarItem
            key={c.id}
            character={c}
            isActive={c.id === activeId}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
    </aside>
  );
}
