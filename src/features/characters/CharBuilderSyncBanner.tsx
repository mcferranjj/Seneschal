import type { SyncProgress } from '../../sync/sync';
import styles from './CharBuilderSyncBanner.module.css';

interface CharBuilderSyncBannerProps {
  isSyncing: boolean;
  progress: SyncProgress;
  onSync: () => void;
}

export function CharBuilderSyncBanner({ isSyncing, progress, onSync }: CharBuilderSyncBannerProps) {
  const { phase, done, total } = progress;

  const label =
    phase === 'checking' ? 'Checking for data…' :
    phase === 'listing'  ? `Indexing (${done ?? 0}/${total ?? '?'})` :
    phase === 'fetching' ? `Fetching data… (${done ?? 0}/${total ?? '?'})` :
    phase === 'saving'   ? 'Saving…' :
    phase === 'error'    ? (progress.message ?? 'Sync failed.') :
    null;

  return (
    <div className={`${styles.banner} ${phase === 'error' ? styles.error : ''}`}>
      <div className={styles.content}>
        <span className={styles.icon}>{phase === 'error' ? '⚠' : '✦'}</span>
        <div className={styles.text}>
          {isSyncing && label ? (
            <span className={styles.syncing}>{label}</span>
          ) : (
            <>
              <strong>No character builder data found.</strong>
              <span> Sync data to use ancestry, heritage, background, and class selections.</span>
            </>
          )}
        </div>
        {!isSyncing && (
          <button className={styles.syncBtn} onClick={onSync}>
            {phase === 'error' ? 'Retry Sync' : 'Sync Now'}
          </button>
        )}
      </div>
      {isSyncing && total && total > 0 && (
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.round(((done ?? 0) / total) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
