/**
 * useRollState
 *
 * Manages the two mutually-exclusive floating roller states
 * (diceRoll, multiDamageRoll) and provides named callbacks for triggering
 * each roll type. All damage-only rolls (direct clicks on damage text,
 * ability "Roll damage" buttons, and the post-attack damage panel) go
 * through multiDamageRoll → MultiDamageRoller.
 *
 * Also manages manualRoll state for the right-click "Input result" popup.
 */

import { useState, useCallback } from 'react';
import type { DamageGroupInput } from '../features/dice/DiceRoller';

export interface DiceRollState {
  expr: string;
  label?: string;
  creatureName?: string;
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
  creatureName?: string;
  traits?: string[];
  x: number;
  y: number;
}

export interface ManualRollState {
  expr: string;
  label?: string;
  creatureName?: string;
  /** Present when this is a strike attack — damage auto-rolls after input */
  damageGroups?: DamageGroupInput[];
  damageTraits?: string[];
  x: number;
  y: number;
}

export interface UseRollStateReturn {
  diceRoll: DiceRollState | null;
  multiDamageRoll: MultiDamageRollState | null;
  manualRoll: ManualRollState | null;
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

  // ── Manual input (right-click) variants ──────────────────────────────────
  /** Open the manual input popup for a plain modifier roll (1d20+mod). */
  manualRoll1d20: (mod: number | undefined, label: string, e: React.MouseEvent) => void;
  /** Open the manual input popup for an arbitrary expression roll. */
  manualRollExpr: (expr: string, label: string | undefined, e: React.MouseEvent) => void;
  /**
   * Open the manual input popup for a strike attack roll.
   * Damage is auto-rolled after the user submits the attack die face value.
   */
  manualRollAttack: (
    mod: number,
    label: string,
    damageGroups: DamageGroupInput[],
    damageTraits: string[],
    e: React.MouseEvent,
  ) => void;
  /**
   * Open the manual input popup for a standalone damage roll.
   * (No auto-damage; user inputs the combined dice total for the group.)
   */
  manualRollDamage: (groups: DamageGroupInput[], label: string, e: React.MouseEvent) => void;

  /** Set the creature name context for all subsequent rolls from this hook instance. */
  setCreatureName: (name: string | undefined) => void;
}

export function useRollState(): UseRollStateReturn {
  const [diceRoll, setDiceRoll] = useState<DiceRollState | null>(null);
  const [multiDamageRoll, setMultiDamageRoll] = useState<MultiDamageRollState | null>(null);
  const [manualRoll, setManualRoll] = useState<ManualRollState | null>(null);
  const [creatureName, setCreatureName] = useState<string | undefined>(undefined);

  const clearRolls = useCallback(() => {
    setDiceRoll(null);
    setMultiDamageRoll(null);
    setManualRoll(null);
  }, []);

  const rollExpr = useCallback((expr: string, label: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiceRoll({ expr, label, creatureName, x: e.clientX, y: e.clientY - 160 });
    setMultiDamageRoll(null);
    setManualRoll(null);
  }, [creatureName]);

  const roll = useCallback((mod: number | undefined, label: string, e: React.MouseEvent) => {
    if (mod == null) return;
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setDiceRoll({ expr, label, creatureName, x: e.clientX, y: e.clientY - 160 });
    setMultiDamageRoll(null);
    setManualRoll(null);
  }, [creatureName]);

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
    setDiceRoll({ expr, label, creatureName, damageGroups, damageLabel, damageTraits, x: e.clientX, y: e.clientY - 160 });
    setMultiDamageRoll(null);
    setManualRoll(null);
  }, [creatureName]);

  const rollDamage = useCallback((groups: DamageGroupInput[], label: string, traits: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    setMultiDamageRoll({ groups, abilityName: label, creatureName, traits, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
    setManualRoll(null);
  }, [creatureName]);

  // ── Manual input variants ─────────────────────────────────────────────────

  const manualRoll1d20 = useCallback((mod: number | undefined, label: string, e: React.MouseEvent) => {
    if (mod == null) return;
    e.preventDefault();
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setManualRoll({ expr, label, creatureName, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
    setMultiDamageRoll(null);
  }, [creatureName]);

  const manualRollExpr = useCallback((expr: string, label: string | undefined, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setManualRoll({ expr, label, creatureName, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
    setMultiDamageRoll(null);
  }, [creatureName]);

  const manualRollAttack = useCallback((
    mod: number,
    label: string,
    damageGroups: DamageGroupInput[],
    damageTraits: string[],
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const expr = `1d20${mod >= 0 ? `+${mod}` : mod}`;
    setManualRoll({ expr, label, creatureName, damageGroups, damageTraits, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
    setMultiDamageRoll(null);
  }, [creatureName]);

  const manualRollDamage = useCallback((groups: DamageGroupInput[], label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // For standalone damage, we combine all groups into a single summed expression.
    // Use the first group's expression as the primary prompt (most common case).
    const expr = groups[0]?.expr ?? '1d6';
    setManualRoll({ expr, label, creatureName, x: e.clientX, y: e.clientY - 160 });
    setDiceRoll(null);
    setMultiDamageRoll(null);
  }, [creatureName]);

  return {
    diceRoll,
    multiDamageRoll,
    manualRoll,
    clearRolls,
    rollExpr,
    roll,
    rollAttack,
    rollDamage,
    manualRoll1d20,
    manualRollExpr,
    manualRollAttack,
    manualRollDamage,
    setCreatureName,
  };
}
