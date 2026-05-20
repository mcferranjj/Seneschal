import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { navReducer, type HistoryEntry, type NavState } from './navReducer';
import type { NavScope } from './scope';

export type { HistoryEntry } from './navReducer';

interface NavContextValue {
  push: (entry: Omit<HistoryEntry, 'id'>) => number;
  remove: (id: number) => void;
  /** Remove all entries whose scope differs from `keepScope`. Global (un-scoped) entries are kept. */
  flushOtherScopes: (keepScope: NavScope) => void;
  goBack: () => void;
  canGoBack: boolean;
  topLabel?: string;
  goForward: () => void;
  canGoForward: boolean;
  topForwardLabel?: string;
}

const NavContext = createContext<NavContextValue | null>(null);

// Module-level monotonic id generator. Stable across re-renders and doesn't
// reset under React.StrictMode double-invocation.
let nextId = 1;

const INITIAL_STATE: NavState = { back: [], forward: [] };

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(navReducer, INITIAL_STATE);

  // While we're replaying an `undo` or `redo`, any state setters fired may
  // synchronously trigger `useBackable` cleanup (which calls `remove`). The
  // `isReplaying` flag prevents those cleanups from also pushing fresh entries.
  const isReplayingRef = useRef(false);

  const canGoBack = state.back.length > 0;
  const topLabel = state.back.length > 0 ? state.back[state.back.length - 1].label : undefined;
  const canGoForward = state.forward.length > 0;
  const topForwardLabel = state.forward.length > 0 ? state.forward[state.forward.length - 1].label : undefined;

  const push = useCallback((entry: Omit<HistoryEntry, 'id'>): number => {
    if (isReplayingRef.current) return -1;
    const id = nextId++;
    dispatch({ type: 'push', entry: { ...entry, id } });
    return id;
  }, []);

  const remove = useCallback((id: number) => {
    dispatch({ type: 'remove', id });
  }, []);

  const flushOtherScopes = useCallback((keepScope: NavScope) => {
    dispatch({ type: 'flushOtherScopes', keepScope });
  }, []);

  // Read the top entry synchronously without depending on state identity.
  const stateRef = useRef(state);
  stateRef.current = state;

  const goBack = useCallback(() => {
    const current = stateRef.current;
    if (current.back.length === 0) return;
    const top = current.back[current.back.length - 1];
    isReplayingRef.current = true;
    try {
      top.undo();
    } finally {
      isReplayingRef.current = false;
    }
    dispatch({ type: 'pop' });
  }, []);

  // Mirrors `goBack` exactly: run the replay function under the isReplaying
  // guard, then dispatch the state transition. The guard prevents the redo's
  // state setters from causing `useBackable` cleanups to push fresh entries
  // (which would also wipe the forward stack via the `push` reducer case).
  const goForward = useCallback(() => {
    const current = stateRef.current;
    if (current.forward.length === 0) return;
    const top = current.forward[current.forward.length - 1];
    // top.redo is guaranteed to exist — only entries with redo land on forward stack.
    isReplayingRef.current = true;
    try {
      top.redo!();
    } finally {
      isReplayingRef.current = false;
    }
    dispatch({ type: 'popForward' });
  }, []);

  // Stable refs so the global popstate / keydown listeners (installed once)
  // always see fresh values.
  const canGoBackRef = useRef(canGoBack);
  canGoBackRef.current = canGoBack;
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;
  const canGoForwardRef = useRef(canGoForward);
  canGoForwardRef.current = canGoForward;
  const goForwardRef = useRef(goForward);
  goForwardRef.current = goForward;

  // Browser back button integration.
  // We push a sentinel history state on mount so the first browser-back fires
  // popstate without leaving the app. After consuming a back, we only re-push
  // the sentinel if there's still something we could intercept next time —
  // otherwise we leave the URL alone so the user isn't trapped on the page.
  //
  // NOTE: Browser forward-gesture (popstate with a forward delta) is NOT wired
  // to the redo stack. The redo stack is an in-app concept; the browser forward
  // button navigates URL history which we don't manage beyond the sentinel.
  useEffect(() => {
    history.pushState({ seneschal: true }, '');

    const handlePopState = () => {
      if (canGoBackRef.current) {
        goBackRef.current();
        // Re-arm the sentinel so the next browser back is also captured.
        history.pushState({ seneschal: true }, '');
      }
      // If the stack is empty we deliberately do nothing: the browser will
      // navigate away normally (or do nothing if there's no prior entry),
      // which is the expected user-facing behavior.
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard shortcuts: Alt+ArrowLeft = goBack, Alt+ArrowRight = goForward,
  // Escape = goBack if top entry is escClosable.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        if (canGoBackRef.current) {
          e.preventDefault();
          goBackRef.current();
        }
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        if (canGoForwardRef.current) {
          e.preventDefault();
          goForwardRef.current();
        }
        return;
      }
      if (e.key === 'Escape') {
        const s = stateRef.current;
        const top = s.back[s.back.length - 1];
        if (top?.escClosable) {
          e.preventDefault();
          goBackRef.current();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <NavContext.Provider value={{ push, remove, flushOtherScopes, goBack, canGoBack, topLabel, goForward, canGoForward, topForwardLabel }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within a NavProvider');
  return ctx;
}
