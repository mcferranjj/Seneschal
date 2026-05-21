/**
 * StatblockCustomAttacks
 *
 * Renders non-official attacks: either scaled attacks (when level-scaling is
 * active) or custom-creature attacks. Both share the same AttackLine layout.
 * Extracted from StatblockContent to isolate the complex damage-building logic.
 */
import type { ScaledCreatureStats, ScaledHazardStats } from '../../utils/levelScaling';
import type { CreatureRecord } from '../../db/schema';
import type { CustomAttack } from '../../types/encounter';
import type { DamageGroup } from '../../utils/foundryMacros';
import { withSneakAttack } from './statblockHelpers';
import { AttackLine } from './AttackLine';

const SCALED_STYLE = { color: '#2a7a6a', fontWeight: 700 } as const;

interface StatblockCustomAttacksProps {
  creature: CreatureRecord;
  scaledStats: ScaledCreatureStats | null;
  scaledHazardStats: ScaledHazardStats | null;
  ewMod: number;
  ewStyle?: React.CSSProperties;
  sneakAttackExpr: string | null;
  sneakAttackActive: boolean;
  onRollAttack: (mod: number, label: string, groups: DamageGroup[], damageLabel: string, traits: string[], e: React.MouseEvent) => void;
  onRollDamage: (groups: DamageGroup[], label: string, traits: string[], e: React.MouseEvent) => void;
  onManualRollAttack: (mod: number, label: string, groups: DamageGroup[], traits: string[], e: React.MouseEvent) => void;
  onManualRollDamage: (groups: DamageGroup[], label: string, e: React.MouseEvent) => void;
}

export function StatblockCustomAttacks({
  creature,
  scaledStats,
  scaledHazardStats,
  ewMod,
  ewStyle,
  sneakAttackExpr,
  sneakAttackActive,
  onRollAttack,
  onRollDamage,
  onManualRollAttack,
  onManualRollDamage,
}: StatblockCustomAttacksProps) {
  const nonOfficialAttacks: (CustomAttack & { isScaled: boolean })[] =
    scaledStats
      ? scaledStats.attacks.map(atk => ({ ...atk, isScaled: true } as CustomAttack & { isScaled: boolean }))
      : scaledHazardStats
        ? scaledHazardStats.attacks.map(atk => ({ ...atk, isScaled: true } as CustomAttack & { isScaled: boolean }))
        : creature.publication === 'Custom'
          ? (creature.customData?.attacks ?? []).map(atk => ({ ...atk, isScaled: false } as CustomAttack & { isScaled: boolean }))
          : [];

  return (
    <>
      {nonOfficialAttacks.map((atk, i) => {
        const baseStyle = atk.isScaled ? SCALED_STYLE : undefined;
        const atkStyle  = ewMod !== 0 ? ewStyle : baseStyle;
        const effBonus  = atk.bonus + ewMod;
        const isAgile   = atk.traits?.includes('agile') ?? false;
        const rangeDisplay = atk.range != null ? `range ${atk.range} ft.` : undefined;
        const damageLabel  = `${atk.name} damage`;

        // Build structured damage groups from damageTypes if present,
        // otherwise fall back to parsing the legacy flat damage string.
        let damageGroups: DamageGroup[];
        let primaryExprForEwMod: string;

        if (atk.damageTypes && atk.damageTypes.length > 0) {
          const primary = atk.damageTypes[0];
          const primaryExprRaw = primary.expr.replace(/\s/g, '');
          const primaryIsPersistent = primary.type.toLowerCase().startsWith('persistent');
          primaryExprForEwMod = ewMod !== 0
            ? `${primaryExprRaw}${ewMod >= 0 ? `+${ewMod}` : ewMod}`
            : primaryExprRaw;
          damageGroups = [
            { expr: primaryExprForEwMod, label: primary.type || 'damage', ...(primaryIsPersistent ? { persistent: true } : {}) },
            ...atk.damageTypes.slice(1).map(dt => {
              const isPersistent = dt.type.toLowerCase().startsWith('persistent');
              return {
                expr: dt.expr.replace(/\s/g, ''),
                label: dt.type || 'damage',
                ...(isPersistent ? { persistent: true } : {}),
              };
            }),
          ];
        } else {
          const match = atk.damage?.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
          const base  = match
            ? (match[2] ? `${match[1]}${match[2].replace(/\s/g, '')}` : match[1])
            : '';
          primaryExprForEwMod = base && ewMod !== 0
            ? `${base}${ewMod >= 0 ? `+${ewMod}` : ewMod}`
            : base;
          damageGroups = primaryExprForEwMod ? [{ expr: primaryExprForEwMod, label: 'damage' }] : [];
        }

        // Build display damage string with typed dice components
        let displayDamage: string;
        const strikeAbilities = atk.strikeAbilities ?? [];
        if (atk.damageTypes && atk.damageTypes.length > 0) {
          displayDamage = atk.damageTypes
            .map((dt, di) => {
              const expr = di === 0 && ewMod !== 0 ? primaryExprForEwMod : dt.expr;
              return dt.type ? `${expr} ${dt.type}` : expr;
            })
            .join(' plus ');
        } else {
          displayDamage = ewMod !== 0 && primaryExprForEwMod
            ? (atk.damage ?? '').replace(/(\d+d\d+(?:[+-]\d+)?)/, primaryExprForEwMod)
            : (atk.damage ?? '');
        }

        const atkTraits = atk.traits ?? [];
        const effectiveDamageGroups = withSneakAttack(damageGroups, sneakAttackExpr, sneakAttackActive, atk.type, atkTraits);

        return (
          <AttackLine
            key={i}
            name={atk.name}
            type={atk.type}
            bonus={effBonus}
            damage={displayDamage}
            damageExpr={damageGroups[0]?.expr ?? ''}
            damageModified={ewMod !== 0}
            traits={atkTraits}
            rangeDisplay={rangeDisplay}
            attackStyle={atkStyle}
            damageStyle={atkStyle}
            isAgile={isAgile}
            strikeAbilities={strikeAbilities}
            onRollAttack={(mod, label, e) => onRollAttack(mod, label, effectiveDamageGroups, damageLabel, atkTraits, e)}
            onRollDamage={e => onRollDamage(effectiveDamageGroups, damageLabel, atkTraits, e)}
            onManualRollAttack={(mod, label, e) => onManualRollAttack(mod, label, effectiveDamageGroups, atkTraits, e)}
            onManualRollDamage={e => onManualRollDamage(effectiveDamageGroups, damageLabel, e)}
          />
        );
      })}
    </>
  );
}
