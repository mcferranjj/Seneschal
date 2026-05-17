import { createPortal } from 'react-dom';
import { ABILITY_GLOSSARY } from '../../data/abilityGlossary';
import { extractDamageGroups, processFoundryHtml } from '../../utils/foundryMacros';
import type { DamageGroup } from '../../utils/foundryMacros';
import { useGlossaryPopup } from '../../hooks/useGlossaryPopup';
import { AbilityPopup } from './AbilityPopup';
import styles from './StatblockDrawer.module.css';

const ACTION_SYMBOLS: Record<string, string> = {
  single: ' ◆', two: ' ◆◆', three: ' ◆◆◆', reaction: ' ↺', free: ' ◇', passive: '',
};

export interface CustomAbilityBlockProps {
  ab: {
    name: string;
    description?: string;
    actionType?: string;
    trigger?: string;
    requirements?: string;
    frequency?: string;
    genericAbilityName?: string;
  };
  adjustedDesc: string;
  dmgMod: number;
  ewStyle?: React.CSSProperties;
  onRollDamage: (groups: DamageGroup[], name: string, traits: string[], e: React.MouseEvent) => void;
}

export function CustomAbilityBlock({ ab, adjustedDesc, dmgMod, ewStyle, onRollDamage }: CustomAbilityBlockProps) {
  // Glossary lookup — prefer genericAbilityName, then fall back to the ability name itself
  const glossaryKey = ab.genericAbilityName ?? ab.name;
  const glossaryDesc = ABILITY_GLOSSARY[glossaryKey];

  const { popupOpen, togglePopup, closePopup, nameRef, popupRef, pos } = useGlossaryPopup();

  const sym = ab.actionType ? (ACTION_SYMBOLS[ab.actionType] ?? '') : '';
  const damageGroups = adjustedDesc ? extractDamageGroups(adjustedDesc) : [];
  const hasDamage = damageGroups.length > 0;

  return (
    <div className={styles.itemBlock}>
      <p className={styles.itemHeader}>
        <strong
          ref={nameRef}
          className={`${styles.itemName} ${glossaryDesc ? styles.abilityNameClickable : ''}`}
          onClick={glossaryDesc ? togglePopup : undefined}
          title={glossaryDesc ? 'Click for rules summary' : undefined}
        >
          {ab.name}
        </strong>
        {sym && <span className={styles.actionSymbol}>{sym}</span>}
        {ab.trigger && <> <strong>Trigger</strong> {ab.trigger};</>}
        {ab.requirements && <> <strong>Requirements</strong> {ab.requirements};</>}
        {ab.frequency && <> <strong>Frequency</strong> {ab.frequency}</>}
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
          onClick={e => onRollDamage(damageGroups, ab.name, [], e)}
        >
          🎲 Roll damage {dmgMod !== 0 && <span className={styles.rollAllDmgMod}>({dmgMod > 0 ? `+${dmgMod}` : dmgMod})</span>}
        </button>
      )}

      {popupOpen && glossaryDesc && pos && createPortal(
        <AbilityPopup
          name={glossaryKey}
          desc={glossaryDesc}
          pos={pos}
          popupRef={popupRef}
          onClose={closePopup}
        />,
        document.body,
      )}
    </div>
  );
}
