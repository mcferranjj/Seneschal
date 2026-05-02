/**
 * PF2e Remaster condition stat penalties.
 * Given a list of active conditions, returns the numeric penalties applied to
 * AC, Fort, Ref, Will, Perception, and attack rolls.
 * Any stat that is penalised should be coloured red in the UI.
 */

import type { Condition } from './encounter';

export interface StatPenalties {
  ac: number;
  fort: number;
  ref: number;
  will: number;
  perception: number;
  attack: number;
  /** true if the creature is flat-footed / Off-Guard (separate –2 AC penalty, already folded into ac) */
  offGuard: boolean;
}

export function computePenalties(conditions: Condition[]): StatPenalties {
  const p: StatPenalties = { ac: 0, fort: 0, ref: 0, will: 0, perception: 0, attack: 0, offGuard: false };

  for (const cond of conditions) {
    const name = cond.name.toLowerCase();
    const v = cond.value ?? 0;

    switch (name) {
      // ── Blinded ──────────────────────────────────────────────────────────────
      // –2 to attack rolls; –4 to Perception checks that require sight (we apply –4 to perception)
      case 'blinded':
        p.attack -= 2;
        p.perception -= 4;
        break;

      // ── Clumsy ───────────────────────────────────────────────────────────────
      // –value to Dex-based checks and DCs, including AC and Reflex saves
      case 'clumsy':
        p.ac -= v;
        p.ref -= v;
        break;

      // ── Dazzled ──────────────────────────────────────────────────────────────
      // All targets are concealed; –2 to attack rolls (since you treat all targets as concealed)
      case 'dazzled':
        p.attack -= 2;
        break;

      // ── Deafened ─────────────────────────────────────────────────────────────
      // –2 to Perception
      case 'deafened':
        p.perception -= 2;
        break;

      // ── Drained ──────────────────────────────────────────────────────────────
      // –value to Con-based checks and DCs (Fort saves)
      case 'drained':
        p.fort -= v;
        break;

      // ── Enfeebled ────────────────────────────────────────────────────────────
      // –value to Str-based checks and DCs (melee attack rolls, Athletics)
      case 'enfeebled':
        p.attack -= v;
        break;

      // ── Fascinated ───────────────────────────────────────────────────────────
      // –2 to Perception and skill checks
      case 'fascinated':
        p.perception -= 2;
        break;

      // ── Fatigued ─────────────────────────────────────────────────────────────
      // –1 to AC and all saving throws
      case 'fatigued':
        p.ac -= 1;
        p.fort -= 1;
        p.ref -= 1;
        p.will -= 1;
        break;

      // ── Frightened ───────────────────────────────────────────────────────────
      // –value to all checks and DCs
      case 'frightened':
        p.ac -= v;
        p.fort -= v;
        p.ref -= v;
        p.will -= v;
        p.perception -= v;
        p.attack -= v;
        break;

      // ── Grabbed ──────────────────────────────────────────────────────────────
      // Off-Guard (–2 AC), –2 to attack rolls
      case 'grabbed':
        p.ac -= 2;
        p.attack -= 2;
        p.offGuard = true;
        break;

      // ── Off-Guard (Flat-Footed) ───────────────────────────────────────────
      case 'off-guard':
      case 'flat-footed':
        p.ac -= 2;
        p.offGuard = true;
        break;

      // ── Paralyzed ────────────────────────────────────────────────────────────
      // Off-Guard (–2 AC)
      case 'paralyzed':
        p.ac -= 2;
        p.offGuard = true;
        break;

      // ── Prone ────────────────────────────────────────────────────────────────
      // –2 to attack rolls
      case 'prone':
        p.attack -= 2;
        break;

      // ── Restrained ───────────────────────────────────────────────────────────
      // Off-Guard (–2 AC), –2 to attack rolls (Grabbed + Immobilized)
      case 'restrained':
        p.ac -= 2;
        p.attack -= 2;
        p.offGuard = true;
        break;

      // ── Sickened ─────────────────────────────────────────────────────────────
      // –value to all checks and DCs
      case 'sickened':
        p.ac -= v;
        p.fort -= v;
        p.ref -= v;
        p.will -= v;
        p.perception -= v;
        p.attack -= v;
        break;

      // ── Stupefied ────────────────────────────────────────────────────────────
      // –value to Int/Wis/Cha checks and DCs, including Will saves and Perception
      case 'stupefied':
        p.will -= v;
        p.perception -= v;
        break;

      // ── Unconscious ──────────────────────────────────────────────────────────
      // –4 to AC, Perception, and Reflex; Off-Guard
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
