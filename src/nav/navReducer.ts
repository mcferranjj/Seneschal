import type { NavScope } from './scope';

/**
 * One entry on the navigation history stack. The most-recent entry is at the
 * end of the array; `goBack` pops from the end and invokes its `undo`.
 *
 * If `redo` is provided, popping this entry (via goBack) will push it onto the
 * forward stack so `goForward` can replay it. Entries without `redo` are
 * non-redoable and are dropped after their undo runs.
 */
export interface HistoryEntry {
  id: number;
  undo: () => void;
  redo?: () => void;
  label?: string;
  /** If true, pressing Escape while this entry is on top will pop it. */
  escClosable?: boolean;
  /** Section scope (see scope.ts). Undefined = global, survives section switches. */
  scope?: NavScope;
}

export interface NavState {
  back: HistoryEntry[];
  forward: HistoryEntry[];
}

export type NavAction =
  | { type: 'push'; entry: HistoryEntry }
  | { type: 'remove'; id: number }
  | { type: 'pop' }
  | { type: 'popForward' }
  | { type: 'flushOtherScopes'; keepScope: NavScope };

/**
 * Pure reducer for the nav history stack. Kept free of React/DOM concerns so
 * it can be unit-tested in isolation (see `navReducer.test.ts` once added).
 */
export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'push':
      // Any fresh push clears the forward stack (standard browser semantics).
      return { back: [...state.back, action.entry], forward: [] };
    case 'remove':
      return { ...state, back: state.back.filter(e => e.id !== action.id) };
    case 'pop': {
      if (state.back.length === 0) return state;
      const top = state.back[state.back.length - 1];
      const newBack = state.back.slice(0, -1);
      // Only add to forward stack if entry has a redo function.
      const newForward = top.redo
        ? [...state.forward, top]
        : state.forward;
      return { back: newBack, forward: newForward };
    }
    case 'popForward': {
      // NOTE: This reducer does NOT invoke `top.redo`. The reducer is pure and
      // side-effect free; the caller (NavContext.goForward) runs `redo` under
      // the `isReplaying` guard *before* dispatching this action. Moving the
      // entry back onto the `back` stack here lets the user ping-pong between
      // goBack and goForward repeatedly without losing the entry.
      if (state.forward.length === 0) return state;
      const top = state.forward[state.forward.length - 1];
      const newForward = state.forward.slice(0, -1);
      return { back: [...state.back, top], forward: newForward };
    }
    case 'flushOtherScopes':
      // Keep entries that are either global (no scope) or match the new section.
      // Clears both back and forward stacks.
      return {
        back: state.back.filter(e => !e.scope || e.scope === action.keepScope),
        forward: state.forward.filter(e => !e.scope || e.scope === action.keepScope),
      };
  }
}
