import { useState } from 'react';
import { ABILITY_GLOSSARY } from '../../data/abilityGlossary';
import styles from './StatblockDrawer.module.css';

// ── Module-level constants — computed once, not on every render ───────────────

// Sorted longest-first so "Greater Constrict" matches before "Constrict", etc.
const GLOSSARY_KEYS = Object.keys(ABILITY_GLOSSARY).sort((a, b) => b.length - a.length);

const GLOSSARY_PATTERN = new RegExp(
  `\\b(${GLOSSARY_KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'g',
);

// ── GlossaryText ──────────────────────────────────────────────────────────────

/**
 * Renders a glossary description string with any ability names that exist in
 * ABILITY_GLOSSARY highlighted as clickable spans. Clicking one calls
 * onAbilityClick with that ability's name so the parent can navigate to it.
 */
export function GlossaryText({
  text,
  onAbilityClick,
}: {
  text: string;
  onAbilityClick: (name: string) => void;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  // Reset lastIndex before each use since the pattern is module-level and stateful
  GLOSSARY_PATTERN.lastIndex = 0;

  while ((match = GLOSSARY_PATTERN.exec(text)) !== null) {
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

// ── AbilityPopup ──────────────────────────────────────────────────────────────

interface AbilityPopupProps {
  name: string;
  desc: string;
  pos: { top?: number; bottom?: number; left: number; maxH: number };
  popupRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

/**
 * Popup for showing an ability's glossary description.
 * Clicking an ability name within the description navigates into that entry;
 * the close button becomes a Back button to return to the previous entry.
 */
export function AbilityPopup({ name, desc, pos, popupRef, onClose }: AbilityPopupProps) {
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
        <button
          className={styles.abilityPopupClose}
          onClick={nestedName ? () => setNestedName(null) : onClose}
        >
          {nestedName ? '← Back' : '✕'}
        </button>
      </div>
      <div className={styles.abilityPopupDesc}>
        <GlossaryText
          text={nestedDesc ?? desc}
          onAbilityClick={n => { if (n !== (nestedName ?? name)) setNestedName(n); }}
        />
      </div>
    </div>
  );
}
