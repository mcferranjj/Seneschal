import type { CreatureRecord } from '../../db/schema';
import styles from './ResultsList.module.css';

const RARITY_COLORS: Record<string, string> = {
  uncommon: '#c35a11',
  rare: '#3a1fa8',
  unique: '#5a1a8a',
};

const SIZE_LABELS: Record<string, string> = {
  tiny: 'Tiny',
  sm: 'Small',
  med: 'Medium',
  lg: 'Large',
  huge: 'Huge',
  grg: 'Gargantuan',
};

interface CreatureRowProps {
  creature: CreatureRecord;
  isSelected: boolean;
  onClick: () => void;
}

export function CreatureRow({ creature, isSelected, onClick }: CreatureRowProps) {
  const rarityColor = RARITY_COLORS[creature.rarity] ?? null;
  const shownTraits = creature.traits.slice(0, 4);
  const sizeLabel = SIZE_LABELS[creature.size] ?? creature.size;

  return (
    <button
      className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
      onClick={onClick}
      aria-selected={isSelected}
    >
      <div className={styles.rowMain}>
        <span className={styles.name}>{creature.name}</span>
        <span className={styles.levelBadge}>Lvl {creature.level}</span>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.sizeMeta}>{sizeLabel}</span>
        {creature.rarity !== 'common' && (
          <span
            className={styles.rarityTag}
            style={rarityColor ? { background: rarityColor } : undefined}
          >
            {creature.rarity}
          </span>
        )}
        <div className={styles.traitList}>
          {shownTraits.map(t => (
            <span key={t} className={styles.traitTag}>
              {t}
            </span>
          ))}
          {creature.traits.length > 4 && (
            <span className={styles.traitMore}>+{creature.traits.length - 4}</span>
          )}
        </div>
      </div>
    </button>
  );
}
