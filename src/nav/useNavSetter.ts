import { useCallback, useRef } from 'react';
import { useNav } from './NavContext';
import type { NavScope } from './scope';

interface NavSetterOptions<T> {
  /** Optional human-readable label for the back button tooltip. */
  label?: (prev: T, next: T) => string;
  /** Optional scope; pass when the action is section-local. */
  scope?: NavScope;
  /** Skip pushing a nav entry when prev === next (default true). */
  skipNoOp?: boolean;
}

/**
 * Wraps a state setter so that every call pushes an undo entry onto the nav
 * stack before applying the new value. The back button (or browser back) will
 * then restore the previous value.
 *
 * Usage:
 *   const [tab, setTab] = useState<Tab>('a');
 *   const setTabWithNav = useNavSetter(tab, setTab, {
 *     label: (prev) => `Back to ${prev}`,
 *     scope: 'rules',
 *   });
 */
export function useNavSetter<T>(
  current: T,
  setter: (next: T) => void,
  options: NavSetterOptions<T> = {},
): (next: T) => void {
  const { label, scope, skipNoOp = true } = options;
  const { push: navPush } = useNav();

  // Stable refs so the returned callback never has to be re-created when
  // `current` or `setter` change.
  const currentRef = useRef(current);
  currentRef.current = current;
  const setterRef = useRef(setter);
  setterRef.current = setter;

  return useCallback((next: T) => {
    const prev = currentRef.current;
    if (skipNoOp && prev === next) return;
    navPush({
      undo: () => setterRef.current(prev),
      label: label?.(prev, next),
      scope,
    });
    setterRef.current(next);
  }, [navPush, label, scope, skipNoOp]);
}
