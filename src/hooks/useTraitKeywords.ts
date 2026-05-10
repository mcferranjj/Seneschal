/**
 * useTraitKeywords
 *
 * React hook that wraps the initTraitDescriptions / linkKeywords singleton.
 * Components call this once on mount; subsequent renders use the cached regex.
 */

import { useEffect } from 'react';
import { initTraitDescriptions } from '../utils/foundryMacros';

export function useTraitKeywords(): void {
  useEffect(() => {
    initTraitDescriptions().catch(() => {
      // Non-critical — trait tooltips fall back to plain text
    });
  }, []);
}
