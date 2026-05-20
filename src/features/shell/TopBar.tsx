import { useEffect, useRef, useState } from 'react';
import type { Section } from '../../types/encounter';
import type { Theme } from '../../utils/themeEngine';
import styles from './TopBar.module.css';
import { HelpModal } from './HelpModal';
import { ThemePicker } from './ThemePicker';
import { useCharSyncMenu } from './useCharSyncMenu';
import { BackButton } from '../../nav/BackButton';
import { ForwardButton } from '../../nav/ForwardButton';

interface TopBarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  historyCount: number;
  historyOpen: boolean;
  onToggleHistory: () => void;
  onResetDatabase: () => Promise<void>;
  activeTheme: Theme;
  onApplyTheme: (theme: Theme) => void;
}

export function TopBar({ activeSection, onSectionChange, historyCount, historyOpen, onToggleHistory, onResetDatabase, activeTheme, onApplyTheme }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { isSyncing: charSyncing, progress: charSyncProgress, triggerSync: handleCharSync } = useCharSyncMenu();

  // Track whether the most recent sync reported "Up to date" — used to keep
  // the "Up to date ✓" message and the Force re-sync option visible until the
  // user closes the settings menu, regardless of the hook's auto-clear timer.
  const [wasUpToDate, setWasUpToDate] = useState(false);
  useEffect(() => {
    if (
      charSyncProgress.phase === 'done' &&
      charSyncProgress.message === 'Up to date'
    ) {
      setWasUpToDate(true);
    }
  }, [charSyncProgress]);

  // Reset the up-to-date sticky flag when the menu closes.
  useEffect(() => {
    if (!menuOpen) setWasUpToDate(false);
  }, [menuOpen]);

  // Clear the sticky flag the moment a new sync starts so stale UI doesn't
  // flash alongside the new run.
  useEffect(() => {
    if (charSyncing) setWasUpToDate(false);
  }, [charSyncing]);

  const onClickSync = () => {
    setWasUpToDate(false);
    handleCharSync(false);
  };

  const onClickForceSync = () => {
    setWasUpToDate(false);
    handleCharSync(true);
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleResetClick = () => {
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await onResetDatabase();
    } finally {
      setResetting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <header className={styles.topBar}>
        <BackButton />
        <ForwardButton />
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
          <button
            className={`${styles.iconBtn} ${styles.helpBtn} ${helpOpen ? styles.iconBtnActive : ''}`}
            onClick={() => setHelpOpen(o => !o)}
            aria-label="Help"
            title="Help"
          >
            ?
          </button>
          <div className={styles.settingsWrap} ref={menuRef}>
            <button
              className={`${styles.iconBtn} ${menuOpen ? styles.iconBtnActive : ''}`}
              aria-label="Settings"
              title="Settings"
              onClick={() => setMenuOpen(o => !o)}
            >
              ⚙
            </button>
            {menuOpen && (
              <div className={styles.settingsMenu}>
                <button className={styles.settingsMenuItem} onClick={() => { setMenuOpen(false); setThemePickerOpen(true); }}>
                  <span className={styles.settingsMenuIcon}>🎨</span>
                  Theme
                </button>
                <div className={styles.settingsMenuDivider} />
                <button
                  className={styles.settingsMenuItem}
                  onClick={onClickSync}
                  disabled={charSyncing}
                >
                  <span className={styles.settingsMenuIcon}>✦</span>
                  <span className={styles.settingsMenuItemBody}>
                    <span>Sync character data</span>
                    {charSyncing && (
                      <span className={styles.settingsMenuSyncStatus}>
                        {charSyncProgress.phase === 'checking' && 'Checking…'}
                        {charSyncProgress.phase === 'listing' && 'Indexing…'}
                        {charSyncProgress.phase === 'fetching' && `Fetching… ${charSyncProgress.total ? `${charSyncProgress.done ?? 0}/${charSyncProgress.total}` : ''}`}
                        {charSyncProgress.phase === 'saving' && 'Saving…'}
                      </span>
                    )}
                    {!charSyncing && wasUpToDate && (
                      <span className={styles.settingsMenuSyncDone}>Up to date ✓</span>
                    )}
                    {!charSyncing && !wasUpToDate && charSyncProgress.phase === 'done' && (
                      <span className={styles.settingsMenuSyncDone}>Synced ✓</span>
                    )}
                    {!charSyncing && charSyncProgress.phase === 'error' && (
                      <span className={styles.settingsMenuSyncError}>Failed — click to retry</span>
                    )}
                  </span>
                </button>
                {wasUpToDate && (
                  <button
                    className={`${styles.settingsMenuItem} ${styles.settingsMenuItemSub}`}
                    onClick={onClickForceSync}
                    disabled={charSyncing}
                    title="Re-download all character builder data, even though nothing has changed upstream"
                  >
                    <span className={styles.settingsMenuIcon}>↻</span>
                    <span className={styles.settingsMenuItemBody}>
                      <span>Force re-sync anyway</span>
                      <span className={styles.settingsMenuSyncStatus}>
                        Re-download all character data
                      </span>
                    </span>
                  </button>
                )}
                <div className={styles.settingsMenuDivider} />
                <button className={styles.settingsMenuItem} onClick={handleResetClick}>
                  <span className={styles.settingsMenuIcon}>🗑</span>
                  Reset creature database
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {themePickerOpen && (
        <ThemePicker
          activeTheme={activeTheme}
          onApply={onApplyTheme}
          onClose={() => setThemePickerOpen(false)}
        />
      )}

      {confirmOpen && (
        <div className={styles.overlay} onClick={() => !resetting && setConfirmOpen(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h2 className={styles.confirmTitle}>Reset creature database?</h2>
            <p className={styles.confirmBody}>
              This will delete your local creature database and start a fresh sync from scratch.
              Your encounters and characters will not be affected.
              <br /><br />
              <strong>This can't be undone.</strong>
            </p>
            <div className={styles.confirmButtons}>
              <button
                className={styles.confirmCancel}
                onClick={() => setConfirmOpen(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDelete}
                onClick={handleConfirmReset}
                disabled={resetting}
              >
                {resetting ? 'Resetting…' : 'Yes, reset database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
