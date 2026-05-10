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

// Regex that matches a dice expression including any modifier: "9d6", "3d12+4", "2d6-1"
const DICE_EXPR_RE = /^(\d+d\d+(?:[+-]\d+)?)/;

// Parse the type label from a damage group bracket: "9d6+4[fire]" → "fire"
function parseDamageType(group: string): string | null {
  const m = group.match(/\d+d\d+(?:[+-]\d+)?\[([^\]|]+)/);
  return m ? m[1] : null;
}

// Strip Foundry inline macros to plain readable text.
// @Damage inner is e.g. "2d6[bludgeoning|options:area-damage]" — one nesting level deep.
export function stripFoundryMacros(html: string): string {
  return html
    // @Damage[9d6[fire],4d12[bludgeoning]|options:area-damage]{9d6 fire damage and 4d12 bludgeoning damage}
    // Prefer the {label} when present — it's already human-readable.
    // Fall back to parsing the inner groups if there's no label.
    .replace(/@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?/g, (_, inner, label) => {
      if (label) return label;
      // No label: parse comma-separated groups like "9d6+4[fire],4d12[bludgeoning]"
      const withoutOptions = inner.replace(/\|[^[,].*$/, '');
      const groups = withoutOptions.split(',');
      return groups.map((group: string) => {
        const exprMatch = group.trim().match(DICE_EXPR_RE);
        const type = parseDamageType(group.trim());
        if (exprMatch && type) return `${exprMatch[1]} ${type} damage`;
        if (exprMatch) return `${exprMatch[1]} damage`;
        return group.split('[')[0].trim();
      }).filter(Boolean).join(' + ');
    })
    // @Check macro — optionally followed by {label override} and/or trailing redundant words.
    // We consume:
    //   - optional {label} override from the source data
    //   - trailing "check" / "save" / "saving throw" (would duplicate the type label we emit)
    //   - trailing "against the [possessive] X DC" when the macro already encodes defense:
    //     (those words would duplicate the phrase we build from defense:X)
    .replace(
      /@Check\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?(\s+(?:saving\s+throw|save|check)(?:\s+against\s+(?:the\s+)?(?:\w+['']s\s+)?(\w+)\s+DC)?)?/g,
      (_, inner, labelOverride, _trailingSuffix, trailingDefense) => {
        // If the source data provides an explicit {label}, trust it completely.
        if (labelOverride) return labelOverride;

        // The @Check format is pipe-delimited: first segment is always the check/save type,
        // followed by optional key:value pairs like dc:N, defense:X, basic, against:X, etc.
        const segments = inner.split('|');
        const checkType = segments[0]?.trim() ?? '';
        const dcMatch = inner.match(/\bdc:(\d+)/i);
        const defenseMatch = inner.match(/\bdefense:(\w+)/i);
        const againstMatch = inner.match(/\bagainst:(\w+(?:-\w+)*)/i);
        const isBasic = /\bbasic\b/i.test(inner);

        // Map internal type names to display labels
        const saveTypes = new Set(['fortitude', 'reflex', 'will']);
        const isSave = saveTypes.has(checkType.toLowerCase());
        const isFlat = checkType.toLowerCase() === 'flat';

        // Build the human-readable check/save label
        const typeLabel = (() => {
          if (isFlat) return 'flat check';
          if (isSave) return `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} save`;
          // Skill or other check — capitalize and append "check"
          return `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} check`;
        })();

        const basicPrefix = isBasic ? 'basic ' : '';

        if (dcMatch) {
          // Trailing "save" / "check" is consumed by the regex; dc: already contains the DC.
          return `DC ${dcMatch[1]} ${basicPrefix}${typeLabel}`;
        }
        if (defenseMatch) {
          // The trailing "check/save against the X DC" text is consumed by the regex — we emit
          // the full canonical phrase ourselves.
          const defense = defenseMatch[1];
          const defenseLabel = defense.charAt(0).toUpperCase() + defense.slice(1);
          return `${basicPrefix}${typeLabel} against the creature's ${defenseLabel} DC`;
        }
        if (againstMatch) {
          const against = againstMatch[1].replace(/-/g, ' ');
          const againstLabel = against.charAt(0).toUpperCase() + against.slice(1);
          return `${basicPrefix}${typeLabel} against ${againstLabel} DC`;
        }
        // No DC in macro — if trailing text told us the defense type, use it.
        if (trailingDefense) {
          const defenseLabel = trailingDefense.charAt(0).toUpperCase() + trailingDefense.slice(1);
          return `${basicPrefix}${typeLabel} against the creature's ${defenseLabel} DC`;
        }
        // No DC info at all — just emit the type label.
        return `${basicPrefix}${typeLabel}`;
      }
    )
    // [[/gmr 1d4 #label]]{display text} → display text; [[/cmd]]{label} → label; [[/cmd]] → ''
    .replace(/\[\[\/[^\]]+\]\]\{([^}]+)\}/g, '$1')
    .replace(/\[\[\/[^\]]+\]\]/g, '')
    .replace(/@UUID\[Compendium\.[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/@UUID\[Actor\.[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/@UUID\[[^\]]+\.([^\].]+)\]/g, '$1')
    .replace(/@Localize\[[^\]]+\]/g, '')
    .replace(/@Template\[([^\]]+)\]/g, (_, inner) => {
      const parts = inner.split('|');
      const type = parts[0]?.trim() ?? 'area';
      const distMatch = inner.match(/distance:(\d+)/i);
      const dist = distMatch ? `${distMatch[1]}-foot` : null;
      // "a 30-foot cone", "a 60-foot line", "a 20-foot burst", "a 15-foot emanation"
      return dist ? `a ${dist} ${type}` : `a ${type}`;
    })
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

