/**
 * Level Scaling Utility
 *
 * Scales a creature's stats to a new level using the PF2e creature creation tables.
 * The algorithm:
 *  1. For each stat, find the nearest table tier at the base level.
 *  2. Compute a flat differential (actual − table value).
 *  3. Look up that tier at the target level and add the differential.
 *
 * Always reads from the original base creature data — never stacks on prior scaling.
 * This guarantees idempotency: scaling L4→L7→L4 always equals scaling L4→L4 directly.
 */

import type { CreatureRecord } from '../db/schema';
import type { PF2ECreature } from '../types/pf2e';
import type { CustomSpellcastingEntry } from '../types/encounter';
import {
  HP_TABLE,
  AC_TABLE,
  SAVE_TABLE,
  ATTACK_TABLE,
  DAMAGE_TABLE,
  AREA_DAMAGE_TABLE,
  ABILITY_TABLE,
  PERCEPTION_TABLE,
  RES_WEAK_TABLE,
} from '../components/CustomCreatureWizard/CustomCreatureWizard';
import { importSpellcasting } from './importCreature';

// ── Tier definitions ──────────────────────────────────────────────────────────

type HpTier      = 'low' | 'moderate' | 'high';
type AcTier      = 'low' | 'moderate' | 'high' | 'extreme';
type SaveTier    = 'terrible' | 'low' | 'moderate' | 'high' | 'extreme';
type AbilityTier = 'low' | 'moderate' | 'high' | 'extreme';
type ResWeakTier = 'low' | 'moderate' | 'high';

const HP_TIERS:       HpTier[]      = ['low', 'moderate', 'high'];
const AC_TIERS:       AcTier[]      = ['low', 'moderate', 'high', 'extreme'];
const SAVE_TIERS:     SaveTier[]    = ['terrible', 'low', 'moderate', 'high', 'extreme'];
const ABILITY_TIERS:  AbilityTier[] = ['low', 'moderate', 'high', 'extreme'];
const RES_WEAK_TIERS: ResWeakTier[] = ['low', 'moderate', 'high'];

// ── Core algorithm ────────────────────────────────────────────────────────────

function clampLevel(level: number): number {
  return Math.max(-1, Math.min(25, level));
}

/**
 * Given a numeric stat value and its base level, find the nearest tier
 * (the highest tier whose table value does not exceed the stat) and the
 * flat differential between the actual value and that tier's table value.
 */
function findTierAndDiff<T extends string>(
  value: number,
  baseLevel: number,
  table: Record<number, Record<T, number>>,
  tiers: T[],
): { tier: T; diff: number } {
  const l = clampLevel(baseLevel);
  const row = table[l] ?? table[0];

  // Sort tiers ascending by their table value at this level
  const sorted = [...tiers].sort((a, b) => (row[a] ?? 0) - (row[b] ?? 0));

  // Find the highest tier whose value is ≤ our stat
  let bestTier = sorted[0];
  for (const t of sorted) {
    if ((row[t] ?? 0) <= value) {
      bestTier = t;
    }
  }

  const diff = value - (row[bestTier] ?? 0);
  return { tier: bestTier, diff };
}

/** Scale a single numeric stat to the target level. */
function scaleNumericStat<T extends string>(
  value: number,
  baseLevel: number,
  targetLevel: number,
  table: Record<number, Record<T, number>>,
  tiers: T[],
): number {
  if (value == null || isNaN(value)) return value;
  const { tier, diff } = findTierAndDiff(value, baseLevel, table, tiers);
  const tl = clampLevel(targetLevel);
  const targetRow = table[tl] ?? table[0];
  return (targetRow[tier] ?? 0) + diff;
}

// ── Damage scaling ────────────────────────────────────────────────────────────

/**
 * Parse a damage expression like "2d8+9" or "4d6" into a flat average number.
 * Returns null if the expression cannot be parsed.
 */
