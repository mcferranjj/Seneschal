import { useState, useEffect } from 'react';
import type { BackgroundRecord } from '../../../db/schema';
import { backgroundRepository } from '../../../db/repositories/BackgroundRepository';

export function useBackgroundData() {
  const [backgrounds, setBackgrounds] = useState<BackgroundRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backgroundRepository.getAll()
      .then(all => { setBackgrounds(all); setLoading(false); })
      .catch(() => { setBackgrounds([]); setLoading(false); });
  }, []);

  return { backgrounds, loading };
}
