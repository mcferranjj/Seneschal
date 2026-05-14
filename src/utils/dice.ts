/**
 * Dice Rolling Utilities
 *
 * Pure dice math — no React, no DB. Uses the Web Crypto API for entropy.
 */

// ── Parsing ───────────────────────────────────────────────────────────────────

export interface ParsedDice {
  count: number;
  sides: number;
  modifier: number;
  raw: string; // normalized, e.g. "2d6+3"
}

export function parseDice(expr: string): ParsedDice | null {
  // Normalize: collapse spaces around +/-
  const spaceNorm = expr.trim().replace(/\s*([+-])\s*/g, '$1');

  // Strip trailing non-numeric text (e.g. "slashing", "fire") — keep only the dice math
  const mathOnly = spaceNorm.replace(/^(\d+d\d+(?:[+-]\d+)*).*$/i, '$1');

  // Pure modifier "+7" / "-3" → treat as 1d20+mod
  const modOnly = mathOnly.match(/^([+-]\d+)$/);
  if (modOnly) {
    const mod = parseInt(modOnly[1]);
    return { count: 1, sides: 20, modifier: mod, raw: mathOnly };
  }

  // Extract dice portion and all subsequent +/- terms, then sum them into one modifier
  const diceMatch = mathOnly.match(/^(\d+)d(\d+)((?:[+-]\d+)*)$/i);
  if (diceMatch) {
    const count = parseInt(diceMatch[1]);
    const sides = parseInt(diceMatch[2]);
    const modTerms = diceMatch[3].match(/[+-]\d+/g) ?? [];
    const modifier = modTerms.reduce((sum, t) => sum + parseInt(t), 0);
    const raw = `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''}`;
    return { count, sides, modifier, raw };
  }

  return null;
}

// ── Rolling ───────────────────────────────────────────────────────────────────

export interface RollResult {
  rolls: number[];
  modifier: number;
  total: number;
}

// Cryptographically random integer in [1, sides] using Web Crypto API.
const _buf = new Uint32Array(1);
export function cryptoD(sides: number): number {
  crypto.getRandomValues(_buf);
  const limit = 2 ** 32 - ((2 ** 32) % sides);
  let val = _buf[0];
  while (val >= limit) {
    crypto.getRandomValues(_buf);
    val = _buf[0];
  }
  return (val % sides) + 1;
}

export function rollDice(parsed: ParsedDice): RollResult {
  const rolls = Array.from({ length: parsed.count }, () => cryptoD(parsed.sides));
  const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier;
  return { rolls, modifier: parsed.modifier, total };
}

// ── Critical damage ───────────────────────────────────────────────────────────
// PF2E crit rules (Remaster):
//   1. If the weapon has the Fatal trait (fatal-dX): replace ALL damage dice with dX,
//      double the result, then add one extra dX.
//   2. Otherwise roll normal dice and double (dice + modifier).
//   3. If Deadly (deadly-dX): add 1×dX (tier 1), 2×dX (tier 2+), or 3×dX (tier 3+).

export interface CritResult {
  baseDice: number[];
  baseModifier: number;
  doubledTotal: number;
  extraDice: number[];
  extraLabel: string;
  grandTotal: number;
}

export function rollCrit(parsed: ParsedDice, traits: string[]): CritResult {
  const fatalTrait = traits.find(t => /^fatal-\d*d\d+$/i.test(t));
  const deadlyTrait = traits.find(t => /^deadly-\d*d\d+$/i.test(t));

  function parseTraitDice(trait: string, prefix: string): { count: number; sides: number } | null {
    const m = trait.replace(new RegExp(`^${prefix}-`, 'i'), '').match(/^(\d+)?d(\d+)$/i);
    if (!m) return null;
    return { count: m[1] ? parseInt(m[1]) : 1, sides: parseInt(m[2]) };
  }

  const fatalDice = fatalTrait ? parseTraitDice(fatalTrait, 'fatal') : null;
  const deadlyDice = deadlyTrait ? parseTraitDice(deadlyTrait, 'deadly') : null;

  const dieSides = fatalDice?.sides ?? parsed.sides;
  const baseDice = Array.from({ length: parsed.count }, () => cryptoD(dieSides));
  const baseSum = baseDice.reduce((a, b) => a + b, 0);
  const doubledTotal = (baseSum + parsed.modifier) * 2;

  let extraDice: number[] = [];
  let extraLabel = '';
  let extraTotal = 0;

  if (fatalDice) {
    const extra = cryptoD(fatalDice.sides);
    extraDice = [extra];
    extraLabel = `Fatal d${fatalDice.sides} extra`;
    extraTotal = extra;
  } else if (deadlyDice) {
    const numExtra = deadlyDice.count;
    extraDice = Array.from({ length: numExtra }, () => cryptoD(deadlyDice.sides));
    extraLabel = `Deadly d${deadlyDice.sides}`;
    extraTotal = extraDice.reduce((a, b) => a + b, 0);
  }

  return {
    baseDice,
    baseModifier: parsed.modifier,
    doubledTotal,
    extraDice,
    extraLabel,
    grandTotal: doubledTotal + extraTotal,
  };
}
