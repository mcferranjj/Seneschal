import { useEffect, useRef, useState } from 'react';

/**
 * Tracks a brief "deconfirming" flag that fires when `confirmed` transitions
 * from true → false, used to run a reverse-expand animation on card grids.
 *
 * Returns `deconfirming`, which is true for ~360 ms after deconfirm and then
 * resets automatically.
 */
export function useConfirmAnimation(confirmed: boolean): boolean {
  const [deconfirming, setDeconfirming] = useState(false);
  const prevRef = useRef(confirmed);

  useEffect(() => {
    const wasConfirmed = prevRef.current;
    prevRef.current = confirmed;
    if (wasConfirmed && !confirmed) {
      setDeconfirming(true);
      const t = setTimeout(() => setDeconfirming(false), 360);
      return () => clearTimeout(t);
    }
  }, [confirmed]);

  return deconfirming;
}
