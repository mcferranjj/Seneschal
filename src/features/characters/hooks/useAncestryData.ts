import { useState, useEffect } from 'react';
import type { AncestryRecord } from '../../../db/schema';
import { ancestryRepository } from '../../../db/repositories/AncestryRepository';

export function useAncestryData() {
  const [ancestries, setAncestries] = useState<AncestryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ancestryRepository.getAll()
      .then(all => { setAncestries(all); setLoading(false); })
      .catch(() => { setAncestries([]); setLoading(false); });
  }, []);

  return { ancestries, loading };
}
