import type { AncestryRecord } from '../schema';

export interface IAncestryRepository {
  getAll(): Promise<AncestryRecord[]>;
  get(id: string): Promise<AncestryRecord | undefined>;
  getBySlug(slug: string): Promise<AncestryRecord | undefined>;
  bulkPut(records: AncestryRecord[]): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
