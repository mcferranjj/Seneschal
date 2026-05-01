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
}

export function TopBar({ activeSection, onSectionChange }: TopBarProps) {
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
      <button className={styles.settingsBtn} aria-label="Settings" disabled>
        ⚙
      </button>
    </header>
  );
}
