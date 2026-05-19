import { useState } from 'react';
import type { FeatSlotType, FeatRecord } from '../../../db/schema';
import { useFeatData } from '../hooks/useFeatData';
import styles from './FeatBrowser.module.css';

interface FeatBrowserProps {
  slotType: FeatSlotType;
  slotLevel: number;
  currentFeatId: string | null;
  onAssign: (featId: string, featName: string) => void;
  onClose: () => void;
  ancestrySlug?: string;
  classSlug?: string;
  versatileAncestrySlug?: string;
}

const ACTION_ICONS: Record<string, string> = {
  action: '◆',
  free: '◇',
  reaction: '↺',
  passive: '—',
};

function actionCost(feat: FeatRecord): string {
  if (!feat.actionType) return '';
  const icon = ACTION_ICONS[feat.actionType] ?? feat.actionType;
  if (feat.actionType === 'action' && feat.actions) {
    return icon.repeat(feat.actions);
  }
  return icon;
}

export function FeatBrowser({
  slotType, slotLevel, currentFeatId, onAssign, onClose,
  ancestrySlug, classSlug, versatileAncestrySlug,
}: FeatBrowserProps) {
  const { filterFeats } = useFeatData();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [selectedFeat, setSelectedFeat] = useState<FeatRecord | null>(null);

  const feats = filterFeats({
    search,
    slotType,
    maxLevel: slotLevel,
    actionType: actionFilter,
    ancestrySlug,
    classSlug,
    versatileAncestrySlug,
  });

  const actionTypes = ['action', 'free', 'reaction', 'passive'];

  function handleAssign() {
    if (!selectedFeat) return;
    onAssign(selectedFeat.id, selectedFeat.name);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.title}>Choose Feat</span>
          <span className={styles.slotInfo}>Lv. {slotLevel} {slotType}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} title="Close">✕</button>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search feats…"
          autoFocus
        />
        <div className={styles.actionFilters}>
          {actionTypes.map(at => (
            <button
              key={at}
              className={`${styles.filterChip} ${actionFilter === at ? styles.filterActive : ''}`}
              onClick={() => setActionFilter(prev => prev === at ? null : at)}
            >
              {ACTION_ICONS[at] ?? at}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.featList}>
        {feats.length === 0 && (
          <div className={styles.noResults}>No feats found.</div>
        )}
        {feats.map(feat => (
          <button
            key={feat.id}
            className={`${styles.featRow} ${selectedFeat?.id === feat.id ? styles.featSelected : ''} ${currentFeatId === feat.id ? styles.featCurrent : ''}`}
            onClick={() => setSelectedFeat(prev => prev?.id === feat.id ? null : feat)}
          >
            <div className={styles.featMain}>
              <span className={styles.featName}>{feat.name}</span>
              {feat.actionType && (
                <span className={styles.actionCost}>{actionCost(feat)}</span>
              )}
            </div>
            <div className={styles.featMeta}>
              <span className={styles.featLevel}>Lv. {feat.level}</span>
              {feat.traits.slice(0, 3).map(t => (
                <span key={t} className={styles.traitChip}>{t}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selectedFeat && (
        <div className={styles.detail}>
          <div className={styles.detailName}>{selectedFeat.name}</div>
          {selectedFeat.prerequisites.length > 0 && (
            <div className={styles.prereqs}>
              <span className={styles.prereqLabel}>Prerequisites: </span>
              {selectedFeat.prerequisites.join(', ')}
            </div>
          )}
          <div
            className={styles.description}
            dangerouslySetInnerHTML={{ __html: selectedFeat.description }}
          />
        </div>
      )}

      <div className={styles.footer}>
        <button
          className={styles.assignBtn}
          onClick={handleAssign}
          disabled={!selectedFeat}
        >
          Assign Feat
        </button>
      </div>
    </div>
  );
}
