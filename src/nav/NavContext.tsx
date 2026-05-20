import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { navReducer, type HistoryEntry } from './navReducer';
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
}

const NavContext = createContext<NavContextValue | null>(null);

// Module-level monotonic id generator. Stable across re-renders and doesn't
// reset under React.StrictMode double-invocation.
let nextId = 1;

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [stack, dispatch] = useReducer(navReducer, [] as HistoryEntry[]);

  // While we're replaying an `undo`, any state setters fired by that undo may
  // synchronously trigger `useBackable` cleanup (which calls `remove`). The
  // `isReplaying` flag prevents those cleanups from also pushing fresh entries.
  const isReplayingRef = useRef(false);

  const canGoBack = stack.length > 0;
  const topLabel = stack.length > 0 ? stack[stack.length - 1].label : undefined;

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

  // Read the top entry's undo synchronously without depending on stack identity.
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const goBack = useCallback(() => {
    const current = stackRef.current;
    if (current.length === 0) return;
    const top = current[current.length - 1];
    isReplayingRef.current = true;
    try {
      top.undo();
    } finally {
      isReplayingRef.current = false;
    }
    dispatch({ type: 'pop' });
  }, []);

  // Stable refs so the global popstate / keydown listeners (installed once)
  // always see fresh values.
  const canGoBackRef = useRef(canGoBack);
  canGoBackRef.current = canGoBack;
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  // Browser back button integration.
  // We push a sentinel history state on mount so the first browser-back fires
  // popstate without leaving the app. After consuming a back, we only re-push
  // the sentinel if there's still something we could intercept next time —
  // otherwise we leave the URL alone so the user isn't trapped on the page.
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

  // Keyboard shortcuts: Alt+ArrowLeft = goBack, Escape = goBack if top entry is escClosable.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        if (canGoBackRef.current) {
          e.preventDefault();
          goBackRef.current();
        }
        return;
      }
      if (e.key === 'Escape') {
        const s = stackRef.current;
        const top = s[s.length - 1];
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
    <NavContext.Provider value={{ push, remove, flushOtherScopes, goBack, canGoBack, topLabel }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within a NavProvider');
  return ctx;
}
