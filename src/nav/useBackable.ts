import { useEffect, useRef } from 'react';
import { useNav } from './NavContext';
import type { NavScope } from './scope';

interface BackableOptions {
  /** If true, Escape will pop this entry when it's on top of the stack. */
  escClosable?: boolean;
  /** Section scope; entries with a mismatched scope are flushed on section change. */
  scope?: NavScope;
}

/**
 * Register a transient "undo" entry with the nav stack while `active` is true.
 *
 * Typical use: a modal/drawer registers `useBackable(open, close, ...)`.
 * When `open` flips true the entry is pushed; the cleanup runs as soon as
 * `open` flips false (or the component unmounts), which removes the entry.
 *
 * `undo` is captured via ref so callers don't have to memoize it.
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

  // Destructure so the deps array sees plain primitives rather than the smell
  // of `opts?.foo` (which depends on `opts` identity, not just the field).
  const escClosable = opts?.escClosable;
  const scope = opts?.scope;

  useEffect(() => {
    if (!active) return;
    const id = push({
      undo: () => undoRef.current(),
      label,
      escClosable,
      scope,
    });
    return () => remove(id);
  }, [active, label, push, remove, escClosable, scope]);
}
