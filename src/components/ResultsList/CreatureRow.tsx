import type { CreatureRecord } from '../../db/schema';
import styles from './ResultsList.module.css';

const RARITY_COLORS: Record<string, string> = {
  uncommon: '#8a6a18',
  rare: '#2a4a8a',
  unique: '#6a2a8a',
};

const TRAIT_COLORS: Record<string, string> = {
  undead: '#6b2222',
  construct: '#4a4a5a',
  humanoid: '#6a5a3a',
  animal: '#3a5a3a',
  dragon: '#5a3a6a',
  fiend: '#6a2a4a',
  celestial: '#2a4a6a',
};

const SIZE_LABELS: Record<string, string> = {
  tiny: 'Tiny',
  sm: 'Small',
  med: 'Medium',
  lg: 'Large',
  huge: 'Huge',
  grg: 'Gargantuan',
};

function traitBg(trait: string): string {
  return TRAIT_COLORS[trait.toLowerCase()] ?? '#6a5a3a';
}

interface CreatureRowProps {
  creature: CreatureRecord;
  isSelected: boolean;
  onClick: () => void;
  onAddToEncounter: (creature: CreatureRecord) => void;
}

export function CreatureRow({ creature, isSelected, onClick, onAddToEncounter }: CreatureRowProps) {
  const rarityColor = RARITY_COLORS[creature.rarity] ?? null;
  const shownTraits = creature.traits.slice(0, 3);
  const sizeLabel = SIZE_LABELS[creature.size] ?? creature.size;
  const levelLabel = creature.level >= 0 ? `+${creature.level}` : `${creature.level}`;

  return (
    <div
      className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      aria-selected={isSelected}
    >
      <div className={styles.rowTop}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{creature.name}</span>
          {creature.rarity !== 'common' && rarityColor && (
            <span className={styles.rarityChip} style={{ background: rarityColor }}>
              {creature.rarity}
            </span>
          )}
        </div>
        <div className={styles.rightControls}>
          <span className={`${styles.levelBadge} ${isSelected ? styles.levelBadgeActive : ''}`}>
            {levelLabel}
          </span>
          <button
            className={styles.addBtn}
            onClick={e => {
              e.stopPropagation();
              onAddToEncounter(creature);
            }}
            title="Add to encounter"
            tabIndex={-1}
            aria-label={`Add ${creature.name} to encounter`}
          >
            +
          </button>
        </div>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.sizeMeta}>{sizeLabel}</span>
        {shownTraits.map(t => (
          <span key={t} className={styles.traitChip} style={{ background: traitBg(t) }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
