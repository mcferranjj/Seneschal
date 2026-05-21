import { useState } from 'react';

export type SortDir   = 'asc' | 'desc';
export type CheckMode = 'or' | 'and';

export interface SortState<ColKey extends string> {
  col: ColKey;
  dir: SortDir;
}

/** Checked values per column. */
export type CheckFilters<ColKey extends string> = Partial<Record<ColKey, Set<string>>>;

/** AND vs OR mode per column (default: 'or'). */
export type CheckModes<ColKey extends string> = Partial<Record<ColKey, CheckMode>>;

/** Free-text substring filter per column. */
export type TextFilters<ColKey extends string> = Partial<Record<ColKey, string>>;

export interface UseTableFiltersResult<ColKey extends string> {
  sort:         SortState<ColKey>;
  checkFilters: CheckFilters<ColKey>;
  checkModes:   CheckModes<ColKey>;
  textFilters:  TextFilters<ColKey>;
  hasAnyFilter: boolean;
  handleHeaderClick:      (col: ColKey) => void;
  toggleCheckValue:       (col: ColKey, value: string) => void;
  setCheckMode:           (col: ColKey, mode: CheckMode) => void;
  setTextFilter:          (col: ColKey, value: string) => void;
  clearColumnFilter:      (col: ColKey) => void;
  clearAllFilters:        () => void;
}

/**
 * Manages sort + multi-mode filter state for a data table.
 *
 * Generic over `ColKey` so it stays type-safe for any column schema.
 */
export function useTableFilters<ColKey extends string>(
  initialSort: SortState<ColKey>,
): UseTableFiltersResult<ColKey> {
  const [sort,         setSort]         = useState<SortState<ColKey>>(initialSort);
  const [checkFilters, setCheckFilters] = useState<CheckFilters<ColKey>>({});
  const [checkModes,   setCheckModes]   = useState<CheckModes<ColKey>>({});
  const [textFilters,  setTextFilters]  = useState<TextFilters<ColKey>>({});

  const hasCheckFilters = Object.values(checkFilters).some(s => s && (s as Set<string>).size > 0);
  const hasTextFilters  = Object.values(textFilters).some(t => t && (t as string).trim() !== '');
  const hasAnyFilter    = hasCheckFilters || hasTextFilters;

  function handleHeaderClick(col: ColKey) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' },
    );
  }

  function toggleCheckValue(col: ColKey, value: string) {
    setCheckFilters(prev => {
      const current = new Set(prev[col] ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [col]: current };
    });
  }

  function setCheckMode(col: ColKey, mode: CheckMode) {
    setCheckModes(prev => ({ ...prev, [col]: mode }));
  }

  function setTextFilter(col: ColKey, value: string) {
    setTextFilters(prev =>
      value === ''
        ? (({ [col]: _, ...rest }) => rest)(prev)
        : { ...prev, [col]: value },
    );
  }

  function clearColumnFilter(col: ColKey) {
    setCheckFilters(prev => { const n = { ...prev }; delete n[col]; return n; });
    setCheckModes(prev   => { const n = { ...prev }; delete n[col]; return n; });
    setTextFilters(prev  => { const n = { ...prev }; delete n[col]; return n; });
  }

  function clearAllFilters() {
    setCheckFilters({});
    setCheckModes({});
    setTextFilters({});
  }

  return {
    sort,
    checkFilters,
    checkModes,
    textFilters,
    hasAnyFilter,
    handleHeaderClick,
    toggleCheckValue,
    setCheckMode,
    setTextFilter,
    clearColumnFilter,
    clearAllFilters,
  };
}
