import { useState, useEffect } from 'react';
import type { FeatRecord, FeatCategory, FeatSlotType } from '../../../db/schema';
import { featRepository } from '../../../db/repositories/FeatRepository';

export interface FeatFilters {
  search: string;
  category: FeatCategory | null;
  slotType: FeatSlotType | null;
  maxLevel: number;
  actionType: string | null;
  ancestrySlug?: string;
  classSlug?: string;
  versatileAncestrySlug?: string;
}

export function useFeatData() {
  const [feats, setFeats] = useState<FeatRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    featRepository.getAll()
      .then(all => { setFeats(all); setLoading(false); })
      .catch(() => { setFeats([]); setLoading(false); });
  }, []);

  function filterFeats(filters: Partial<FeatFilters>): FeatRecord[] {
    return feats.filter(f => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!f.name.toLowerCase().includes(q)) return false;
      }
      if (filters.category && f.category !== filters.category) return false;
      if (filters.maxLevel !== undefined && f.level > filters.maxLevel) return false;
      if (filters.actionType && f.actionType !== filters.actionType) return false;
      if (filters.slotType) {
        const applicable = slotTypeToCategories(filters.slotType);
        if (!applicable.includes(f.category)) return false;

        if (filters.slotType === 'ancestry' && filters.ancestrySlug) {
          const ancestrySlug = filters.ancestrySlug;
          const versatileSlug = filters.versatileAncestrySlug;
          if (!f.traits.some(t => t === ancestrySlug || (versatileSlug && t === versatileSlug))) {
            return false;
          }
        }

        if (filters.slotType === 'class' && filters.classSlug) {
          const classSlug = filters.classSlug;
          if (!f.traits.some(t => t === classSlug)) return false;
        }
      }
      return true;
    });
  }

  return { feats, loading, filterFeats };
}

function slotTypeToCategories(slotType: FeatSlotType): FeatCategory[] {
  switch (slotType) {
    case 'ancestry': return ['ancestry', 'ancestryfeature', 'heritage'];
    case 'class': return ['class', 'classfeature'];
    case 'general': return ['general'];
    case 'skill': return ['skill'];
    case 'free': return ['ancestry', 'class', 'general', 'skill', 'archetype'];
    default: return [];
  }
}
