import type { PF2ECreature, PF2EItem } from '../../types/pf2e';

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
  return html.replace(/>([^<]+)</g, (match, text) => {
    const linked = text.replace(
      /\b(\d+d\d+(?:[+-]\d+)?)\b|(?<!\d)([+-]\d+)(?!\d)/g,
      (m: string) => `<span class="pf2roll" data-expr="${m.trim()}">${m}</span>`
    );
    return `>${linked}<`;
  });
}

const KEYWORDS: Record<string, string> = {
  'Grab':          'Free action after a Strike. Target is grabbed (Escape DC = Athletics). Requires a free hand or similar.',
  'Improved Grab': 'As Grab, but on a critical hit. The target is restrained instead of grabbed.',
  'Shove':         'Free action after a Strike. Push the target up to 5 feet; it falls if it leaves solid ground.',
  'Improved Shove':'As Shove, but on a critical hit. The target is pushed up to 10 feet.',
  'Trip':          'Free action after a Strike. Target falls prone.',
  'Improved Trip': 'As Trip, but on a critical hit. Target is knocked prone.',
  'Push':          'Free action after a Strike. Push the target up to 10 feet.',
  'Knockdown':     'Free action after a Strike. Target falls prone on a hit.',
  'Grapple':       'Attempt an Athletics check against a foe\'s Fortitude DC to restrain them.',
  'Off-Guard':     'The creature is flat-footed and takes –2 to its AC.',
  'Flat-Footed':   '(Legacy) The creature has –2 to AC. Now called Off-Guard in the Remaster.',
  'Frightened':    '–1 penalty to all checks and DCs per value; reduces by 1 at end of each turn.',
  'Prone':         '–2 to attack rolls; ranged attacks against it have –2 to hit; it must crawl or take an action to stand.',
  'Stunned':       'Lose actions equal to the stunned value; reduces by 1 at end of turn.',
  'Slowed':        'Lose 1 action per round per value.',
  'Quickened':     'Gain 1 extra action per round, usable for one specific type of action.',
  'Blinded':       'Cannot see; auto-fail Perception checks relying on sight; –4 to all other Perception, –2 to attack rolls.',
  'Deafened':      'Cannot hear; –2 to Perception; spells with verbal components have 5% failure chance.',
  'Dazzled':       'Concealed from all creatures.',
  'Concealed':     'Must succeed at a DC 5 flat check when targeting; cannot be used when clearly observed.',
  'Hidden':        'Target must succeed at a DC 11 flat check to affect you; you are undetected after moving.',
  'Undetected':    'Target must guess your location (DC 11 flat check); target is flat-footed against you.',
  'Restrained':    'Cannot move; –2 to AC and attack rolls; flat-footed.',
  'Grabbed':       'Cannot move; flat-footed; –2 to attack rolls and AC.',
  'Immobilized':   'Cannot use actions with the move trait.',
  'Sickened':      '–1 to all checks and DCs per value; can attempt a Fortitude save at end of turn to reduce.',
  'Drained':       '–1 to Constitution-based checks per value; max HP reduced; reduces by 1 per day with rest.',
  'Doomed':        'Dying threshold reduced by value; if Doomed 3, your dying condition automatically causes death.',
  'Dying':         'Unconscious; must make a Recovery check each round. Die if you reach Dying 4.',
  'Paralyzed':     'Flat-footed; cannot take actions; auto-fail Str/Dex checks and attacks.',
  'Petrified':     'Turned to stone; unconscious; immune to mental and most effects.',
  'Persistent Damage': 'Take damage at end of each turn; attempt a DC 15 flat check to end the effect.',
  'Confused':      'Randomly attack creatures near you; flat-footed.',
  'Controlled':    'Another creature dictates your actions.',
  'Fascinated':    '–2 to Perception and skill checks; cannot take reactions.',
  'Fleeing':       'Must spend actions to move away from the source of fear.',
  'Invisible':     'Concealed from all creatures; cannot be targeted by sight-based abilities.',
  'Encumbered':    '–1 to attack rolls and AC; Speed reduced by 10 feet.',
};

// Build a single regex that matches any keyword (longest first to avoid partial matches)
const KEYWORD_REGEX = new RegExp(
  '\\b(' + Object.keys(KEYWORDS).sort((a, b) => b.length - a.length).map(k => k.replace(/[-]/g, '[-\\s]').replace(/[()]/g, '\\$&')).join('|') + ')\\b',
  'gi'
);

export function linkKeywords(html: string): string {
  // Only process text nodes, not inside HTML tags or existing attributes
  return html.replace(/>([^<]+)</g, (match, text) => {
    const linked = text.replace(KEYWORD_REGEX, (kw: string) => {
      // Look up canonical key (case-insensitive)
      const key = Object.keys(KEYWORDS).find(k => k.toLowerCase() === kw.toLowerCase()) ?? kw;
      const tip = KEYWORDS[key] ?? '';
      return `<span class="pf2kw" data-tip="${tip.replace(/"/g, '&quot;')}">${kw}</span>`;
    });
    return `>${linked}<`;
  });
}
