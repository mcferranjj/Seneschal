import type { HeritageRecord } from '../schema';

export interface IHeritageRepository {
  getAll(): Promise<HeritageRecord[]>;
  getByAncestrySlug(slug: string): Promise<HeritageRecord[]>;
  getVersatile(): Promise<HeritageRecord[]>;
  bulkPut(records: HeritageRecord[]): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
