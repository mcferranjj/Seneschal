import type { AncestryRecord } from '../../../db/schema';
import { ancestryRepository } from '../../../db/repositories/AncestryRepository';
import { useRepositoryData } from './useRepositoryData';

export function useAncestryData() {
  const { data: ancestries, loading } = useRepositoryData<AncestryRecord>(
    () => ancestryRepository.getAll(),
  );
  return { ancestries, loading };
}
