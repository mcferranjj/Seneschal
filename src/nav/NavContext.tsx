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
  const [state, reactDispatch] = useReducer(navReducer, INITIAL_STATE);

  // While we're replaying an `undo` or `redo`, any state setters fired may
  // synchronously trigger `useBackable` cleanup (which calls `remove`). The
  // `isReplaying` flag prevents those cleanups from also pushing fresh entries.
  const isReplayingRef = useRef(false);

  const canGoBack = state.back.length > 0;
  const topLabel = state.back.length > 0 ? state.back[state.back.length - 1].label : undefined;
  const canGoForward = state.forward.length > 0;
  const topForwardLabel = state.forward.length > 0 ? state.forward[state.forward.length - 1].label : undefined;

  // Synchronous shadow of the reducer state. React 18 batches dispatches from
  // native DOM event handlers (like our keydown listener) and only re-renders
  // asynchronously, so `state` — and a ref derived from it — can be stale for
  // the duration of a rapid key sequence. By applying the reducer locally and
  // immediately on every dispatch, back-to-back keypresses always see the
  // already-mutated stack rather than the last rendered snapshot.
  const liveStateRef = useRef<NavState>(INITIAL_STATE);

  const dispatch = useCallback((action: Parameters<typeof navReducer>[1]) => {
    liveStateRef.current = navReducer(liveStateRef.current, action);
    reactDispatch(action);
  }, []);

  const push = useCallback((entry: Omit<HistoryEntry, 'id'>): number => {
    if (isReplayingRef.current) return -1;
    const id = nextId++;
    dispatch({ type: 'push', entry: { ...entry, id } });
    return id;
  }, [dispatch]);

  const remove = useCallback((id: number) => {
    dispatch({ type: 'remove', id });
  }, [dispatch]);

  const flushOtherScopes = useCallback((keepScope: NavScope) => {
    dispatch({ type: 'flushOtherScopes', keepScope });
  }, [dispatch]);

  const goBack = useCallback(() => {
    const current = liveStateRef.current;
    if (current.back.length === 0) return;
    const top = current.back[current.back.length - 1];
    // Mutate the stack FIRST so that the undo callback's side-effects (which
    // can synchronously trigger useBackable cleanup → remove(id)) see a stack
    // that no longer contains this entry. Dispatching afterwards would race
    // with that cleanup and corrupt the forward stack.
    dispatch({ type: 'pop' });
    isReplayingRef.current = true;
    try {
      top.undo();
    } finally {
      isReplayingRef.current = false;
    }
  }, [dispatch]);

  // Mirrors `goBack` exactly: mutate the stack first, then replay under the
  // isReplaying guard. Dispatching before the redo callback fires prevents the
  // redo's state setters from causing useBackable cleanups to push fresh entries
  // (which would also wipe the forward stack via the `push` reducer case), and
  // prevents remove() from racing with the popForward dispatch.
  const goForward = useCallback(() => {
    const current = liveStateRef.current;
    if (current.forward.length === 0) return;
    const top = current.forward[current.forward.length - 1];
    // top.redo is guaranteed to exist — only entries with redo land on forward stack.
    dispatch({ type: 'popForward' });
    isReplayingRef.current = true;
    try {
      top.redo!();
    } finally {
      isReplayingRef.current = false;
    }
  }, [dispatch]);

  // Stable refs so the global popstate / keydown listeners (installed once)
  // always see fresh values. canGoBack/Forward intentionally read from
  // liveStateRef (not the rendered state snapshot) so rapid keypresses see
  // the already-mutated stack rather than waiting for a re-render.
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;
  const goForwardRef = useRef(goForward);
  goForwardRef.current = goForward;

  // Set to true by the keydown handler when it handles Alt+← itself, so the
  // popstate that the browser fires immediately after doesn't double-pop.
  const keydownHandledBackRef = useRef(false);

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
      // If the keydown handler already consumed this back gesture, just re-arm
      // the sentinel and skip — don't pop again.
      if (keydownHandledBackRef.current) {
        keydownHandledBackRef.current = false;
        history.pushState({ seneschal: true }, '');
        return;
      }
      if (liveStateRef.current.back.length > 0) {
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
  //
  // Alt+← fires both a keydown event and a popstate (browser back gesture).
  // The keydown capture handler runs first, calls goBack, then sets
  // keydownHandledBackRef so the popstate handler knows to skip it.
  //
  // Alt+→: the browser has no URL history to go forward to in this SPA, so
  // the keydown event reaches JS cleanly with no OS/browser interception.
  //
  // Registered in the CAPTURE phase (third arg `true`) so this handler always runs
  // first — before any component-level keydown listener anywhere in the tree,
  // regardless of registration order. This is the single authoritative place for
  // these shortcuts; no other component needs to handle or pass them through.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && e.key === 'ArrowLeft') {
        if (liveStateRef.current.back.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          keydownHandledBackRef.current = true;
          goBackRef.current();
        }
        return;
      }
      if (e.altKey && !e.ctrlKey && e.key === 'ArrowRight') {
        if (liveStateRef.current.forward.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          goForwardRef.current();
        }
        return;
      }
      if (e.key === 'Escape') {
        const s = liveStateRef.current;
        const top = s.back[s.back.length - 1];
        if (top?.escClosable) {
          e.preventDefault();
          goBackRef.current();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
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
