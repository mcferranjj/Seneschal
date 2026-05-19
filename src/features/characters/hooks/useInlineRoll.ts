import { useState, useCallback, useEffect, useRef } from 'react';
import { formatMod } from '../utils/proficiency';

export interface InlineRoll {
  label: string;
  mod: number;
  d20: number;
  total: number;
}

export function useInlineRoll(clearDelayMs = 3500) {
  const [activeRoll, setActiveRoll] = useState<InlineRoll | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roll = useCallback((label: string, mod: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const d20 = Math.floor(Math.random() * 20) + 1;
    setActiveRoll({ label, mod, d20, total: d20 + mod });
    timerRef.current = setTimeout(() => setActiveRoll(null), clearDelayMs);
  }, [clearDelayMs]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { activeRoll, roll, formatMod };
}
