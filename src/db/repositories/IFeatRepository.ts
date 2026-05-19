import type { FeatRecord, FeatCategory } from '../schema';

export interface IFeatRepository {
  getAll(): Promise<FeatRecord[]>;
  get(id: string): Promise<FeatRecord | undefined>;
  getByCategory(category: FeatCategory, maxLevel?: number): Promise<FeatRecord[]>;
  getByAncestrySlug(slug: string, maxLevel?: number): Promise<FeatRecord[]>;
  getByClassSlug(slug: string, maxLevel?: number): Promise<FeatRecord[]>;
  getSkillFeats(maxLevel?: number): Promise<FeatRecord[]>;
  getGeneralFeats(maxLevel?: number): Promise<FeatRecord[]>;
  bulkPut(records: FeatRecord[]): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