function exprToAvg(expr: string): number | null {
  const m = expr.trim().match(/^(\d+)d(\d+)(?:([+-]\d+))?$/);
  if (!m) return null;
  const count = parseInt(m[1]);
  const sides = parseInt(m[2]);
  const flat  = m[3] ? parseInt(m[3]) : 0;
  return count * (sides + 1) / 2 + flat;
}

/**
 * Convert the flat average diff back into a modified dice expression.
 * We take the target table entry (which gives us the right dice for that level),
 * then adjust its flat modifier so that the resulting average matches
 * targetEntryAvg + diff.
 *
 * e.g. targetEntry = "2d10+9" (avg 20), diff = +1.5 → newFlat = 9 + round(1.5) = 11
 *      → "2d10+11"
 */
function applyDiffToEntry(targetEntry: string, diff: number): string {
  const m = targetEntry.trim().match(/^(\d+d\d+)(?:([+-]\d+))?$/);
  if (!m) return targetEntry;
  const dice    = m[1];
  const oldFlat = m[2] ? parseInt(m[2]) : 0;
  const newFlat = oldFlat + Math.round(diff);
  if (newFlat === 0) return dice;
  return `${dice}${newFlat > 0 ? `+${newFlat}` : newFlat}`;
}

/**
 * Scale a single-target damage expression (uses the strike damage table, Table 2-10).
 *
 * Algorithm:
 *  1. Convert the input expression to a flat average.
 *  2. Convert each tier's table entry at the base level to a flat average.
 *  3. Find the highest tier whose average does not exceed the input average.
 *  4. Compute diff = inputAvg − tierAvg.
 *  5. Look up that same tier at the target level.
 *  6. Apply diff to the target entry's flat modifier.
 */
export function scaleDamageExpr(expr: string, baseLevel: number, targetLevel: number): string {
  const inputAvg = exprToAvg(expr.replace(/\s/g, ''));
  if (inputAvg === null) return expr;

  const bl = clampLevel(baseLevel);
  const tl = clampLevel(targetLevel);
  const baseRow   = DAMAGE_TABLE[bl] ?? DAMAGE_TABLE[0];
  const targetRow = DAMAGE_TABLE[tl] ?? DAMAGE_TABLE[0];

  // Sort tiers ascending by their average at the base level
  const tiers = AC_TIERS as AcTier[];
  const sorted = [...tiers].sort((a, b) => {
    return (exprToAvg(baseRow[a] ?? '') ?? 0) - (exprToAvg(baseRow[b] ?? '') ?? 0);
  });

  // Find the highest tier whose average ≤ inputAvg
  let bestTier = sorted[0];
  for (const t of sorted) {
    const tierAvg = exprToAvg(baseRow[t] ?? '');
    if (tierAvg !== null && tierAvg <= inputAvg) bestTier = t;
  }

  const baseTierAvg = exprToAvg(baseRow[bestTier] ?? '') ?? 0;
  const diff = inputAvg - baseTierAvg;

  const targetEntry = targetRow[bestTier];
  if (!targetEntry) return expr;

  return applyDiffToEntry(targetEntry, diff);
}

/**
 * Scale a multi-target (area) damage expression (uses the area damage table, Table 2-12).
 * The area table has two tiers: unlimited-use and limited-use.
 *
 * Whether to use the unlimited or limited tier is determined by the `isLimited` parameter,
 * which mirrors the same logic used for elite/weak damage adjustment.
 */
export function scaleAreaDamageExpr(
  expr: string,
  baseLevel: number,
  targetLevel: number,
  isLimited: boolean,
): string {
  const inputAvg = exprToAvg(expr.replace(/\s/g, ''));
  if (inputAvg === null) return expr;

  const bl = clampLevel(baseLevel);
  const tl = clampLevel(targetLevel);
  const baseRow   = AREA_DAMAGE_TABLE[bl] ?? AREA_DAMAGE_TABLE[0];
  const targetRow = AREA_DAMAGE_TABLE[tl] ?? AREA_DAMAGE_TABLE[0];

  // Use the tier matching the ability's use frequency
  const tier: 'unlimited' | 'limited' = isLimited ? 'limited' : 'unlimited';

  const baseTierAvg = exprToAvg(baseRow[tier] ?? '') ?? 0;
  const diff = inputAvg - baseTierAvg;

  const targetEntry = targetRow[tier];
  if (!targetEntry) return expr;

  return applyDiffToEntry(targetEntry, diff);
}

