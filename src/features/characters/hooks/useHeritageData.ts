import { useState, useEffect } from 'react';
import type { HeritageRecord } from '../../../db/schema';
import { heritageRepository } from '../../../db/repositories/HeritageRepository';

export function useHeritageData(ancestrySlug: string | undefined) {
  const [heritages, setHeritages] = useState<HeritageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ancestrySlug) {
      setHeritages([]);
      setLoading(false);
      return;
    }
    Promise.all([
      heritageRepository.getByAncestrySlug(ancestrySlug),
      heritageRepository.getVersatile(),
    ])
      .then(([byAncestry, versatile]) => {
        const seen = new Set<string>();
        const combined: HeritageRecord[] = [];
        for (const h of [...byAncestry, ...versatile]) {
          if (!seen.has(h.id)) {
            seen.add(h.id);
            combined.push(h);
          }
        }
        setHeritages(combined);
        setLoading(false);
      })
      .catch(() => { setHeritages([]); setLoading(false); });
  }, [ancestrySlug]);

  return { heritages, loading };
}
