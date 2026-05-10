import type { PF2EItem } from '../../types/pf2e';
import {
  applyEliteWeakToHtml,
  extractDamageGroups,
  isLimitedUse,
  stripFoundryMacros,
  linkKeywords,
  linkRolls,
} from '../../utils/foundryMacros';
import type { DamageGroup } from '../../utils/foundryMacros';
import { scaleAbilityHtml } from '../../utils/levelScaling';
import styles from './StatblockDrawer.module.css';

function processHtml(raw: string): string {
  return linkRolls(linkKeywords(stripFoundryMacros(raw)));
}

function actionSymbol(item: PF2EItem): string {
  const at = item.system?.actionType?.value;
  const cost = item.system?.actions?.value;
  if (at === 'reaction') return ' ↺';
  if (at === 'free') return ' ◇';
  if (at === 'passive') return '';
  if (cost === 1) return ' ◆';
  if (cost === 2) return ' ◆◆';
  if (cost === 3) return ' ◆◆◆';
  return '';
}

interface ItemBlockProps {
  item: PF2EItem;
  onRollAll?: (groups: DamageGroup[], abilityName: string, e: React.MouseEvent) => void;
  ewMod?: number;
  ewStyle?: React.CSSProperties;
  baseLevel?: number;
  targetLevel?: number;
}

export function ItemBlock({ item, onRollAll, ewMod = 0, ewStyle, baseLevel, targetLevel }: ItemBlockProps) {
  const symbol = actionSymbol(item);
  const rawDesc = item.system?.description?.value ?? '';
  const traits = item.system?.traits?.value ?? [];
  const trigger = item.system?.trigger?.value;
  const traitStr = traits.length > 0 ? `(${traits.join(', ')})` : '';

  // Apply level scaling first (if active), then elite/weak on top
  const scaledDesc = (baseLevel != null && targetLevel != null && baseLevel !== targetLevel)
    ? scaleAbilityHtml(rawDesc, baseLevel, targetLevel)
    : rawDesc;

  // Determine elite/weak damage modifier for this ability
  const limited = isLimitedUse(item);
  const dmgMod = ewMod !== 0
    ? (limited ? (ewMod > 0 ? 4 : -4) : (ewMod > 0 ? 2 : -2))
    : 0;

  // DC adjustment is always ±2; damage mod is ±2 (at-will) or ±4 (limited)
  const dcMod = ewMod !== 0 ? (ewMod > 0 ? 2 : -2) : 0;
  const adjustedDesc = (dmgMod !== 0 || dcMod !== 0)
    ? applyEliteWeakToHtml(scaledDesc, dmgMod, dcMod)
    : scaledDesc;

  // Extract damage groups from the (adjusted) raw description
  const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
  const hasDamage = damageGroups.length > 0 && onRollAll != null;

  return (
    <div className={styles.itemBlock}>
      <p className={styles.itemHeader}>
        <strong className={styles.itemName}>{item.name}</strong>
        {symbol && <span className={styles.actionSymbol}>{symbol}</span>}
        {traitStr && <span className={styles.itemTraits}> {traitStr}</span>}
        {trigger && (
          <>
            {' '}
            <strong>Trigger</strong> {trigger};
          </>
        )}
      </p>
      {adjustedDesc && (
        <div
          className={styles.itemDesc}
          dangerouslySetInnerHTML={{ __html: processHtml(adjustedDesc) }}
        />
      )}
      {hasDamage && (
        <button
          className={styles.rollAllDmgBtn}
          style={dmgMod !== 0 ? { borderColor: ewStyle?.color, color: ewStyle?.color } : undefined}
          onClick={e => onRollAll!(damageGroups, item.name, e)}
        >
          🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
        </button>
      )}
    </div>
  );
}
