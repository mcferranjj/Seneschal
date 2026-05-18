import type { PF2ECreature, PF2EItem } from '../../types/pf2e';
import { formatMod } from '../../utils/formatters';
// Re-export pure utilities that have moved to dedicated modules
export { formatMod } from '../../utils/formatters';
export {
  stripFoundryMacros,
  linkRolls,
  linkKeywords,
  applyEliteWeakToHtml,
  extractDamageGroups,
  isLimitedUse,
  processFoundryHtml,
} from '../../utils/foundryMacros';
export type { DamageGroup } from '../../utils/foundryMacros';
export { getLevel, getSizeLabel as getSize } from '../../utils/pf2eHelpers';

export function getLanguages(c: PF2ECreature): string {
  const langs = c.system?.details?.languages;
  if (!langs) return '';
  if (typeof langs === 'string') return langs;
  if (typeof langs === 'object') {
    const parts: string[] = [];
    if (langs.value?.length) parts.push(langs.value.join(', '));
    if (langs.details) parts.push(langs.details);
    return parts.join('; ');
  }
  return '';
}

export function getSkills(c: PF2ECreature): Array<{ name: string; mod: number }> {
  const skills = c.system?.skills ?? {};
  return Object.entries(skills)
    .map(([name, data]) => ({ name, mod: data.base ?? data.value ?? 0 }))
    .filter(s => s.mod !== 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSenses(c: PF2ECreature): string {
  const perception = c.system?.perception;
  const mod = perception?.mod ?? perception?.value ?? 0;
  const senses = perception?.senses ?? [];
  const senseParts = senses.map(s => {
    let text = s.type;
    if (s.precision) text += ` (${s.precision})`;
    if (s.range) text += ` ${s.range} ft.`;
    return text;
  });
  const details = perception?.details;
  const parts: string[] = [`Perception ${formatMod(mod)}`];
  if (senseParts.length) parts.push(senseParts.join(', '));
  if (details) parts.push(details);
  return parts.join('; ');
}

export function getSpeedString(c: PF2ECreature): string {
  const speed = c.system?.attributes?.speed;
  if (!speed) return '—';
  const parts: string[] = [`${speed.value} ft.`];
  for (const s of speed.otherSpeeds ?? []) {
    parts.push(`${s.type} ${s.value} ft.`);
  }
  return parts.join(', ');
}

/**
 * Like getSpeedString but applies a flat penalty (negative number, e.g. –10)
 * to every speed value. Speeds are clamped to a minimum of 5 ft.
 */
export function getSpeedStringWithPenalty(c: PF2ECreature, penalty: number): string {
  const speed = c.system?.attributes?.speed;
  if (!speed) return '—';
  const adj = (v: number) => Math.max(5, v + penalty);
  const parts: string[] = [`${adj(speed.value)} ft.`];
  for (const s of speed.otherSpeeds ?? []) {
    parts.push(`${s.type} ${adj(s.value)} ft.`);
  }
  return parts.join(', ');
}

export function getImmResWeak(c: PF2ECreature): {
  immunities: string;
  resistances: string;
  weaknesses: string;
} {
  const attrs = c.system?.attributes;
  const fmtList = (
    arr: Array<{ type: string; value?: number; exceptions?: string[] }> | undefined,
    hasValue: boolean,
  ) => {
    if (!arr?.length) return '';
    return arr
      .map(item => {
        let s = item.type;
        if (hasValue && item.value != null) s += ` ${item.value}`;
        if (item.exceptions?.length) s += ` (except ${item.exceptions.join(', ')})`;
        return s;
      })
      .join(', ');
  };
  return {
    immunities: fmtList(attrs?.immunities, false),
    resistances: fmtList(attrs?.resistances, true),
    weaknesses: fmtList(attrs?.weaknesses, true),
  };
}

export function getAttacks(c: PF2ECreature): PF2EItem[] {
  return c.items.filter(i => i.type === 'melee' || i.type === 'ranged');
}

export function getActions(c: PF2ECreature): PF2EItem[] {
  return c.items.filter(i => {
    if (i.type !== 'action') return false;
    const at = i.system?.actionType?.value;
    return at === 'action' || at === 'reaction' || at === 'free';
  });
}

export function getPassives(c: PF2ECreature): PF2EItem[] {
  return c.items.filter(
    i => i.type === 'action' && i.system?.actionType?.value === 'passive',
  );
}

export function getDamageString(damageRolls: Record<string, { damage: string; damageType: string }> | undefined): string {
  if (!damageRolls) return '';
  return Object.values(damageRolls)
    .map(d => `${d.damage} ${d.damageType}`)
    .join(' + ');
}

/**
 * Returns one DamageGroupInput per damage roll entry so that the DiceRoller
 * can display (and roll) each damage type separately.
 * e.g. { a: { damage: "2d6+3", damageType: "slashing" }, b: { damage: "1d4", damageType: "fire" } }
 * → [{ expr: "2d6+3", label: "slashing" }, { expr: "1d4", label: "fire" }]
 */
// ── Hazard helpers ────────────────────────────────────────────────────────────

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

export function getDamageGroups(
  damageRolls: Record<string, { damage: string; damageType: string }> | undefined,
  modOffset = 0,
): { expr: string; label: string }[] {
  if (!damageRolls) return [];
  const entries = Object.values(damageRolls);
  return entries.map((d, i) => {
    let expr = d.damage.trim();
    // Apply modifier offset only to the first group (consistent with existing behaviour)
    if (i === 0 && modOffset !== 0) {
      expr = `${expr}${modOffset >= 0 ? `+${modOffset}` : modOffset}`;
    }
    return { expr, label: d.damageType };
  });
}

