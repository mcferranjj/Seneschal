import type { PF2EItem } from '../../types/pf2e';
import type { Condition } from '../../types/encounter';
import { computeAttackPenalty, computeDamagePenalty } from '../../types/conditionEffects';
import { getDamageString } from './statblockHelpers';
import { AttackLine } from './AttackLine';

interface AttackBlockProps {
  item: PF2EItem;
  onRollAttack: (mod: number, label: string, damageExpr: string, damageLabel: string, damageTraits: string[], e: React.MouseEvent) => void;
  onRollDamage: (expr: string, label: string, traits: string[], e: React.MouseEvent) => void;
  conditions?: Condition[];
  strMod?: number;
  dexMod?: number;
  ewMod?: number;
  ewStyle?: React.CSSProperties;
}

export function AttackBlock({ item, onRollAttack, onRollDamage, conditions = [], strMod, dexMod, ewMod = 0, ewStyle }: AttackBlockProps) {
  const bonus = item.system?.bonus?.value;
  const damage = getDamageString(item.system?.damageRolls);
  const traits = item.system?.traits?.value ?? [];
  const effects = item.system?.attackEffects?.value ?? [];

  const isRanged =
    item.type === 'ranged' ||
    item.system?.category === 'ranged' ||
    item.system?.range?.increment != null ||
    traits.some(t => t.startsWith('thrown'));
  const attackType = isRanged ? 'ranged' : 'melee';
  const isAgile = traits.includes('agile');

  // Condition-aware penalties for this specific attack
  const atkRollPen = computeAttackPenalty(conditions, attackType, traits, strMod, dexMod);
  const dmgPen = computeDamagePenalty(conditions, attackType, traits);
  const isDebuffedAtk = atkRollPen !== 0;
  const isDebuffedDmg = dmgPen !== 0;
  const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;

  const effBonus = bonus != null ? bonus + atkRollPen + ewMod : null;

  const range = item.system?.range;
  const rangeDisplay =
    range?.increment != null
      ? `range increment ${range.increment} feet`
      : range?.value
        ? `range ${range.value} feet`
        : undefined;

  const fullDamage = [damage, ...effects].filter(Boolean).join(' plus ');

  // Extract the first dice+modifier from fullDamage, tolerating spaces
  const damageExprMatch = fullDamage.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
  const baseDamageExpr = damageExprMatch
    ? (damageExprMatch[2]
        ? `${damageExprMatch[1]}${damageExprMatch[2].replace(/\s/g, '')}`
        : damageExprMatch[1])
    : '';
  // Combine condition damage penalty and elite/weak damage modifier
  const totalDmgMod = dmgPen + ewMod;
  const damageExpr = baseDamageExpr && totalDmgMod !== 0
    ? `${baseDamageExpr}${totalDmgMod >= 0 ? `+${totalDmgMod}` : totalDmgMod}`
    : baseDamageExpr;

  const attackStyle = isDebuffedAtk ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
  const damageStyle = isDebuffedDmg ? debuffStyle : ewMod !== 0 && ewMod !== dmgPen ? ewStyle : undefined;

  return (
    <AttackLine
      name={item.name}
      type={attackType}
      bonus={effBonus}
      damage={fullDamage}
      damageExpr={damageExpr}
      damageModified={isDebuffedDmg || ewMod !== 0}
      traits={traits}
      rangeDisplay={rangeDisplay}
      attackStyle={attackStyle}
      damageStyle={damageStyle}
      isAgile={isAgile}
      onRollAttack={(mod, label, e) => {
        onRollAttack(mod, label, damageExpr, `${item.name} damage`, traits, e);
      }}
      onRollDamage={(expr, _label, e) => onRollDamage(expr, `${item.name} damage`, traits, e)}
    />
  );
}
