/**
 * AttackLine — unified attack rendering component.
 *
 * All three attack rendering paths (official PF2E items via AttackBlock,
 * scaled creature attacks, and custom creature attacks) normalize their
 * data into AttackLineProps and delegate here.
 */

import { formatMod } from '../../utils/formatters';
import { linkKeywords } from './statblockHelpers';
import styles from './StatblockDrawer.module.css';

export interface AttackLineProps {
  name: string;
  type: 'melee' | 'ranged';
  /** Effective bonus already incorporating ewMod and any condition penalties */
  bonus: number | null;
  damage: string;
  damageExpr: string;
  /** True when the damage expression has been modified (condition or elite/weak) */
  damageModified?: boolean;
  traits?: string[];
  /** Range as a display string, e.g. "range increment 30 feet" */
  rangeDisplay?: string;
  /** Condition-penalty or elite/weak style applied to the attack roll */
  attackStyle?: React.CSSProperties;
  /** Condition-penalty or elite/weak style applied to the damage roll */
  damageStyle?: React.CSSProperties;
  /** Whether MAP brackets should show on the attack (omit when bonus is null) */
  isAgile?: boolean;
  onRollAttack: (mod: number, label: string, e: React.MouseEvent) => void;
  onRollDamage: (e: React.MouseEvent) => void;
}

export function AttackLine({
  name,
  type,
  bonus,
  damage,
  damageExpr,
  damageModified,
  traits = [],
  rangeDisplay,
  attackStyle,
  damageStyle,
  isAgile = false,
  onRollAttack,
  onRollDamage,
}: AttackLineProps) {
  const typeLabel = type === 'ranged' ? 'Ranged' : 'Melee';
  const damageLabel = `${name} damage`;

  const map2 = bonus != null ? bonus - (isAgile ? 4 : 5) : null;
  const map3 = bonus != null ? bonus - (isAgile ? 8 : 10) : null;

  const displayTraits = rangeDisplay ? [...traits, rangeDisplay] : traits;
  const traitStr = displayTraits.length > 0 ? `(${displayTraits.join(', ')})` : '';
  const traitHtml = traitStr
    ? linkKeywords(`<span>${traitStr}</span>`).replace(/^<span>/, '').replace(/<\/span>$/, '')
    : '';

  const displayDamage = (damageModified && damageExpr) ? damageExpr : damage;

  return (
    <p className={styles.attackLine}>
      <span className={styles.attackTypeLabel}>{typeLabel}</span>
      {' ◆ '}
      {bonus != null ? (
        <>
          <span
            className={styles.rollMod}
            title="Roll attack (1st action)"
            style={attackStyle}
            onClick={e => onRollAttack(bonus, name, e)}
          >
            <strong>{name}</strong> {formatMod(bonus)}
          </span>
          {map2 != null && map3 != null && (
            <span
              className={styles.mapBracket}
              style={attackStyle ? { color: (attackStyle as React.CSSProperties & { color?: string }).color } : undefined}
            >
              {' ['}
              <span
                className={styles.mapRoll}
                title="Roll attack (2nd action, MAP)"
                onClick={e => onRollAttack(map2, `${name} (MAP 2)`, e)}
              >
                {formatMod(map2)}
              </span>
              {'/'}
              <span
                className={styles.mapRoll}
                title="Roll attack (3rd action, MAP)"
                onClick={e => onRollAttack(map3, `${name} (MAP 3)`, e)}
              >
                {formatMod(map3)}
              </span>
              {']'}
            </span>
          )}
        </>
      ) : (
        <strong>{name}</strong>
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
      {damage && (
        <>
          {', '}
          {damageExpr ? (
            <span
              className={styles.rollMod}
              title="Roll damage"
              style={damageStyle}
              onClick={e => onRollDamage(e)}
            >
              <strong>Damage</strong> {displayDamage}
            </span>
          ) : (
            <><strong>Damage</strong> {damage}</>
          )}
        </>
      )}
    </p>
  );
}
