import type { Section } from '../../types/encounter';
import styles from './TopBar.module.css';

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TopBarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  historyCount: number;
  historyOpen: boolean;
  onToggleHistory: () => void;
}

export function TopBar({ activeSection, onSectionChange, historyCount, historyOpen, onToggleHistory }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.logoMark}>⚔</span>
        <span className={styles.appName}>Seneschal</span>
      </div>
      <nav className={styles.nav}>
        <button
          className={`${styles.navPill} ${activeSection === 'gm' ? styles.navPillActive : ''}`}
          onClick={() => onSectionChange('gm')}
        >
          ⚔ Encounters
        </button>
        <button
          className={`${styles.navPill} ${activeSection === 'rules' ? styles.navPillActive : ''}`}
          onClick={() => onSectionChange('rules')}
        >
          📖 Rules
        </button>
        <button
          className={`${styles.navPill} ${activeSection === 'characters' ? styles.navPillActive : ''}`}
          onClick={() => onSectionChange('characters')}
        >
          ✦ Characters
        </button>
      </nav>
      <div className={styles.rightButtons}>
        <button
          className={`${styles.iconBtn} ${historyOpen ? styles.iconBtnActive : ''}`}
          onClick={onToggleHistory}
          aria-label="Roll history"
          title="Roll history"
        >
          🎲
          {historyCount > 0 && (
            <span className={styles.historyBadge}>{historyCount > 99 ? '99+' : historyCount}</span>
          )}
        </button>
        <button className={styles.iconBtn} aria-label="Settings" disabled title="Settings">
          ⚙
        </button>
      </div>
    </header>
  );
}
