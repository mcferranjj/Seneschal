import { useState, useEffect } from 'react';
import type { ClassRecord } from '../../../db/schema';
import { classRepository } from '../../../db/repositories/ClassRepository';

export function useClassData() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    classRepository.getAll()
      .then(all => { setClasses(all); setLoading(false); })
      .catch(() => { setClasses([]); setLoading(false); });
  }, []);

  return { classes, loading };
}
