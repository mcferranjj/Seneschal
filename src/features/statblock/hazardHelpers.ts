import type { PF2ECreature } from '../../types/pf2e';

export interface HazardDetails {
  isComplex: boolean;
  hasHealth: boolean;
  hardness: number;
  stealth: { value?: number; details?: string } | undefined;
  description: string;
  disable: string;
  reset: string;
  routine: string;
}

/**
 * Extracts all hazard-specific display fields from the raw PF2E system blob.
 * Returns a fully typed struct so callers need no unsafe casts.
 */
export function getHazardDetails(c: PF2ECreature): HazardDetails {
  const details = c.system?.details;
  const attrs   = c.system?.attributes;
  const hpMax   = attrs?.hp?.max ?? 0;
  return {
    isComplex:   details?.isComplex  ?? false,
    hasHealth:   (attrs?.hasHealth !== false) && hpMax !== 0,
    hardness:    attrs?.hardness     ?? 0,
    stealth:     attrs?.stealth,
    description: details?.description ?? '',
    disable:     details?.disable     ?? '',
    reset:       details?.reset       ?? '',
    routine:     details?.routine     ?? '',
  };
}