// ── Ability description scaling ───────────────────────────────────────────────

const DICE_EXPR_RE = /^(\d+d\d+(?:[+-]\d+)?)/;

/**
 * Returns true if the @Damage macro inner string contains the area-damage option.
 * This is the authoritative Foundry signal for multi-target abilities.
 */
function hasAreaDamageOption(inner: string): boolean {
  return /\boptions:[^|]*area-damage/.test(inner);
}

/**
 * Returns true if the full ability HTML description indicates a multi-target (area)
 * ability — used as a fallback when the @Damage macro lacks the options:area-damage
 * tag (which is common for swarm abilities and some spell-like abilities in Foundry data).
 *
 * Patterns matched (all validated against actual bestiary data):
 *  - "each enemy/creature/foe/target in the swarm's space / its space"
 *  - "each enemy/creature/foe/target in the area/burst/cone/line/emanation/cylinder"
 *  - "all creatures/enemies in the area/burst/cone/line/emanation/swarm's space"
 *  - "deals … to each creature/enemy in"
 */
function isAreaByKeyword(html: string): boolean {
  return (
    // Swarm-space patterns (most common gap — Foundry never tags these)
    /each\s+(?:enemy|creature|foe|target)\s+in\s+(?:the\s+)?(?:swarm'?s?\s+space|its\s+space)/i.test(html) ||
    // Template-based: each X in the area/burst/cone/line/emanation
    /each\s+(?:enemy|creature|foe|target)\s+in\s+(?:the\s+)?(?:area|burst|cone|line|emanation|cylinder|square)/i.test(html) ||
    // "all creatures in the area/swarm's space"
    /all\s+(?:creatures?|enemies|foes|targets?)\s+in\s+(?:the\s+)?(?:area|burst|cone|line|emanation|swarm'?s?\s+space|its\s+space)/i.test(html) ||
    // "deals damage to each creature in"
    /to\s+each\s+(?:creature|enemy|foe)\s+in\s+/i.test(html)
  );
}

/**
 * Returns true if the ability description text indicates a limited-use ability
 * (recharge, per-day, per-encounter, etc.) as opposed to at-will.
 * Mirrors the isLimitedUse() logic used for structured PF2EItem objects.
 */
function isLimitedUseText(html: string): boolean {
  // Recharge mechanic
  if (/\[\[\/gmr\b/i.test(html)) return true;
  // "can't/cannot use X again"
  if (/can['']t use .+ again|cannot use .+ again/i.test(html)) return true;
  // Frequency language: "N times per X" where X is not "round"
  const freqMatch = html.match(/\b(?:once|twice|\d+ times?)\s+per\s+(round|minute|hour|day|week|encounter|combat)/i);
  if (freqMatch && freqMatch[1].toLowerCase() !== 'round') return true;
  return false;
}

/**
 * Apply regex replacements to `original` text using match positions found in
 * `masked` text (which has macro bodies replaced with spaces so macro-internal
 * patterns are invisible). Replacements are spliced back into `original` by offset.
 */
function applyMaskedReplacements(
  original: string,
  masked: string,
  re: RegExp,
  replacer: (...args: string[]) => string,
): string {
  // Collect all matches from masked, then apply back-to-front to original
  const matches: Array<{ index: number; length: number; replacement: string }> = [];
  let m: RegExpExecArray | null;
  const globalRe = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = globalRe.exec(masked)) !== null) {
    const replacement = replacer(...(m as unknown as string[]));
    if (replacement !== m[0]) {
      matches.push({ index: m.index, length: m[0].length, replacement });
    }
  }
  // Apply back-to-front so offsets stay valid
  let result = original;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, length, replacement } = matches[i];
    result = result.slice(0, index) + replacement + result.slice(index + length);
  }
  return result;
}

