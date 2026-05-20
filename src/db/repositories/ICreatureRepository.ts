/**
 * ICreatureRepository
 *
 * Blind interface for creature persistence. Production uses Dexie/IndexedDB;
 * tests can inject a mock without touching a real database.
 */

import type { CreatureRecord } from '../schema';
import type { SearchFilters, SearchResult } from '../../search/types';
import type { PublicationInfo } from '../../sync/publicationRegistry';

export interface ICreatureRepository {
  get(id: string): Promise<CreatureRecord | undefined>;
  search(filters: SearchFilters): Promise<SearchResult>;
  getAllTraits(): Promise<string[]>;
  getAllPublications(): Promise<string[]>;
  getAllPublicationsWithMeta(): Promise<PublicationInfo[]>;
  getAllFamilies(): Promise<string[]>;
  bulkPut(records: CreatureRecord[]): Promise<void>;
  put(record: CreatureRecord): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
}
