import type { PF2EItem } from '../../types/pf2e';
import type { Condition } from '../../types/encounter';
import { computeAttackPenalty, computeDamagePenalty } from '../../types/conditionEffects';
import { getDamageString, getDamageGroups } from './statblockHelpers';
import { slugToTitle } from '../../utils/formatters';
import type { DamageGroupInput } from '../dice/DiceRoller';
import { AttackLine } from './AttackLine';

interface AttackBlockProps {
  item: PF2EItem;
  onRollAttack: (mod: number, label: string, damageGroups: DamageGroupInput[], damageLabel: string, damageTraits: string[], e: React.MouseEvent) => void;
  onRollDamage: (groups: DamageGroupInput[], label: string, traits: string[], e: React.MouseEvent) => void;
  onManualRollAttack?: (mod: number, label: string, damageGroups: DamageGroupInput[], damageTraits: string[], e: React.MouseEvent) => void;
  onManualRollDamage?: (groups: DamageGroupInput[], label: string, e: React.MouseEvent) => void;
  conditions?: Condition[];
  strMod?: number;
  dexMod?: number;
  ewMod?: number;
  ewStyle?: React.CSSProperties;
}

export function AttackBlock({ item, onRollAttack, onRollDamage, onManualRollAttack, onManualRollDamage, conditions = [], strMod, dexMod, ewMod = 0, ewStyle }: AttackBlockProps) {
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

  // Convert hyphenated slugs (e.g. "improved-push") to title-case display names
  // (e.g. "Improved Push") so they match ABILITY_GLOSSARY keys and render as
  // clickable links via GlossaryNameLink in AttackLine.
  const strikeAbilities = effects.map(slugToTitle);

  // Combine condition damage penalty and elite/weak damage modifier
  const totalDmgMod = dmgPen + ewMod;

  // Build one group per damage type so multi-type attacks (e.g. slashing + fire) all roll
  const baseDamageGroups = getDamageGroups(item.system?.damageRolls, totalDmgMod);
  // If there are no structured rolls but damage has a dice expression, fall back
  const damageGroups: DamageGroupInput[] = baseDamageGroups.length > 0
    ? baseDamageGroups
    : (() => {
        const m = damage.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
        if (!m) return [];
        const expr = m[2] ? `${m[1]}${m[2].replace(/\s/g, '')}` : m[1];
        const modifiedExpr = totalDmgMod !== 0 ? `${expr}${totalDmgMod >= 0 ? `+${totalDmgMod}` : totalDmgMod}` : expr;
        return [{ expr: modifiedExpr, label: 'damage' }];
      })();

  // The primary damage expression used for standalone "click damage" rolls (first group)
  const damageExpr = damageGroups[0]?.expr ?? '';

  const attackStyle = isDebuffedAtk ? debuffStyle : ewMod !== 0 ? ewStyle : undefined;
  const damageStyle = isDebuffedDmg ? debuffStyle : ewMod !== 0 && ewMod !== dmgPen ? ewStyle : undefined;

  return (
    <AttackLine
      name={item.name}
      type={attackType}
      bonus={effBonus}
      damage={damage}
      damageExpr={damageExpr}
      damageModified={isDebuffedDmg || ewMod !== 0}
      traits={traits}
      rangeDisplay={rangeDisplay}
      attackStyle={attackStyle}
      damageStyle={damageStyle}
      isAgile={isAgile}
      strikeAbilities={strikeAbilities}
      onRollAttack={(mod, label, e) => {
        onRollAttack(mod, label, damageGroups, `${item.name} damage`, traits, e);
      }}
      onRollDamage={e => onRollDamage(damageGroups, `${item.name} damage`, traits, e)}
      onManualRollAttack={onManualRollAttack
        ? (mod, label, e) => onManualRollAttack(mod, label, damageGroups, traits, e)
        : undefined}
      onManualRollDamage={onManualRollDamage
        ? e => onManualRollDamage(damageGroups, `${item.name} damage`, e)
        : undefined}
    />
  );
}
