import type { ClassRecord } from '../schema';

export interface IClassRepository {
  getAll(): Promise<ClassRecord[]>;
  get(id: string): Promise<ClassRecord | undefined>;
  getBySlug(slug: string): Promise<ClassRecord | undefined>;
  bulkPut(records: ClassRecord[]): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
