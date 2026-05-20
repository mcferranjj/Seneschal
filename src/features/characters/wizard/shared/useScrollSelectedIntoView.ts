import { useEffect, useRef, type RefObject } from 'react';

const DEFAULT_ANIM_MS = 340;

/**
 * Smoothly scroll a tracked DOM node to the top of its nearest scrollable
 * ancestor whenever `triggerKey` changes.
 *
 * Designed for the wizard's ancestry picker: when the user confirms or
 * deselects a card, the layout animates (cards collapse/expand) for ~340 ms.
 * We fire `scrollTo` once per animation frame for the duration of that
 * animation so the browser's smooth-scroll destination keeps re-targeting
 * as the post-animation layout reveals itself. End result is one continuous
 * scroll that lands exactly where the card finally sits.
 *
 * Behaviour:
 *  - Skips the first run (no animation on mount).
 *  - Honours `prefers-reduced-motion` (instant jump instead of smooth).
 *  - Restricts the scroll to the nearest auto/scroll ancestor so outer
 *    scroll parents (the wizard body, the app shell) aren't disturbed.
 */
export function useScrollSelectedIntoView<TKey>(
  ref: RefObject<HTMLElement | null>,
  triggerKey: TKey,
  options: { animMs?: number } = {},
) {
  const animMs = options.animMs ?? DEFAULT_ANIM_MS;
  const prevKeyRef = useRef<TKey | undefined>(triggerKey);

  useEffect(() => {
    const prev = prevKeyRef.current;
    prevKeyRef.current = triggerKey;
    // No-op on first render so we don't unexpectedly scroll on mount.
    if (prev === undefined || prev === triggerKey) return;

    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';

    const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
      let parent = el?.parentElement ?? null;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        const scrollable = overflowY === 'auto' || overflowY === 'scroll';
        if (scrollable && parent.scrollHeight > parent.clientHeight) break;
        parent = parent.parentElement;
      }
      return parent;
    };

    const scrollOnce = () => {
      const el = ref.current;
      if (!el) return;
      const parent = findScrollParent(el);
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const delta = elRect.top - parentRect.top;
      const target = parent.scrollTop + delta;
      parent.scrollTo({ top: Math.max(0, target), behavior: scrollBehavior });
    };

    const start = performance.now();
    let rafId = 0;
    const tick = () => {
      scrollOnce();
      if (performance.now() - start < animMs) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [triggerKey, ref, animMs]);
}
