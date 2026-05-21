import { useMemo, useState } from 'react';

export interface UsePickerSearchOptions<T> {
  items: T[];
  /** Fields on each item used for the case-insensitive name match. */
  getName: (item: T) => string;
  /** Optional extra strings (e.g. traits) included in the search. */
  getKeywords?: (item: T) => string[];
}

export interface UsePickerSearchResult<T> {
  search: string;
  setSearch: (v: string) => void;
  filtered: T[];
}

/**
 * Tiny shared hook for the wizard's picker steps. Owns the search-input
 * state and produces a filtered list (case-insensitive match against the
 * item's name and any extra keywords supplied by the caller).
 *
 * Centralising this is mostly about consistency: every picker should
 * behave the same way when the user types into the search box.
 */
export function usePickerSearch<T>({
  items, getName, getKeywords,
}: UsePickerSearchOptions<T>): UsePickerSearchResult<T> {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => {
      if (getName(item).toLowerCase().includes(q)) return true;
      if (getKeywords) {
        return getKeywords(item).some(k => k.toLowerCase().includes(q));
      }
      return false;
    });
  }, [items, search, getName, getKeywords]);
  return { search, setSearch, filtered };
}
