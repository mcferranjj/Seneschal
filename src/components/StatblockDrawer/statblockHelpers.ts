import type { PF2ECreature, PF2EItem } from '../../types/pf2e';
import { loadTraitDescriptions } from '../../sync/sync';

export function getLevel(c: PF2ECreature): number {
  const lvl = c.system?.details?.level;
  if (!lvl) return 0;
  return typeof lvl === 'object' ? lvl.value ?? 0 : (lvl as number);
}

export function getSize(c: PF2ECreature): string {
  const sz = c.system?.traits?.size;
  if (!sz) return 'Medium';
  const raw = typeof sz === 'object' ? sz.value : (sz as string);
  const map: Record<string, string> = {
    tiny: 'Tiny', sm: 'Small', med: 'Medium', lg: 'Large', huge: 'Huge', grg: 'Gargantuan',
  };
  return map[raw] ?? raw;
}

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

export function formatMod(n: number | undefined | null): string {
  if (n == null) return '—';
  return n >= 0 ? `+${n}` : `${n}`;
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

export function getActionCostLabel(item: PF2EItem): string {
  const at = item.system?.actionType?.value;
  const cost = item.system?.actions?.value;
  if (at === 'reaction') return '[R]';
  if (at === 'free') return '[F]';
  if (at === 'passive') return '';
  if (cost === 1) return '[A]';
  if (cost === 2) return '[AA]';
  if (cost === 3) return '[AAA]';
  return '';
}

// Strip Foundry inline macros to plain readable text.
// @Damage inner is e.g. "2d6[bludgeoning|options:area-damage]" — one nesting level deep.
export function stripFoundryMacros(html: string): string {
  return html
    // @Damage[formula[type|options]] — match up to two levels of brackets
    .replace(/@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\]/g, (_, inner) => {
      // Formula is everything before the first nested '['
      return inner.split('[')[0].trim();
    })
    .replace(/@Check\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\]/g, (_, inner) => {
      const dcMatch = inner.match(/dc:(\d+)/i);
      const typeMatch = inner.match(/type:(\w+)/i);
      if (dcMatch && typeMatch) return `DC ${dcMatch[1]} ${typeMatch[1]}`;
      if (dcMatch) return `DC ${dcMatch[1]}`;
      if (typeMatch) return `${typeMatch[1]} check`;
      return 'check';
    })
    .replace(/@UUID\[Compendium\.[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/@UUID\[Actor\.[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/@UUID\[[^\]]+\.([^\].]+)\]/g, '$1')
    .replace(/@Localize\[[^\]]+\]/g, '')
    .replace(/@Template\[[^\]]+\]/g, 'an area')
    .replace(/@[A-Z][a-zA-Z]+\[[^\]]+\]/g, '');
}

// Wrap dice expressions and modifiers in clickable spans for the dice roller.
// Matches: "2d6+3", "1d20", "+7", "-3" (but not lone digits like HP values)
export function linkRolls(html: string): string {
  return html.replace(/>([^<]+)</g, (_match, text) => {
    const linked = text.replace(
      /\b(\d+d\d+(?:[+-]\d+)?)\b|(?<!\d)([+-]\d+)(?!\d)/g,
      (m: string) => {
        const expr = m.trim();
        // Pure dice (e.g. 2d6) → label "Damage"; modifier (e.g. +7) → label "Check"
        const label = /d/i.test(expr) ? 'Damage' : 'Check';
        return `<span class="pf2roll" data-expr="${expr}" data-label="${label}">${m}</span>`;
      }
    );
    return `>${linked}<`;
  });
}

// Runtime keyword map — populated from the DB after sync.
let _keywordMap: Record<string, string> = {};
let _keywordRegex: RegExp | null = null;

function buildKeywordRegex(map: Record<string, string>): RegExp {
  return new RegExp(
    '\\b(' +
      Object.keys(map)
        .sort((a, b) => b.length - a.length)
        .map(k => k.replace(/[-]/g, '[-\\s]').replace(/[()]/g, '\\$&'))
        .join('|') +
      ')\\b',
    'gi'
  );
}

/**
 * Called once on app load (after sync). Loads Foundry trait descriptions from
 * the DB and builds the keyword map and regex.
 */
export async function initTraitDescriptions(): Promise<void> {
  const fromDb = await loadTraitDescriptions();
  if (Object.keys(fromDb).length === 0) return;

  // DB keys are lowercase (e.g. "agile") — convert to Title Case for display matching.
  const map: Record<string, string> = {};
  for (const [traitLower, desc] of Object.entries(fromDb)) {
    const displayKey = traitLower.charAt(0).toUpperCase() + traitLower.slice(1);
    map[displayKey] = desc;
  }

  _keywordMap = map;
  _keywordRegex = buildKeywordRegex(map);
}

export function linkKeywords(html: string): string {
  if (!_keywordRegex) return html;
  // Only process text nodes, not inside HTML tags or existing attributes
  return html.replace(/>([^<]+)</g, (_match, text) => {
    const linked = text.replace(_keywordRegex!, (kw: string) => {
      const key = Object.keys(_keywordMap).find(k => k.toLowerCase() === kw.toLowerCase()) ?? kw;
      const tip = _keywordMap[key] ?? '';
      return `<span class="pf2kw" data-tip="${tip.replace(/"/g, '&quot;')}">${kw}</span>`;
    });
    return `>${linked}<`;
  });
}
