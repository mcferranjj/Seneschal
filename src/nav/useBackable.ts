import { useEffect, useRef } from 'react';
import { useNav } from './NavContext';
import type { NavScope } from './scope';

interface BackableOptions {
  /** If true, Escape will pop this entry when it's on top of the stack. */
  escClosable?: boolean;
  /** Section scope; entries with a mismatched scope are flushed on section change. */
  scope?: NavScope;
  /**
   * Optional redo callback. When provided, backing past this entry will push it
   * onto the forward stack so `goForward` can replay it.
   * Captured via ref — does not need to be memoized.
   */
  redo?: () => void;
}

/**
 * Register a transient "undo" entry with the nav stack while `active` is true.
 *
 * Typical use: a modal/drawer registers `useBackable(open, close, ...)`.
 * When `open` flips true the entry is pushed; the cleanup runs as soon as
 * `open` flips false (or the component unmounts), which removes the entry.
 *
 * `undo` and `redo` are captured via ref so callers don't have to memoize them.
 */
export function useBackable(
  active: boolean,
  undo: () => void,
  label?: string,
  opts?: BackableOptions,
) {
  const { push, remove } = useNav();
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(opts?.redo);
  redoRef.current = opts?.redo;

  // Destructure so the deps array sees plain primitives rather than the smell
  // of `opts?.foo` (which depends on `opts` identity, not just the field).
  const escClosable = opts?.escClosable;
  const scope = opts?.scope;
  // redo presence is captured as a boolean for deps — the actual fn is in a ref.
  const hasRedo = !!opts?.redo;

  useEffect(() => {
    if (!active) return;
    const id = push({
      undo: () => undoRef.current(),
      ...(hasRedo ? { redo: () => redoRef.current?.() } : {}),
      label,
      escClosable,
      scope,
    });
    return () => remove(id);
  }, [active, label, push, remove, escClosable, scope, hasRedo]);
}
