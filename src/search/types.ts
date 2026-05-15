import type { CreatureRecord } from '../db/schema';

export interface SearchFilters {
  name: string;
  traits: string[];
  excludeTraits: string[];
  levelMin: number;
  levelMax: number;
  creatureTypes: string[];
  hazardTypes: string[]; // [] = all hazard types; ['trap'] = traps only; etc.
  sizes: string[];
  rarities: string[];
  publications: string[];
  entityTypes: string[]; // [] = all; ['npc'] = creatures only; ['hazard'] = hazards only
  sortBy: 'name' | 'level';
  sortDir: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: SearchFilters = {
  name: '',
  traits: [],
  excludeTraits: [],
  levelMin: -1,
  levelMax: 25,
  creatureTypes: [],
  hazardTypes: [],
  sizes: [],
  rarities: [],
  publications: [],
  entityTypes: [],
  sortBy: 'level',
  sortDir: 'asc',
};

export interface SearchResult {
  results: CreatureRecord[];
  totalCount: number;
}
