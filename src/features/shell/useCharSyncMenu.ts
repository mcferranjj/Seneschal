import { useState, useCallback, useEffect, useRef } from 'react';
import type { SyncProgress } from '../../sync/sync';
import { runCharBuilderSync } from '../../sync/charBuilderSync';

const DONE_DISPLAY_MS = 4000;

export function useCharSyncMenu() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({ phase: 'idle' });
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    setIsSyncing(true);
    setProgress({ phase: 'checking' });
    try {
      await runCharBuilderSync(p => setProgress(p), true);
    } catch {
      // progress callback already set the error phase
    } finally {
      setIsSyncing(false);
      doneTimerRef.current = setTimeout(() => {
        setProgress({ phase: 'idle' });
        doneTimerRef.current = null;
      }, DONE_DISPLAY_MS);
    }
  }, [isSyncing]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, []);

  return { isSyncing, progress, triggerSync };
}