/**
 * Determine whether an action item is "limited use" (recharge, per-day, per-hour, etc.)
 * vs at-will. At-will abilities get ±2 elite/weak damage; limited use get ±4.
 *
 * Rules:
 *  - structured frequency field: limited if per > once-per-round
 *    Foundry uses ISO 8601: PT1R = 1 round (at-will tier), anything longer = limited
 *  - description text: look for recharge macros ([[/gmr ...]]) or
 *    "can't use ... again", or explicit frequency language that is worse than once/round
 */
export function isLimitedUse(item: PF2EItem): boolean {
  // 1. Check structured frequency field
  const freq = item.system?.frequency;
  if (freq) {
    const per = freq.per ?? '';
    // PT1R = per round → at-will tier (not limited)
    // Anything else (PT1M, PT1H, P1D, PT1S, etc.) = limited use
    const isPerRound = /^PT1R$/i.test(per);
    if (!isPerRound) return true;
  }

  // 2. Check description text
  const desc = item.system?.description?.value ?? '';

  // Recharge mechanic: [[/gmr ...]] means the ability has a recharge time
  if (/\[\[\/gmr\b/i.test(desc)) return true;

  // "can't use X again for N rounds/minutes/hours/days"
  if (/can['']t use .+ again/i.test(desc) || /cannot use .+ again/i.test(desc)) return true;

  // Explicit frequency text — match "N times per X" or "once/twice per X"
  // but exclude "once per round" (at-will tier)
  const freqMatch = desc.match(
    /\b(?:once|twice|\d+ times?)\s+per\s+(round|minute|hour|day|week|encounter|combat)/i
  );
  if (freqMatch) {
    const period = freqMatch[1].toLowerCase();
    if (period !== 'round') return true;
  }

  return false;
}

/**
 * Apply elite/weak adjustments to a raw Foundry HTML description:
 *  - Bumps the first @Damage macro's first group by `dmgMod` (±2 or ±4)
 *  - Bumps all @Check dc: values by `dcMod` (always ±2)
 *
 * Returns modified raw HTML; call stripFoundryMacros on the result for display.
 */
export function applyEliteWeakToHtml(rawHtml: string, dmgMod: number, dcMod: number): string {
  if (dmgMod === 0 && dcMod === 0) return rawHtml;

  // ── 1. Adjust the first @Damage macro ────────────────────────────────────
  let appliedDamageOnce = false;
  let result = dmgMod === 0 ? rawHtml : rawHtml.replace(
    /@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?/g,
    (fullMatch, inner, label) => {
      if (appliedDamageOnce) return fullMatch;
      appliedDamageOnce = true;

      const optionsSuffix = inner.match(/\|[^[,].*$/)?.[0] ?? '';
      const withoutOptions = inner.replace(/\|[^[,].*$/, '');
      const groups = withoutOptions.split(',');

      const firstGroup = groups[0].trim();
      const exprMatch = firstGroup.match(DICE_EXPR_RE);
      if (!exprMatch) return fullMatch;

      // Compute new dice expression, merging with any existing modifier
      const diceMatch = exprMatch[1].match(/^(\d+d\d+)([+-]\d+)?$/);
      let newExpr: string;
      if (diceMatch) {
        const dice = diceMatch[1];
        const existingMod = diceMatch[2] ? parseInt(diceMatch[2]) : 0;
        const totalMod = existingMod + dmgMod;
        newExpr = totalMod === 0 ? dice : `${dice}${totalMod > 0 ? `+${totalMod}` : totalMod}`;
      } else {
        newExpr = `${exprMatch[1]}${dmgMod > 0 ? `+${dmgMod}` : dmgMod}`;
      }

      // Rebuild group: preserve everything after the dice expr (the "[fire]" bracket)
      const typeAndRest = firstGroup.slice(exprMatch[0].length);
      const newInner = [newExpr + typeAndRest, ...groups.slice(1)].join(',') + optionsSuffix;

      // Update the display label if present — replace dice expr in the first damage phrase
      let newLabel = label as string | undefined;
      if (label) {
        // Split preserving separators so we only touch the first phrase
        const labelParts = label.split(/(\s+and\s+|\s+plus\s+)/i);
        labelParts[0] = (labelParts[0] as string).replace(DICE_EXPR_RE, newExpr);
        newLabel = labelParts.join('');
      }

      return `@Damage[${newInner}]${newLabel != null ? `{${newLabel}}` : ''}`;
    }
  );

  // ── 2. Adjust all @Check dc: values by dcMod (±2) ───────────────────────
  // Flat checks (@Check[flat|...]) are never adjusted — they represent pure random
  // probability with no modifiers.
  if (dcMod !== 0) result = result.replace(
    /@Check\[([^\]]*)\]/g,
    (fullMatch, inner) => {
      const checkType = inner.split('|')[0]?.trim().toLowerCase() ?? '';
      if (checkType === 'flat') return fullMatch;
      return fullMatch.replace(/(\bdc:)(\d+)/, (_, pre, dc) => `${pre}${parseInt(dc) + dcMod}`);
    }
  );

  return result;
}

export interface DamageGroup {
  expr: string;   // e.g. "9d6"
  label: string;  // e.g. "9d6 fire damage"
}

/**
 * Extract all @Damage macros from a raw Foundry HTML description and return
 * them as { expr, label } pairs suitable for the multi-damage roller.
 * Uses the {display label} when present; falls back to parsing inner groups.
 */
export function extractDamageGroups(rawHtml: string): DamageGroup[] {
  const groups: DamageGroup[] = [];
  const re = /@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawHtml)) !== null) {
    const inner = m[1];
    const labelText = m[2]; // may be undefined

    // Strip top-level |options:... suffix
    const withoutOptions = inner.replace(/\|[^[,].*$/, '');
    // Comma-separated damage groups e.g. "9d6+4[fire],4d12[bludgeoning]"
    const parts = withoutOptions.split(',');

    parts.forEach((part, i) => {
      const trimmed = part.trim();
      const exprMatch = trimmed.match(DICE_EXPR_RE);
      if (!exprMatch) return;
      const expr = exprMatch[1];

      // Determine label for this individual group
      let label: string;
      if (labelText && parts.length === 1) {
        label = labelText;
      } else if (labelText && parts.length > 1) {
        const labelParts = labelText.split(/\s+and\s+|\s+plus\s+/i);
        label = labelParts[i]?.trim() ?? labelText;
      } else {
        const type = parseDamageType(trimmed);
        label = type ? `${expr} ${type} damage` : `${expr} damage`;
      }

      groups.push({ expr, label });
    });
  }
  return groups;
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
