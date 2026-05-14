import { useState, useRef } from 'react';
import type { PF2EItem } from '../../types/pf2e';
import {
  applyEliteWeakToHtml,
  extractDamageGroups,
  isLimitedUse,
  processFoundryHtml,
} from '../../utils/foundryMacros';
import type { DamageGroup } from '../../utils/foundryMacros';
import { scaleAbilityHtml, eliteWeakDmgMod, eliteWeakDcMod } from '../../utils/levelScaling';
import { ABILITY_GLOSSARY } from '../../data/abilityGlossary';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { usePopupPosition } from '../../hooks/usePopupPosition';
import styles from './StatblockDrawer.module.css';

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
  onRollAll?: (groups: DamageGroup[], abilityName: string, traits: string[], e: React.MouseEvent) => void;
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

  // Determine elite/weak damage and DC modifiers for this ability
  const limited = isLimitedUse(item);
  const dmgMod = eliteWeakDmgMod(ewMod, limited);
  const dcMod  = eliteWeakDcMod(ewMod);
  const adjustedDesc = (dmgMod !== 0 || dcMod !== 0)
    ? applyEliteWeakToHtml(scaledDesc, dmgMod, dcMod)
    : scaledDesc;

  // Extract damage groups from the (adjusted) raw description
  const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
  const hasDamage = damageGroups.length > 0 && onRollAll != null;

  // Ability glossary popup
  const glossaryDesc = ABILITY_GLOSSARY[item.name];
  const [popupOpen, setPopupOpen] = useState(false);
  const nameRef = useRef<HTMLElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const pos = usePopupPosition(nameRef, popupOpen, { popupWidth: 300, popupMaxHeight: 380 });
  useOutsideClick(popupRef, () => setPopupOpen(false), nameRef);

  return (
    <div className={styles.itemBlock}>
      <p className={styles.itemHeader}>
        <strong
          ref={nameRef}
          className={`${styles.itemName} ${glossaryDesc ? styles.abilityNameClickable : ''}`}
          onClick={glossaryDesc ? () => setPopupOpen(o => !o) : undefined}
          title={glossaryDesc ? 'Click for rules summary' : undefined}
        >
          {item.name}
        </strong>
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
          dangerouslySetInnerHTML={{ __html: processFoundryHtml(adjustedDesc) }}
        />
      )}
      {hasDamage && (
        <button
          className={styles.rollAllDmgBtn}
          style={dmgMod !== 0 ? { borderColor: ewStyle?.color, color: ewStyle?.color } : undefined}
          onClick={e => onRollAll!(damageGroups, item.name, [], e)}
        >
          🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
        </button>
      )}

      {/* Ability glossary popup */}
      {popupOpen && glossaryDesc && pos && (
        <div
          ref={popupRef}
          className={styles.abilityPopup}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxH }}
        >
          <div className={styles.abilityPopupHeader}>
            <span className={styles.abilityPopupName}>{item.name}</span>
            <span className={styles.abilityPopupSource}>Monster Core</span>
            <button className={styles.abilityPopupClose} onClick={() => setPopupOpen(false)}>✕</button>
          </div>
          <div className={styles.abilityPopupDesc}>{glossaryDesc}</div>
        </div>
      )}
    </div>
  );
}
