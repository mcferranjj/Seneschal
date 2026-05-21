/**
 * CustomAbilityBlock
 *
 * Renders a single custom-creature ability using the same layout as ItemBlock.
 * Custom abilities live in `creature.customData.abilities[]` and use a flat
 * data shape rather than the full PF2EItem structure, so this adapter bridges
 * the two — constructing a minimal PF2EItem-compatible object and forwarding
 * to ItemBlock.
 */
import { ItemBlock } from './ItemBlock';
import type { DamageGroup } from '../../utils/foundryMacros';
import type { PF2EItem } from '../../types/pf2e';

export interface CustomAbilityBlockProps {
  ab: {
    name: string;
    description?: string;
    actionType?: string;
    trigger?: string;
    requirements?: string;
    frequency?: string;
    genericAbilityName?: string;
    traits?: string[];
  };
  adjustedDesc: string;
  dmgMod: number;
  ewStyle?: React.CSSProperties;
  onRollDamage: (groups: DamageGroup[], name: string, traits: string[], e: React.MouseEvent) => void;
  onManualRollDamage?: (groups: DamageGroup[], name: string, e: React.MouseEvent) => void;
  /** When false, skips keyword linking so no .pf2kw tooltip spans are injected. Defaults to true. */
  interactive?: boolean;
}

export function CustomAbilityBlock({
  ab,
  adjustedDesc,
  dmgMod,
  ewStyle,
  onRollDamage,
  onManualRollDamage,
  interactive = true,
}: CustomAbilityBlockProps) {
  // Build a minimal PF2EItem so ItemBlock can render without modification.
  // Map custom actionType strings to the PF2EItemSystem's strict union.
  // 'single'/'two'/'three' are custom-creature conventions; the PF2E schema
  // uses 'action' for all action-cost abilities (cost is conveyed via actions.value).
  const actionTypeMap: Record<string, 'action' | 'reaction' | 'free' | 'passive'> = {
    single: 'action', two: 'action', three: 'action',
    reaction: 'reaction', free: 'free', passive: 'passive',
  };
  const actionCostMap: Record<string, number> = { single: 1, two: 2, three: 3 };

  const syntheticItem: PF2EItem = {
    _id: ab.name,
    name: ab.name,
    type: 'action',
    system: {
      description: { value: adjustedDesc },
      actionType: { value: ab.actionType ? (actionTypeMap[ab.actionType] ?? 'action') : 'passive' },
      actions: { value: ab.actionType ? (actionCostMap[ab.actionType] ?? null) : null },
      trigger: { value: ab.trigger ?? '' },
      traits: { value: ab.traits ?? [] },
    },
  };

  return (
    <ItemBlock
      item={syntheticItem}
      // dmgMod is pre-computed by the caller; pass ewMod=0 so ItemBlock doesn't
      // double-apply elite/weak scaling (the caller already baked it into adjustedDesc).
      ewMod={0}
      ewStyle={dmgMod !== 0 ? ewStyle : undefined}
      onRollAll={onRollDamage}
      onManualRollDamage={onManualRollDamage}
      interactive={interactive}
      overrides={{
        glossaryKey: ab.genericAbilityName ?? ab.name,
        requirements: ab.requirements,
        frequency: ab.frequency,
      }}
    />
  );
}
