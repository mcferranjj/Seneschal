import styles from './TopBar.module.css';

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TopBar() {
  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.appName}>Seneschal</span>
        <span className={styles.subtitle}>PF2E GM Assistant</span>
      </div>
    </header>
  );
}
