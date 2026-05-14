/**
 * ICreatureRepository
 *
 * Blind interface for creature persistence. Production uses Dexie/IndexedDB;
 * tests can inject a mock without touching a real database.
 */

import type { CreatureRecord } from '../schema';
import type { SearchFilters, SearchResult } from '../../search/search';

export interface ICreatureRepository {
  get(id: string): Promise<CreatureRecord | undefined>;
  search(filters: SearchFilters): Promise<SearchResult>;
  getAllTraits(): Promise<string[]>;
  getAllPackSources(): Promise<string[]>;
  bulkPut(records: CreatureRecord[]): Promise<void>;
  put(record: CreatureRecord): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
}
