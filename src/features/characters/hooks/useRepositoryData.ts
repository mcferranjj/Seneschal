import { useState, useEffect } from 'react';

/**
 * Generic hook that loads all records from a repository method on mount.
 * Handles loading and error states consistently across all character builder data hooks.
 */
export function useRepositoryData<T>(fetcher: () => Promise<T[]>): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher()
      .then(all => { setData(all); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  // fetcher identity is intentionally not in deps — callers pass stable repository methods
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading };
}
