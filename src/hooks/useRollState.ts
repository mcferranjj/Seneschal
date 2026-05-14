/**
 * useRollState
 *
 * Manages the two mutually-exclusive floating roller states
 * (diceRoll, multiDamageRoll) and provides named callbacks for triggering
 * each roll type. All damage-only rolls (direct clicks on damage text,
 * ability "Roll damage" buttons, and the post-attack damage panel) go
 * through multiDamageRoll → MultiDamageRoller.
 */

import { useState, useCallback } from 'react';
import type { DamageGroupInput } from '../features/dice/DiceRoller';

export interface DiceRollState {
  expr: string;
  label?: string;
  /** Structured damage groups passed to DiceRoller so it can roll all damage types */
  damageGroups?: DamageGroupInput[];
  damageLabel?: string;
  damageTraits?: string[];
  x: number;
  y: number;
}

export interface MultiDamageRollState {
  groups: DamageGroupInput[];
  abilityName: string;
  traits?: string[];
  x: number;
  y: number;
}

export interface UseRollStateReturn {
  diceRoll: DiceRollState | null;
  multiDamageRoll: MultiDamageRollState | null;
  clearRolls: () => void;
  /** Roll an arbitrary dice expression (e.g. "2d6+3") at the click position. */
  rollExpr: (expr: string, label: string | undefined, e: React.MouseEvent) => void;
  roll: (mod: number | undefined, label: string, e: React.MouseEvent) => void;
  rollAttack: (
    mod: number,
    label: string,
    damageGroups: DamageGroupInput[],
    damageLabel: string,
    damageTraits: string[],
    e: React.MouseEvent,
  ) => void;
  /**
   * Roll damage for an attack or ability.
   * Single-expression callers pass one group; multi-type callers pass several.
   * `traits` carries weapon traits (fatal/deadly) for the first group.
   * Omit or pass [] for abilities that have no weapon traits.
   */
  rollDamage: (groups: DamageGroupInput[], label: string, traits: string[], e: React.MouseEvent) => void;
}

export function useRollState(): UseRollStateReturn {
  const [diceRoll, setDiceRoll] = useState<DiceRollState | null>(null);
  const [multiDamageRoll, setMultiDamageRoll] = useState<MultiDamageRollState | null>(null);

  const clearRolls = useCallback(() => {
    setDiceRoll(null);
    setMultiDamageRoll(null);
  }, []);

  const rollExpr = useCallback((expr: string, label: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiceRoll({ expr, label, x: e.clientX, y: e.clientY - 160 });
    setMultiDamageRoll(null);
  }, []);

  const roll = useCallback((mod: number | undefined, label: string, e: React.MouseEvent) => {
    if (mod == null) return;
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setDiceRoll({ expr, label, x: e.clientX, y: e.clientY - 160 });
    setMultiDamageRoll(null);
  }, []);

  const rollAttack = useCallback((
    mod: number,
    label: string,
    damageGroups: DamageGroupInput[],
    damageLabel: string,
    damageTraits: string[],
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setDiceRoll({ expr, label, damageGroups, damageLabel, damageTraits, x: e.clientX, y: e.clientY - 160 });
    setMultiDamageRoll(null);
  }, []);

  const rollDamage = useCallback((groups: DamageGroupInput[], label: string, traits: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    setMultiDamageRoll({ groups, abilityName: label, traits, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
  }, []);

  return {
    diceRoll,
    multiDamageRoll,
    clearRolls,
    rollExpr,
    roll,
    rollAttack,
    rollDamage,
  };
}
