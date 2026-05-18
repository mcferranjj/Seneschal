/**
 * PF2e Remaster condition stat penalties.
 *
 * computePenalties()      – broad stat penalties (AC, saves, perception, a baseline attack)
 * computeAttackPenalty()  – trait-aware attack roll penalty for a specific attack
 * computeDamagePenalty()  – trait-aware damage roll penalty for a specific attack
 *
 * Stacking rules (PF2e core):
 *  - Status penalties of the same sign do NOT stack — only the worst applies.
 *  - Circumstance penalties of the same sign do NOT stack — only the worst applies.
 *  - A status penalty and a circumstance penalty to the same stat DO stack.
 *  - Untyped penalties always stack (none used for conditions currently).
 */

import type { Condition } from '../types/encounter';

export interface StatPenalties {
  ac: number;
  fort: number;
  ref: number;
  will: number;
  perception: number;
  /** Baseline attack penalty (all attacks, regardless of trait) */
  attack: number;
  /** Speed penalty in feet (negative = slower). Encumbered gives –10 ft status. */
  speed: number;
  offGuard: boolean;
}

// ── Internal penalty accumulator ──────────────────────────────────────────────
// Tracks the worst status penalty and worst circumstance penalty separately per
// stat. At the end we sum them — same-type penalties don't stack (take worst).

interface PenBuckets {
  status: number;       // most-negative status penalty seen (≤0)
  circumstance: number; // most-negative circumstance penalty seen (≤0)
}

function emptyBuckets(): PenBuckets { return { status: 0, circumstance: 0 }; }

function applyStatus(b: PenBuckets, v: number) {
  b.status = Math.min(b.status, v); // keep the more-negative value
}
function applyCircumstance(b: PenBuckets, v: number) {
  b.circumstance = Math.min(b.circumstance, v);
}
function total(b: PenBuckets): number { return b.status + b.circumstance; }