/**
 * Scale @Damage macros and @Check dc: values in a raw Foundry HTML description.
 *
 * Rules:
 *  - @Damage with options:area-damage OR description contains swarm/area keywords
 *      → scaleAreaDamageExpr (multi-target table)
 *  - @Damage without either signal → scaleDamageExpr (strike table)
 *  - @Check[flat|...] → never scaled (flat checks are pure probability, no modifiers)
 *  - @Check[other|dc:N] → scaled via SAVE_TABLE
 *  - Plain-text "DC N" → scaled via SAVE_TABLE UNLESS the surrounding text node
 *    contains the phrase "flat check"
 *  - Plain-text dice expressions (e.g. "2d6+1") → scaled using the same area/single
 *    heuristic as the surrounding @Damage context (no area-damage tag in plain text,
 *    so these always use the strike table — plain-text area damage is extremely rare
 *    and always accompanied by a proper @Damage macro)
 */
export function scaleAbilityHtml(rawHtml: string, baseLevel: number, targetLevel: number): string {
  if (baseLevel === targetLevel) return rawHtml;

  const limited = isLimitedUseText(rawHtml);
  // Determine area status once for the whole description — both signals are description-level
  // (the options:area-damage tag is per-macro, but isAreaByKeyword looks at the whole HTML,
  // which is fine since a description is either an area ability or it isn't)
  const descIsArea = isAreaByKeyword(rawHtml);

  // ── 1. Scale @Damage macros ───────────────────────────────────────────────
  let result = rawHtml.replace(
    /@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{([^}]*)\})?/g,
    (fullMatch, inner, label) => {
      // Primary signal: Foundry's explicit options:area-damage tag on the macro
      // Fallback: keyword patterns in the description (covers swarms and other untagged cases)
      const useArea = hasAreaDamageOption(inner) || descIsArea;

      const optionsSuffix = inner.match(/\|[^[,].*$/)?.[0] ?? '';
      const withoutOptions = inner.replace(/\|[^[,].*$/, '');
      const groups = withoutOptions.split(',');

      const firstGroup = groups[0].trim();
      const exprMatch = firstGroup.match(DICE_EXPR_RE);
      if (!exprMatch) return fullMatch;

      const oldExpr = exprMatch[1];
      const newExpr = useArea
        ? scaleAreaDamageExpr(oldExpr, baseLevel, targetLevel, limited)
        : scaleDamageExpr(oldExpr, baseLevel, targetLevel);
      if (newExpr === oldExpr) return fullMatch;

      const typeAndRest = firstGroup.slice(exprMatch[0].length);
      const newInner = [newExpr + typeAndRest, ...groups.slice(1)].join(',') + optionsSuffix;

      let newLabel = label as string | undefined;
      if (label) {
        const labelParts = label.split(/(\s+and\s+|\s+plus\s+)/i);
        labelParts[0] = (labelParts[0] as string).replace(DICE_EXPR_RE, newExpr);
        newLabel = labelParts.join('');
      }

      return `@Damage[${newInner}]${newLabel != null ? `{${newLabel}}` : ''}`;
    }
  );

  // ── 2. Scale @Check dc: values (skip flat checks) ────────────────────────
  result = result.replace(
    /@Check\[([^\]]*)\]/g,
    (fullMatch, inner) => {
      // Flat checks are never modified — they represent pure random probability
      const checkType = inner.split('|')[0]?.trim().toLowerCase() ?? '';
      if (checkType === 'flat') return fullMatch;

      // Scale dc: value if present
      return fullMatch.replace(/(\bdc:)(\d+)/, (_, pre, dc) => {
        const scaled = scaleNumericStat(parseInt(dc), baseLevel, targetLevel, SAVE_TABLE as Record<number, Record<string, number>>, SAVE_TIERS);
        return `${pre}${scaled}`;
      });
    }
  );

  // ── 3. Scale plain-text content (text nodes only) ────────────────────────
  // IMPORTANT: The regex />([^<]+)</ captures everything between HTML tags, which
  // includes any remaining @Damage[...] or @Check[...] macros that sit inline
  // (Foundry HTML has no wrapping element around macros — they're in the text flow).
  // We must NOT re-scale dice expressions that are already inside a macro.
  // Strategy: for each text node, blank out macro bodies before scanning for bare
  // dice/DC values, but apply replacements to the original text by position.
  result = result.replace(/>([^<]+)</g, (_match, text) => {
    // Mask macro content so dice inside @Damage[...], @Check[...], and [[/gmr ...]]
    // are invisible to our plain-text patterns. We replace macro bodies with
    // equal-length spaces so that character offsets stay valid.
    const masked = text
      // @Word[...]{optional label} macros (covers @Damage, @Check, @UUID, etc.)
      .replace(/@\w+\[(?:[^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\](?:\{[^}]*\})?/g,
        (m: string) => ' '.repeat(m.length))
      // [[/command ...]]{optional label} macros (covers [[/gmr]], [[/r]], etc.)
      .replace(/\[\[\/[^\]]+\]\](?:\{[^}]*\})?/g,
        (m: string) => ' '.repeat(m.length));

    let scaled = text;

    // Scale "DC N" patterns — but NEVER when the masked text contains "flat check"
    // (flat checks are always adjacent to the phrase "flat check" in plain text)
    const hasFlatCheck = /\bflat\s+check\b/i.test(masked);
    if (!hasFlatCheck) {
      // Walk the masked text for "DC N" matches, apply at the same offset in `scaled`
      scaled = applyMaskedReplacements(text, masked, /\bDC (\d+)\b/g, (m, dc) => {
        const scaledDc = scaleNumericStat(parseInt(dc), baseLevel, targetLevel, SAVE_TABLE as Record<number, Record<string, number>>, SAVE_TIERS);
        return `DC ${scaledDc}`;
      });
    }

    // Scale bare dice expressions in the masked text (so macros are skipped)
    scaled = applyMaskedReplacements(scaled, masked, /\b(\d+d\d+(?:[+-]\d+)?)\b/g,
      (diceExpr) => scaleDamageExpr(diceExpr, baseLevel, targetLevel));

    return `>${scaled}<`;
  });

  return result;
}

