import { useState, useCallback, useEffect } from 'react';
import type { SyncProgress } from '../../../sync/sync';
import { runCharBuilderSync, getCharBuilderSyncStatus } from '../../../sync/charBuilderSync';

export function useCharBuilderSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({ phase: 'idle' });
  const [hasData, setHasData] = useState<boolean | null>(null); // null = unknown (loading)

  // On mount, check whether we already have ancestry data in the DB
  useEffect(() => {
    getCharBuilderSyncStatus()
      .then(status => setHasData(status.counts.ancestries > 0))
      .catch(() => setHasData(false));
  }, []);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await runCharBuilderSync(p => setProgress(p));
      // After a successful sync, mark that we have data
      setHasData(true);
    } catch {
      // Progress callback will have already set the error phase
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { isSyncing, progress, triggerSync, hasData };
}
