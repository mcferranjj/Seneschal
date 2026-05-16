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

// ── Shared ability glossary popup ─────────────────────────────────────────────

/**
 * Renders a glossary description string with any ability names that exist in
 * ABILITY_GLOSSARY highlighted as clickable spans. Clicking one calls
 * onAbilityClick with that ability's name so the parent can show a nested popup.
 */
function GlossaryText({ text, onAbilityClick }: { text: string; onAbilityClick: (name: string) => void }) {
  // Sort keys longest-first so longer names (e.g. "Greater Constrict") match
  // before shorter ones (e.g. "Constrict").
  const keys = Object.keys(ABILITY_GLOSSARY).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const name = match[1];
    parts.push(
      <span
        key={idx++}
        className={styles.glossaryLink}
        onClick={() => onAbilityClick(name)}
      >
        {name}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/**
 * Shared popup for showing an ability's glossary description.
 * Supports one level of nested lookup: clicking an ability name within the
 * description replaces the nested view with that ability's entry.
 */
export function AbilityPopup({
  name,
  desc,
  pos,
  popupRef,
  onClose,
}: {
  name: string;
  desc: string;
  pos: { top?: number; bottom?: number; left: number; maxH: number };
  popupRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const [nestedName, setNestedName] = useState<string | null>(null);
  const nestedDesc = nestedName ? ABILITY_GLOSSARY[nestedName] : null;

  return (
    <div
      ref={popupRef}
      className={styles.abilityPopup}
      style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxH }}
    >
      <div className={styles.abilityPopupHeader}>
        <span className={styles.abilityPopupName}>{nestedName ?? name}</span>
        <span className={styles.abilityPopupSource}>Monster Core</span>
        <button className={styles.abilityPopupClose} onClick={nestedName ? () => setNestedName(null) : onClose}>
          {nestedName ? '← Back' : '✕'}
        </button>
      </div>
      <div className={styles.abilityPopupDesc}>
        <GlossaryText
          text={nestedDesc ?? desc}
          onAbilityClick={n => n !== (nestedName ?? name) && setNestedName(n)}
        />
      </div>
    </div>
  );
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

  const pos = usePopupPosition(nameRef, popupOpen, { popupWidth: 300, popupMaxHeight: 380 }, popupRef);
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
        <AbilityPopup
          name={item.name}
          desc={glossaryDesc}
          pos={pos}
          popupRef={popupRef}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  );
}
