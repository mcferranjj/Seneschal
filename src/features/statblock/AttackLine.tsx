/**
 * AttackLine — unified attack rendering component.
 *
 * All three attack rendering paths (official PF2E items via AttackBlock,
 * scaled creature attacks, and custom creature attacks) normalize their
 * data into AttackLineProps and delegate here.
 */

import { formatMod } from '../../utils/formatters';
import { TraitChip } from './TraitChip';
import styles from './StatblockDrawer.module.css';

export interface AttackLineProps {
  name: string;
  type: 'melee' | 'ranged';
  /** Effective bonus already incorporating ewMod and any condition penalties */
  bonus: number | null;
  /**
   * Full display string for the damage section (typed components + ability names),
   * e.g. "2d6+9 slashing plus 1d6 fire plus Grab".
   * The rollable portion is determined by damageExpr; anything after the last
   * dice component is rendered as plain text.
   */
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
  /**
   * Named strike abilities displayed after the damage entry (e.g. ["Grab", "Push"]).
   * Rendered as plain " plus Ability" text — not part of the rollable span.
   */
  strikeAbilities?: string[];
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
  strikeAbilities = [],
  onRollAttack,
  onRollDamage,
}: AttackLineProps) {
  const typeLabel = type === 'ranged' ? 'Ranged' : 'Melee';

  const map2 = bonus != null ? bonus - (isAgile ? 4 : 5) : null;
  const map3 = bonus != null ? bonus - (isAgile ? 8 : 10) : null;

  // Build the display traits list: named traits first, then range string
  const displayTraits = rangeDisplay ? [...traits, rangeDisplay] : traits;

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

      {/* Trait list — each known trait is an interactive chip; unknown/range
          strings are plain text. All wrapped in the italic attackTraits span. */}
      {displayTraits.length > 0 && (
        <>
          {' '}
          <span className={styles.attackTraits}>
            {'('}
            {displayTraits.map((t, i) => (
              <span key={t}>
                <TraitChip trait={t} rarity="" variant="inline" />
                {i < displayTraits.length - 1 && ', '}
              </span>
            ))}
            {')'}
          </span>
        </>
      )}

      {damage && (
        <>
          {', '}
          {damageExpr ? (
            <>
              <span
                className={styles.rollMod}
                title="Roll damage"
                style={damageStyle}
                onClick={e => onRollDamage(e)}
              >
                <strong>Damage</strong> {displayDamage}
              </span>
              {strikeAbilities.map(ab => (
                <span key={ab}> plus {ab}</span>
              ))}
            </>
          ) : (
            <><strong>Damage</strong> {damage}</>
          )}
        </>
      )}
    </p>
  );
}
