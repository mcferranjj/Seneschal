import { useState, useCallback } from 'react';
import type { SyncProgress } from '../../../sync/sync';

/**
 * Stub hook for character builder data sync.
 * In the full implementation this would fetch ancestry/heritage/background/class
 * data from the PF2e data repository.
 */
export function useCharBuilderSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({ phase: 'idle' });

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    setProgress({ phase: 'checking' });
    // TODO: implement actual sync
    await new Promise(resolve => setTimeout(resolve, 500));
    setProgress({ phase: 'done' });
    setIsSyncing(false);
  }, []);

  return { isSyncing, progress, triggerSync };
}
