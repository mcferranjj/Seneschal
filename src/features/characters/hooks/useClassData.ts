import type { ClassRecord } from '../../../db/schema';
import { classRepository } from '../../../db/repositories/ClassRepository';
import { useRepositoryData } from './useRepositoryData';

export function useClassData() {
  const { data: classes, loading } = useRepositoryData<ClassRecord>(
    () => classRepository.getAll(),
  );
  return { classes, loading };
}
