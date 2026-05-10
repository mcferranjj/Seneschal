import { useState, useRef } from 'react';
import type { DamageGroup } from '../../utils/foundryMacros';
import { SpellPopup } from './SpellPopup';
import styles from './StatblockDrawer.module.css';

interface SpellNameLinkProps {
  spell: { name: string; description: string; traits?: string[] };
  ewMod: number;
  ewStyle?: React.CSSProperties;
  onRollAll?: (groups: DamageGroup[], name: string, e: React.MouseEvent) => void;
}

export function SpellNameLink({ spell, ewMod, ewStyle, onRollAll }: SpellNameLinkProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span className={styles.spellNameWrap}>
      <span
        ref={ref}
        className={styles.spellNameLink}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title={`View ${spell.name}`}
      >
        {spell.name}
      </span>
      {open && (
        <SpellPopup
          name={spell.name}
          description={spell.description}
          traits={spell.traits}
          ewMod={ewMod}
          ewStyle={ewStyle}
          onRollAll={onRollAll}
          anchorRef={ref}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}
