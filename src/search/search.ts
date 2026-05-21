import { creatureRepository } from '../db/repositories/CreatureRepository';
import type { SearchFilters, SearchResult } from './types';
import type { PublicationInfo } from '../sync/publicationRegistry';

export type { SearchFilters, SearchResult };
export { DEFAULT_FILTERS } from './types';
export type { PublicationInfo };

export async function searchCreatures(filters: SearchFilters): Promise<SearchResult> {
  return creatureRepository.search(filters);
}

export async function getAllTraits(): Promise<string[]> {
  return creatureRepository.getAllTraits();
}

export async function getAllFamilies(): Promise<string[]> {
  return creatureRepository.getAllFamilies();
}

export async function getAllPublicationsWithMeta(): Promise<PublicationInfo[]> {
  return creatureRepository.getAllPublicationsWithMeta();
}
