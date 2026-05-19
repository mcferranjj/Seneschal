import { useState } from 'react';
import type { FeatChoice, FeatSlotType } from '../../../db/schema';
import styles from './SheetFeats.module.css';

interface SheetFeatsProps {
  feats: FeatChoice[];
}

const SLOT_TYPE_LABELS: Record<FeatSlotType, string> = {
  ancestry: 'Ancestry',
  class: 'Class',
  general: 'General',
  skill: 'Skill',
  free: 'Free',
};

const SLOT_TYPE_COLORS: Record<FeatSlotType, string> = {
  ancestry: styles.badgeAncestry,
  class: styles.badgeClass,
  general: styles.badgeGeneral,
  skill: styles.badgeSkill,
  free: styles.badgeFree,
};

export function SheetFeats({ feats }: SheetFeatsProps) {
  const [open, setOpen] = useState(true);

  const assignedFeats = feats.filter(f => f.featId !== null);

  return (
    <div className={styles.block}>
      <button className={styles.header} onClick={() => setOpen(v => !v)}>
        <h3 className={styles.title}>Feats</h3>
        <span className={styles.count}>{assignedFeats.length}</span>
        <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className={styles.list}>
          {assignedFeats.length === 0 ? (
            <p className={styles.empty}>No feats selected.</p>
          ) : (
            assignedFeats.map((f, i) => (
              <div key={`${f.slotType}-${f.level}-${i}`} className={styles.row}>
                <span className={`${styles.badge} ${SLOT_TYPE_COLORS[f.slotType]}`}>
                  {SLOT_TYPE_LABELS[f.slotType]}
                </span>
                <span className={styles.featName}>{f.featName}</span>
                <span className={styles.featLevel}>Lvl {f.level}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
