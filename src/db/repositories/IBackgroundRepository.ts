import type { BackgroundRecord } from '../schema';

export interface IBackgroundRepository {
  getAll(): Promise<BackgroundRecord[]>;
  get(id: string): Promise<BackgroundRecord | undefined>;
  search(query: string): Promise<BackgroundRecord[]>;
  bulkPut(records: BackgroundRecord[]): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
