/**
 * useRollState
 *
 * Manages the three mutually-exclusive floating roller states
 * (diceRoll, damageRoll, multiDamageRoll) and provides named callbacks
 * for triggering each roll type. Previously duplicated between
 * StatblockContent and EncounterManager creature cards.
 */

import { useState, useCallback } from 'react';
import type { DamageGroupInput } from '../features/dice/DiceRoller';

export interface DiceRollState {
  expr: string;
  label?: string;
  damageExpr?: string;
  damageLabel?: string;
  damageTraits?: string[];
  x: number;
  y: number;
}

export interface DamageRollState {
  expr: string;
  label?: string;
  traits?: string[];
  x: number;
  y: number;
}

export interface MultiDamageRollState {
  groups: DamageGroupInput[];
  abilityName: string;
  x: number;
  y: number;
}

export interface UseRollStateReturn {
  diceRoll: DiceRollState | null;
  damageRoll: DamageRollState | null;
  multiDamageRoll: MultiDamageRollState | null;
  clearRolls: () => void;
  /** Roll an arbitrary dice expression (e.g. "2d6+3") at the click position. */
  rollExpr: (expr: string, label: string | undefined, e: React.MouseEvent) => void;
  roll: (mod: number | undefined, label: string, e: React.MouseEvent) => void;
  rollAttack: (
    mod: number,
    label: string,
    damageExpr: string,
    damageLabel: string,
    damageTraits: string[],
    e: React.MouseEvent,
  ) => void;
  rollDamage: (expr: string, label: string, traits: string[], e: React.MouseEvent) => void;
  rollAllDamage: (groups: DamageGroupInput[], abilityName: string, e: React.MouseEvent) => void;
}

export function useRollState(): UseRollStateReturn {
  const [diceRoll, setDiceRoll] = useState<DiceRollState | null>(null);
  const [damageRoll, setDamageRoll] = useState<DamageRollState | null>(null);
  const [multiDamageRoll, setMultiDamageRoll] = useState<MultiDamageRollState | null>(null);

  const rollExpr = useCallback((expr: string, label: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiceRoll({ expr, label, x: e.clientX, y: e.clientY - 160 });
    setDamageRoll(null);
    setMultiDamageRoll(null);
  }, []);

  const clearRolls = useCallback(() => {
    setDiceRoll(null);
    setDamageRoll(null);
    setMultiDamageRoll(null);
  }, []);

  const roll = useCallback((mod: number | undefined, label: string, e: React.MouseEvent) => {
    if (mod == null) return;
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setDiceRoll({ expr, label, x: e.clientX, y: e.clientY - 160 });
    setDamageRoll(null);
    setMultiDamageRoll(null);
  }, []);

  const rollAttack = useCallback((
    mod: number,
    label: string,
    damageExpr: string,
    damageLabel: string,
    damageTraits: string[],
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setDiceRoll({ expr, label, damageExpr, damageLabel, damageTraits, x: e.clientX, y: e.clientY - 160 });
    setDamageRoll(null);
    setMultiDamageRoll(null);
  }, []);

  const rollDamage = useCallback((expr: string, label: string, traits: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    setDamageRoll({ expr, label, traits, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
    setMultiDamageRoll(null);
  }, []);

  const rollAllDamage = useCallback((groups: DamageGroupInput[], abilityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMultiDamageRoll({ groups, abilityName, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
    setDamageRoll(null);
  }, []);

  return {
    diceRoll,
    damageRoll,
    multiDamageRoll,
    clearRolls,
    rollExpr,
    roll,
    rollAttack,
    rollDamage,
    rollAllDamage,
  };
}