// ─────────────────────────────────────────────────────────────────────────────
// Broad penalties (AC, saves, perception, generic attack modifier)
// ─────────────────────────────────────────────────────────────────────────────
export function computePenalties(conditions: Condition[]): StatPenalties {
  // Per-stat accumulator buckets
  const ac         = emptyBuckets();
  const fort       = emptyBuckets();
  const ref        = emptyBuckets();
  const will       = emptyBuckets();
  const perception = emptyBuckets();
  // Baseline attack bucket: conditions that penalise ALL attacks (e.g. frightened,
  // sickened). Trait-specific penalties (clumsy, enfeebled, prone) are handled in
  // computeAttackPenalty; they are NOT included here to avoid double-counting when
  // the caller uses both functions together.
  const attack     = emptyBuckets();
  const speed      = emptyBuckets();

  let offGuard = false;

  for (const cond of conditions) {
    const name = cond.name.toLowerCase();
    const v = cond.value ?? 0;

    switch (name) {
      // ── Blinded ────────────────────────────────────────────────────────────
      // –4 status penalty to Perception (when vision is only precise sense)
      case 'blinded':
        applyStatus(perception, -4);
        break;

      // ── Clumsy ─────────────────────────────────────────────────────────────
      // Status –v to all Dex-based: AC and Reflex.
      // Ranged attacks and skill checks handled in computeAttackPenalty.
      case 'clumsy':
        applyStatus(ac, -v);
        applyStatus(ref, -v);
        break;

      // ── Confused ───────────────────────────────────────────────────────────
      // Grants Off-Guard (–2 circumstance AC).
      case 'confused':
        applyCircumstance(ac, -2);
        offGuard = true;
        break;

      // ── Dazzled ────────────────────────────────────────────────────────────
      // No save/AC effect; attack penalty handled in computeAttackPenalty.
      case 'dazzled':
        break;

      // ── Encumbered ─────────────────────────────────────────────────────────
      // Implies Clumsy 1: –1 status to AC and Reflex.
      // Also –10 ft status penalty to all Speeds.
      case 'encumbered':
        applyStatus(ac,  -1);
        applyStatus(ref, -1);
        applyStatus(speed, -10);
        break;

      // ── Deafened ───────────────────────────────────────────────────────────
      // –2 status to Perception for initiative and sound-involved checks.
      case 'deafened':
        applyStatus(perception, -2);
        break;

      // ── Drained ────────────────────────────────────────────────────────────
      // Status –v to Constitution-based: Fortitude saves.
      case 'drained':
        applyStatus(fort, -v);
        break;

      // ── Enfeebled ──────────────────────────────────────────────────────────
      // Status –v to Strength-based: melee attacks and damage.
      // Handled in computeAttackPenalty / computeDamagePenalty; no broad effect.
      case 'enfeebled':
        break;

      // ── Fascinated ─────────────────────────────────────────────────────────
      // –2 status to Perception and skill checks.
      case 'fascinated':
        applyStatus(perception, -2);
        break;

      // ── Fatigued ───────────────────────────────────────────────────────────
      // –1 status to AC and all saving throws.
      case 'fatigued':
        applyStatus(ac,   -1);
        applyStatus(fort, -1);
        applyStatus(ref,  -1);
        applyStatus(will, -1);
        break;

      // ── Frightened ─────────────────────────────────────────────────────────
      // Status –v to ALL checks and DCs (saves, AC, Perception, attacks, skills…).
      case 'frightened':
        applyStatus(ac,         -v);
        applyStatus(fort,       -v);
        applyStatus(ref,        -v);
        applyStatus(will,       -v);
        applyStatus(perception, -v);
        applyStatus(attack,     -v);
        break;

      // ── Grabbed ────────────────────────────────────────────────────────────
      // Grants Off-Guard (–2 circumstance AC).
      // Manipulate-action flat check handled in computeAttackPenalty.
      case 'grabbed':
        applyCircumstance(ac, -2);
        offGuard = true;
        break;

      // ── Off-Guard / Flat-Footed ────────────────────────────────────────────
      // –2 circumstance to AC.
      case 'off-guard':
      case 'flat-footed':
        applyCircumstance(ac, -2);
        offGuard = true;
        break;

      // ── Paralyzed ──────────────────────────────────────────────────────────
      // Grants Off-Guard (–2 circumstance AC).
      case 'paralyzed':
        applyCircumstance(ac, -2);
        offGuard = true;
        break;

      // ── Prone ──────────────────────────────────────────────────────────────
      // Grants Off-Guard (–2 circumstance AC).
      // –2 circumstance to attack rolls handled in computeAttackPenalty.
      case 'prone':
        applyCircumstance(ac, -2);
        offGuard = true;
        break;

      // ── Restrained ─────────────────────────────────────────────────────────
      // Grants Off-Guard (–2 circumstance AC). Overrides Grabbed.
      case 'restrained':
        applyCircumstance(ac, -2);
        offGuard = true;
        break;

      // ── Sickened ───────────────────────────────────────────────────────────
      // Status –v to ALL checks and DCs.
      case 'sickened':
        applyStatus(ac,         -v);
        applyStatus(fort,       -v);
        applyStatus(ref,        -v);
        applyStatus(will,       -v);
        applyStatus(perception, -v);
        applyStatus(attack,     -v);
        break;

      // ── Stupefied ──────────────────────────────────────────────────────────
      // Status –v to Int/Wis/Cha-based: Will saves. Perception is Wis-based.
      case 'stupefied':
        applyStatus(will,       -v);
        applyStatus(perception, -v);
        break;

      // ── Unconscious ────────────────────────────────────────────────────────
      // –4 status to AC, Perception, and Reflex saves.
      // Also grants Blinded and Off-Guard; applied directly to avoid recursion.
      case 'unconscious':
        applyStatus(ac,         -4);
        applyStatus(ref,        -4);
        applyStatus(perception, -4);
        applyCircumstance(ac, -2); // from implied Off-Guard
        offGuard = true;
        break;
    }
  }

  return {
    ac:         total(ac),
    fort:       total(fort),
    ref:        total(ref),
    will:       total(will),
    perception: total(perception),
    attack:     total(attack),
    speed:      total(speed),
    offGuard,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-attack roll penalty (trait-aware)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the total attack roll penalty for one specific attack, taking into
 * account all active conditions including trait-specific rules for Clumsy and
 * Enfeebled.
 *
 * Same-type penalties (status vs status, circumstance vs circumstance) do not
 * stack — only the worst applies. A status and a circumstance penalty DO stack.
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
  const hasBrutal  = t.has('brutal');
  const hasFinesse = t.has('finesse');

  // Determine whether this attack uses Dex or Str to hit:
  // - Melee, no finesse: uses Str
  // - Ranged, no brutal: uses Dex
  // - Ranged, brutal:    uses Str
  // - Melee, finesse, Dex > Str: uses Dex → Clumsy applies, Enfeebled doesn't
  // - Melee, finesse, Str > Dex: uses Str → Enfeebled applies, Clumsy doesn't
  // - Melee, finesse, Str = Dex: creature chooses freely each attack. The best
  //   play is to pick whichever ability has the lesser penalty, so the net attack
  //   penalty is min(clumsyPenalty, enfeebledPenalty). We handle this via the
  //   `isFinessesTie` flag below rather than the usesDex/usesStr booleans.
  let usesDex: boolean;
  let usesStr: boolean;
  let isFinessesTie = false;
  if (isMelee) {
    if (hasFinesse && dexMod != null && strMod != null) {
      usesDex = dexMod > strMod;
      usesStr = strMod > dexMod;
      isFinessesTie = dexMod === strMod;
    } else {
      usesDex = false;
      usesStr = true;
    }
  } else {
    usesDex = !hasBrutal;
    usesStr = hasBrutal;
  }

  const statusBucket       = emptyBuckets();
  const circumstanceBucket = emptyBuckets();

  // Collect Clumsy and Enfeebled values separately for the finesse-tie case.
  let clumsyPen    = 0; // worst status from Clumsy / Encumbered (non-positive)
  let enfeebledPen = 0; // worst status from Enfeebled (non-positive)

  for (const cond of conditions) {
    const name = cond.name.toLowerCase();
    const v = cond.value ?? 0;

    switch (name) {
      // ── Clumsy ─────────────────────────────────────────────────────────────
      // Status –v to all Dex-based rolls: ranged attacks (non-brutal) and melee
      // finesse attacks where Dex > Str.
      case 'clumsy':
        if (isFinessesTie) {
          clumsyPen = Math.min(clumsyPen, -v);
        } else if (usesDex) {
          applyStatus(statusBucket, -v);
        }
        break;

      // ── Encumbered ─────────────────────────────────────────────────────────
      // Implies Clumsy 1: –1 status to Dex-based attack rolls.
      case 'encumbered':
        if (isFinessesTie) {
          clumsyPen = Math.min(clumsyPen, -1);
        } else if (usesDex) {
          applyStatus(statusBucket, -1);
        }
        break;

      // ── Dazzled ────────────────────────────────────────────────────────────
      // Technically a DC 5 flat check vs. all targets; approximated as –2 status
      // to attack for tracker display since flat checks aren't represented.
      case 'dazzled':
        applyStatus(statusBucket, -2);
        break;

      // ── Enfeebled ──────────────────────────────────────────────────────────
      // Status –v to Strength-based attack rolls (melee, or ranged with brutal).
      case 'enfeebled':
        if (isFinessesTie) {
          enfeebledPen = Math.min(enfeebledPen, -v);
        } else if (usesStr) {
          applyStatus(statusBucket, -v);
        }
        break;

      // ── Frightened ─────────────────────────────────────────────────────────
      // Status –v to all checks and DCs, including attack rolls.
      case 'frightened':
        applyStatus(statusBucket, -v);
        break;

      // ── Prone ──────────────────────────────────────────────────────────────
      // –2 circumstance penalty to attack rolls.
      case 'prone':
        applyCircumstance(circumstanceBucket, -2);
        break;

      // ── Sickened ───────────────────────────────────────────────────────────
      // Status –v to all checks and DCs, including attack rolls.
      case 'sickened':
        applyStatus(statusBucket, -v);
        break;
    }
  }

  // Finesse tie: creature picks the ability with the lesser penalty.
  // The net penalty is whichever option hurts less — i.e. the less-negative of the two.
  // e.g. Clumsy 1 (–1) vs Enfeebled 2 (–2) → creature uses Dex → penalty is –1.
  //      Enfeebled 2 (–2), no Clumsy (0)   → creature uses Dex → penalty is 0.
  if (isFinessesTie && (clumsyPen !== 0 || enfeebledPen !== 0)) {
    applyStatus(statusBucket, Math.max(clumsyPen, enfeebledPen));
  }

  return statusBucket.status + circumstanceBucket.circumstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-attack damage penalty (trait-aware)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the flat damage penalty from conditions for one specific attack.
 * Enfeebled is the only standard condition that imposes a damage penalty.
 *
 * Enfeebled applies to damage on:
 * - All melee attacks (Str-based damage)
 * - Ranged attacks with the thrown trait (still uses Str for damage)
 *
 * Enfeebled is a status penalty; only one instance can be active at a time
 * (the tracker merges duplicates), so no multi-source stacking concern.
 */
export function computeDamagePenalty(
  conditions: Condition[],
  attackType: 'melee' | 'ranged',
  traits: string[],
): number {
  const t = new Set(traits.map(s => s.toLowerCase()));
  const enfeebledApplies = attackType === 'melee' || t.has('thrown');

  let worstStatus = 0;
  for (const cond of conditions) {
    if (cond.name.toLowerCase() === 'enfeebled' && enfeebledApplies) {
      worstStatus = Math.min(worstStatus, -(cond.value ?? 0));
    }
  }
  return worstStatus;
}