// ── ScaledStats output type ───────────────────────────────────────────────────

export interface ScaledStats {
  targetLevel: number;
  ac: number;
  hp: number;
  fort: number;
  ref: number;
  will: number;
  perception: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  skills: Array<{ name: string; mod: number }>;
  attacks: Array<{
    name: string;
    bonus: number;
    damage: string;
    traits: string[];
    type: 'melee' | 'ranged';
    range?: number;
  }>;
  spellcasting: CustomSpellcastingEntry[];
  resistances: Array<{ type: string; value: number; exceptions?: string }>;
  weaknesses: Array<{ type: string; value: number; exceptions?: string }>;
}

// ── Master scaling function ───────────────────────────────────────────────────

/**
 * Build a ScaledStats object by scaling every scalable stat from the original
 * creature data to the target level. Always reads from creature.data — never
 * from a previously-scaled snapshot.
 */
export function buildScaledCreature(creature: CreatureRecord, targetLevel: number): ScaledStats {
  const c = creature.data as PF2ECreature;

  // Determine the creature's actual base level
  const lvl = c.system?.details?.level;
  const baseLevel = typeof lvl === 'object' ? (lvl?.value ?? 0) : ((lvl as number | null | undefined) ?? 0);

  // ── Defenses ────────────────────────────────────────────────────────────────
  const rawAc   = c.system?.attributes?.ac?.value ?? 14;
  const rawHp   = c.system?.attributes?.hp?.max ?? 20;
  const rawFort = c.system?.saves?.fortitude?.value ?? 5;
  const rawRef  = c.system?.saves?.reflex?.value ?? 5;
  const rawWill = c.system?.saves?.will?.value ?? 5;
  const rawPerc = c.system?.perception?.mod ?? c.system?.perception?.value ?? 5;

  const ac   = scaleNumericStat(rawAc,   baseLevel, targetLevel, AC_TABLE   as Record<number, Record<string, number>>, AC_TIERS);
  const hp   = scaleNumericStat(rawHp,   baseLevel, targetLevel, HP_TABLE   as Record<number, Record<string, number>>, HP_TIERS);
  const fort = scaleNumericStat(rawFort, baseLevel, targetLevel, SAVE_TABLE as Record<number, Record<string, number>>, SAVE_TIERS);
  const ref  = scaleNumericStat(rawRef,  baseLevel, targetLevel, SAVE_TABLE as Record<number, Record<string, number>>, SAVE_TIERS);
  const will = scaleNumericStat(rawWill, baseLevel, targetLevel, SAVE_TABLE as Record<number, Record<string, number>>, SAVE_TIERS);
  const perception = scaleNumericStat(rawPerc, baseLevel, targetLevel, PERCEPTION_TABLE as Record<number, Record<string, number>>, SAVE_TIERS);

  // ── Ability modifiers ────────────────────────────────────────────────────────
  const rawStr = c.system?.abilities?.str?.mod ?? 0;
  const rawDex = c.system?.abilities?.dex?.mod ?? 0;
  const rawCon = c.system?.abilities?.con?.mod ?? 0;
  const rawInt = c.system?.abilities?.int?.mod ?? 0;
  const rawWis = c.system?.abilities?.wis?.mod ?? 0;
  const rawCha = c.system?.abilities?.cha?.mod ?? 0;

  const str = scaleNumericStat(rawStr, baseLevel, targetLevel, ABILITY_TABLE as Record<number, Record<string, number>>, ABILITY_TIERS);
  const dex = scaleNumericStat(rawDex, baseLevel, targetLevel, ABILITY_TABLE as Record<number, Record<string, number>>, ABILITY_TIERS);
  const con = scaleNumericStat(rawCon, baseLevel, targetLevel, ABILITY_TABLE as Record<number, Record<string, number>>, ABILITY_TIERS);
  const int = scaleNumericStat(rawInt, baseLevel, targetLevel, ABILITY_TABLE as Record<number, Record<string, number>>, ABILITY_TIERS);
  const wis = scaleNumericStat(rawWis, baseLevel, targetLevel, ABILITY_TABLE as Record<number, Record<string, number>>, ABILITY_TIERS);
  const cha = scaleNumericStat(rawCha, baseLevel, targetLevel, ABILITY_TABLE as Record<number, Record<string, number>>, ABILITY_TIERS);

  // ── Skills ───────────────────────────────────────────────────────────────────
  const rawSkills = c.system?.skills ?? {};
  const skills = Object.entries(rawSkills)
    .map(([name, data]) => {
      const rawMod = data.base ?? data.value ?? 0;
      return { name, mod: scaleNumericStat(rawMod, baseLevel, targetLevel, SAVE_TABLE as Record<number, Record<string, number>>, SAVE_TIERS) };
    })
    .filter(s => s.mod !== 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // ── Attacks (official PF2e items) ─────────────────────────────────────────
  const attackItems = (c.items ?? []).filter(i => i.type === 'melee' || i.type === 'ranged');
  const attacks = attackItems.map(item => {
    const rawBonus = item.system?.bonus?.value ?? 0;
    const scaledBonus = scaleNumericStat(rawBonus, baseLevel, targetLevel, ATTACK_TABLE as Record<number, Record<string, number>>, AC_TIERS);

    // Get the raw damage string (first roll entry)
    const damageRolls = item.system?.damageRolls ?? {};
    const firstDmg = Object.values(damageRolls)[0];
    const rawDamageExpr = firstDmg?.damage ?? '';
    const scaledDamage = rawDamageExpr ? scaleDamageExpr(rawDamageExpr, baseLevel, targetLevel) : rawDamageExpr;
    // Preserve damage type suffix if present (e.g. "2d8+5 slashing" → use scaled dice but keep type)
    const fullDmgStr = Object.values(damageRolls)
      .map(d => {
        const expr = d.damage ?? '';
        const scaled = expr ? scaleDamageExpr(expr, baseLevel, targetLevel) : expr;
        return d.damageType ? `${scaled} ${d.damageType}` : scaled;
      })
      .join(' + ');

    const traits = item.system?.traits?.value ?? [];
    const isRanged = item.type === 'ranged' || item.system?.category === 'ranged' || item.system?.range?.increment != null;
    return {
      name: item.name ?? 'Strike',
      bonus: scaledBonus,
      damage: fullDmgStr || scaledDamage,
      traits,
      type: isRanged ? 'ranged' as const : 'melee' as const,
      range: item.system?.range?.increment ?? (typeof item.system?.range?.value === 'number' ? item.system.range.value : undefined),
    };
  });

  // ── Custom creature attacks (from customData) ─────────────────────────────
  const customAttacks = (creature.customData?.attacks ?? []).map(atk => {
    const scaledBonus = scaleNumericStat(atk.bonus, baseLevel, targetLevel, ATTACK_TABLE as Record<number, Record<string, number>>, AC_TIERS);
    const scaledDamage = atk.damage ? scaleDamageExpr(atk.damage, baseLevel, targetLevel) : atk.damage;
    return {
      name: atk.name,
      type: atk.type,
      bonus: scaledBonus,
      damage: scaledDamage,
      traits: atk.traits ?? [],
      range: atk.range,
    };
  });

  // ── Spellcasting ──────────────────────────────────────────────────────────
  const rawSpellcasting: CustomSpellcastingEntry[] = creature.packSource === 'custom'
    ? (creature.customData?.spellcasting ?? [])
    : importSpellcasting(creature);

  const spellcasting = rawSpellcasting.map(entry => ({
    ...entry,
    dc: scaleNumericStat(entry.dc, baseLevel, targetLevel, SAVE_TABLE as Record<number, Record<string, number>>, SAVE_TIERS),
    attackMod: scaleNumericStat(entry.attackMod, baseLevel, targetLevel, ATTACK_TABLE as Record<number, Record<string, number>>, AC_TIERS),
  }));

  // ── Resistances & Weaknesses ─────────────────────────────────────────────
  const rawResistances = c.system?.attributes?.resistances ?? [];
  const resistances = rawResistances.map(r => ({
    type: r.type,
    value: scaleNumericStat(r.value ?? 0, baseLevel, targetLevel, RES_WEAK_TABLE as Record<number, Record<string, number>>, RES_WEAK_TIERS),
    exceptions: r.exceptions?.join(', '),
  }));

  const rawWeaknesses = c.system?.attributes?.weaknesses ?? [];
  const weaknesses = rawWeaknesses.map(w => ({
    type: w.type,
    value: scaleNumericStat(w.value ?? 0, baseLevel, targetLevel, RES_WEAK_TABLE as Record<number, Record<string, number>>, RES_WEAK_TIERS),
    exceptions: w.exceptions?.join(', '),
  }));

  // Custom creature resistances/weaknesses
  const customResistances = (creature.customData?.resistances ?? []).map(r => ({
    type: r.type,
    value: scaleNumericStat(r.value, baseLevel, targetLevel, RES_WEAK_TABLE as Record<number, Record<string, number>>, RES_WEAK_TIERS),
    exceptions: r.exceptions,
  }));
  const customWeaknesses = (creature.customData?.weaknesses ?? []).map(w => ({
    type: w.type,
    value: scaleNumericStat(w.value, baseLevel, targetLevel, RES_WEAK_TABLE as Record<number, Record<string, number>>, RES_WEAK_TIERS),
    exceptions: w.exceptions,
  }));

  return {
    targetLevel,
    ac,
    hp: Math.max(1, Math.round(hp)),
    fort,
    ref,
    will,
    perception,
    str,
    dex,
    con,
    int,
    wis,
    cha,
    skills,
    attacks: [...attacks, ...customAttacks],
    spellcasting,
    resistances: [...resistances, ...customResistances],
    weaknesses: [...weaknesses, ...customWeaknesses],
  };
}
