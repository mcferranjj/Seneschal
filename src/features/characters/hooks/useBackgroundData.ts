import type { BackgroundRecord } from '../../../db/schema';
import { backgroundRepository } from '../../../db/repositories/BackgroundRepository';
import { useRepositoryData } from './useRepositoryData';

export function useBackgroundData() {
  const { data: backgrounds, loading } = useRepositoryData<BackgroundRecord>(
    () => backgroundRepository.getAll(),
  );
  return { backgrounds, loading };
}
