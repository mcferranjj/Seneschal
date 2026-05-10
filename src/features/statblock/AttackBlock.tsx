import type { PF2EItem } from '../../types/pf2e';
import type { Condition } from '../../types/encounter';
import { computeAttackPenalty, computeDamagePenalty } from '../../types/conditionEffects';
import { formatMod } from '../../utils/formatters';
import { linkKeywords, getDamageString } from './statblockHelpers';
import styles from './StatblockDrawer.module.css';

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
  const typeLabel = isRanged ? 'Ranged' : 'Melee';
  const isAgile = traits.includes('agile');

  // Condition-aware penalties for this specific attack
  const atkRollPen = computeAttackPenalty(conditions, attackType, traits, strMod, dexMod);
  const dmgPen = computeDamagePenalty(conditions, attackType, traits);
  const isDebuffedAtk = atkRollPen !== 0;
  const isDebuffedDmg = dmgPen !== 0;
  const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;

  // Elite/Weak: +2 attack; +2 damage for standard at-will strikes
  const ewDmgMod = ewMod;

  const effBonus = bonus != null ? bonus + atkRollPen + ewMod : null;
  const map2 = effBonus != null ? effBonus - (isAgile ? 4 : 5) : null;
  const map3 = effBonus != null ? effBonus - (isAgile ? 8 : 10) : null;

  const range = item.system?.range;
  const rangeDisplay =
    range?.increment != null
      ? `range increment ${range.increment} feet`
      : range?.value
        ? `range ${range.value} feet`
        : null;

  const displayTraits = rangeDisplay ? [...traits, rangeDisplay] : traits;
  const traitStr = displayTraits.length > 0 ? `(${displayTraits.join(', ')})` : '';
  // Traits get keyword tooltips only — no dice linking (trait names like "deadly-2d10" or "reload-0" are not rollable)
  const traitHtml = traitStr ? linkKeywords(`<span>${traitStr}</span>`).replace(/^<span>/, '').replace(/<\/span>$/, '') : '';
  const fullDamage = [damage, ...effects].filter(Boolean).join(' plus ');

  // Extract the first dice+modifier from fullDamage, tolerating spaces
  const damageExprMatch = fullDamage.match(/(\d+d\d+)\s*([+-]\s*\d+)?/);
  const baseDamageExpr = damageExprMatch
    ? (damageExprMatch[2]
        ? `${damageExprMatch[1]}${damageExprMatch[2].replace(/\s/g, '')}`
        : damageExprMatch[1])
    : '';
  // Combine condition damage penalty and elite/weak damage modifier
  const totalDmgMod = dmgPen + ewDmgMod;
  const damageExpr = baseDamageExpr && totalDmgMod !== 0
    ? `${baseDamageExpr}${totalDmgMod >= 0 ? `+${totalDmgMod}` : totalDmgMod}`
    : baseDamageExpr;
  const damageLabel = `${item.name} damage`;

  function fireAttack(mod: number, mapLabel: string, e: React.MouseEvent) {
    onRollAttack(mod, `${item.name}${mapLabel}`, damageExpr, damageLabel, traits, e);
  }

  // Display damage string: show adjusted expression if debuffed or elite/weak adjusted, otherwise raw text
  const displayDamage = (isDebuffedDmg || ewDmgMod !== 0) && damageExpr ? damageExpr : fullDamage;

  return (
    <p className={styles.attackLine}>
      <span className={styles.attackTypeLabel}>{typeLabel}</span>
      {' ◆ '}
      {effBonus != null ? (
        <>
          {/* Primary attack: name + bonus */}
          <span
            className={styles.rollMod}
            title="Roll attack (1st action)"
            style={isDebuffedAtk ? debuffStyle : ewMod !== 0 ? ewStyle : undefined}
            onClick={e => fireAttack(effBonus, '', e)}
          >
            <strong>{item.name}</strong> {formatMod(effBonus)}
          </span>
          {/* MAP brackets — each individually clickable */}
          {map2 != null && map3 != null && (
            <span className={styles.mapBracket} style={isDebuffedAtk ? { color: '#c0392b' } : ewMod !== 0 ? { color: ewStyle?.color } : undefined}>
              {' ['}
              <span
                className={styles.mapRoll}
                title="Roll attack (2nd action, MAP)"
                onClick={e => fireAttack(map2, ' (MAP 2)', e)}
              >
                {formatMod(map2)}
              </span>
              {'/'}
              <span
                className={styles.mapRoll}
                title="Roll attack (3rd action, MAP)"
                onClick={e => fireAttack(map3, ' (MAP 3)', e)}
              >
                {formatMod(map3)}
              </span>
              {']'}
            </span>
          )}
        </>
      ) : (
        <strong>{item.name}</strong>
      )}
      {traitHtml && (
        <>
          {' '}
          <span
            className={styles.attackTraits}
            dangerouslySetInnerHTML={{ __html: traitHtml }}
          />
        </>
      )}
      {fullDamage && (
        <>
          {', '}
          {damageExpr ? (
            <span
              className={styles.rollMod}
              title="Roll damage"
              style={isDebuffedDmg ? debuffStyle : ewDmgMod !== 0 ? ewStyle : undefined}
              onClick={e => onRollDamage(damageExpr, damageLabel, traits, e)}
            >
              <strong>Damage</strong> {displayDamage}
            </span>
          ) : (
            <><strong>Damage</strong> {fullDamage}</>
          )}
        </>
      )}
    </p>
  );
}
