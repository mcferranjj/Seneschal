import type { CreatureRecord } from '../../../db/schema';
import { SIZE_LABELS } from '../../../data/pf2eConstants';
import { RARITY_COLORS, traitBg } from '../../../utils/traitColors';
import { writeDndPayload } from '../../../utils/dnd';
import { buildCustomCreatureExport, downloadJson } from '../../../utils/exportImport';
import styles from './ResultsList.module.css';

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
  const levelLabel = `Lv ${creature.level}`;
  const isCustom = creature.packSource === 'custom';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer!.effectAllowed = 'copy';
    writeDndPayload(e.dataTransfer!, { kind: 'creatureRecord', payload: { creatureId: creature.id } });
  };

  const handleExportCustomCreature = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const file = await buildCustomCreatureExport([creature.id]);
      const sanitized = creature.name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0];
      downloadJson(`creature-${sanitized}-${dateStr}.json`, file);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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
      draggable
      onDragStart={handleDragStart}
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
          {isCustom && (
            <button
              className={styles.exportBtn}
              onClick={handleExportCustomCreature}
              title="Export creature"
              tabIndex={-1}
              aria-label={`Export ${creature.name}`}
            >
              💾
            </button>
          )}
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
