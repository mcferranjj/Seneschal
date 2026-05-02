/**
 * PF2e Remaster condition stat penalties.
 *
 * computePenalties()      – broad stat penalties (AC, saves, perception, a baseline attack)
 * computeAttackPenalty()  – trait-aware attack roll penalty for a specific attack
 * computeDamagePenalty()  – trait-aware damage roll penalty for a specific attack
 */

import type { Condition } from './encounter';

export interface StatPenalties {
  ac: number;
  fort: number;
  ref: number;
  will: number;
  perception: number;
  /** Baseline attack penalty (conditions that affect ALL attacks regardless of trait) */
  attack: number;
  offGuard: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Broad penalties (AC, saves, perception, generic attack modifier)
// ─────────────────────────────────────────────────────────────────────────────
export function computePenalties(conditions: Condition[]): StatPenalties {
  const p: StatPenalties = { ac: 0, fort: 0, ref: 0, will: 0, perception: 0, attack: 0, offGuard: false };

  for (const cond of conditions) {
    const name = cond.name.toLowerCase();
    const v = cond.value ?? 0;

    switch (name) {
      case 'blinded':
        p.attack -= 2;
        p.perception -= 4;
        break;

      // Clumsy: –v to Dex-based (AC, Reflex). Attack impact handled per-attack.
      case 'clumsy':
        p.ac -= v;
        p.ref -= v;
        break;

      case 'dazzled':
        p.attack -= 2;
        break;

      case 'deafened':
        p.perception -= 2;
        break;

      case 'drained':
        p.fort -= v;
        break;

      // Enfeebled: –v to Str-based. Attack/damage impact handled per-attack.
      case 'enfeebled':
        break;

      case 'fascinated':
        p.perception -= 2;
        break;

      case 'fatigued':
        p.ac -= 1;
        p.fort -= 1;
        p.ref -= 1;
        p.will -= 1;
        break;

      case 'frightened':
        p.ac -= v;
        p.fort -= v;
        p.ref -= v;
        p.will -= v;
        p.perception -= v;
        p.attack -= v;
        break;

      case 'grabbed':
        p.ac -= 2;
        p.attack -= 2;
        p.offGuard = true;
        break;

      case 'off-guard':
      case 'flat-footed':
        p.ac -= 2;
        p.offGuard = true;
        break;

      case 'paralyzed':
        p.ac -= 2;
        p.offGuard = true;
        break;

      case 'prone':
        p.attack -= 2;
        break;

      case 'restrained':
        p.ac -= 2;
        p.attack -= 2;
        p.offGuard = true;
        break;

      case 'sickened':
        p.ac -= v;
        p.fort -= v;
        p.ref -= v;
        p.will -= v;
        p.perception -= v;
        p.attack -= v;
        break;

      case 'stupefied':
        p.will -= v;
        p.perception -= v;
        break;

      case 'unconscious':
        p.ac -= 4;
        p.ref -= 4;
        p.perception -= 4;
        p.offGuard = true;
        break;
    }
  }

  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-attack roll penalty (trait-aware)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the total attack roll penalty for one specific attack, taking into
 * account all active conditions including the trait-specific rules for Clumsy
 * and Enfeebled.
 *
 * @param conditions  Active conditions on the creature
 * @param attackType  'melee' | 'ranged'
 * @param traits      Trait list for this specific attack (lowercase)
 * @param strMod      Creature's Strength modifier (optional; needed for finesse logic)
 * @param dexMod      Creature's Dexterity modifier (optional; needed for finesse logic)
 */
export function computeAttackPenalty(
  conditions: Condition[],
  attackType: 'melee' | 'ranged',
  traits: string[],
  strMod?: number,
  dexMod?: number,
): number {
  const t = new Set(traits.map(s => s.toLowerCase()));
  const isMelee = attackType === 'melee';
  const hasBrutal = t.has('brutal');
  const hasFinesse = t.has('finesse');
  const hasThrown = t.has('thrown');
  void hasThrown; // thrown only relevant for damage

  // Determine whether this attack uses Dex or Str to hit:
  // - Melee + finesse: uses whichever is higher (Dex or Str)
  // - Melee (no finesse): uses Str
  // - Ranged + brutal: uses Str
  // - Ranged (no brutal): uses Dex
  let usesDex: boolean;
  let usesStr: boolean;
  if (isMelee) {
    if (hasFinesse && dexMod != null && strMod != null) {
      usesDex = dexMod > strMod;   // strictly greater — tie favours the player (no penalty)
      usesStr = strMod > dexMod;   // strictly greater — tie favours the player (no penalty)
    } else {
      usesDex = false;
      usesStr = true;
    }
  } else {
    // ranged
    usesDex = !hasBrutal;
    usesStr = hasBrutal;
  }

  let penalty = 0;

  for (const cond of conditions) {
    const name = cond.name.toLowerCase();
    const v = cond.value ?? 0;

    switch (name) {
      case 'blinded':
        penalty -= 2;
        break;

      // Clumsy: applies when the attack uses Dex
      // - All ranged attacks EXCEPT brutal
      // - Melee finesse attacks where Dex > Str
      case 'clumsy':
        if (usesDex) penalty -= v;
        break;

      case 'dazzled':
        penalty -= 2;
        break;

      // Enfeebled: applies when the attack uses Str
      // - Melee attacks without finesse
      // - Melee finesse attacks where Str >= Dex
      // - Ranged brutal attacks
      case 'enfeebled':
        if (usesStr) penalty -= v;
        break;

      case 'frightened':
        penalty -= v;
        break;

      case 'grabbed':
        penalty -= 2;
        break;

      case 'prone':
        penalty -= 2;
        break;

      case 'restrained':
        penalty -= 2;
        break;

      case 'sickened':
        penalty -= v;
        break;
    }
  }

  return penalty;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-attack damage penalty (trait-aware)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the flat damage penalty from conditions for one specific attack.
 * Currently only Enfeebled imposes a damage penalty.
 *
 * Enfeebled applies to damage on:
 * - All melee attacks
 * - Ranged attacks with the thrown trait
 */
export function computeDamagePenalty(
  conditions: Condition[],
  attackType: 'melee' | 'ranged',
  traits: string[],
): number {
  const t = new Set(traits.map(s => s.toLowerCase()));
  const isMelee = attackType === 'melee';
  const hasThrown = t.has('thrown');
  const enfeebledApplies = isMelee || hasThrown;

  let penalty = 0;

  for (const cond of conditions) {
    const name = cond.name.toLowerCase();
    const v = cond.value ?? 0;
    if (name === 'enfeebled' && enfeebledApplies) {
      penalty -= v;
    }
  }

  return penalty;
}
