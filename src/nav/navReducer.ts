import type { NavScope } from './scope';

/**
 * One entry on the navigation history stack. The most-recent entry is at the
 * end of the array; `goBack` pops from the end and invokes its `undo`.
 */
export interface HistoryEntry {
  id: number;
  undo: () => void;
  label?: string;
  /** If true, pressing Escape while this entry is on top will pop it. */
  escClosable?: boolean;
  /** Section scope (see scope.ts). Undefined = global, survives section switches. */
  scope?: NavScope;
}

export type NavAction =
  | { type: 'push'; entry: HistoryEntry }
  | { type: 'remove'; id: number }
  | { type: 'pop' }
  | { type: 'flushOtherScopes'; keepScope: NavScope };

/**
 * Pure reducer for the nav history stack. Kept free of React/DOM concerns so
 * it can be unit-tested in isolation (see `navReducer.test.ts` once added).
 */
export function navReducer(state: HistoryEntry[], action: NavAction): HistoryEntry[] {
  switch (action.type) {
    case 'push':
      return [...state, action.entry];
    case 'remove':
      return state.filter(e => e.id !== action.id);
    case 'pop':
      return state.length === 0 ? state : state.slice(0, -1);
    case 'flushOtherScopes':
      // Keep entries that are either global (no scope) or match the new section.
      return state.filter(e => !e.scope || e.scope === action.keepScope);
  }
}
