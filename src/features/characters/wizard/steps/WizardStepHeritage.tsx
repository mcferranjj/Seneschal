import { useRef } from 'react';
import type { CharacterHeritageRef, HeritageRecord } from '../../../../db/schema';
import { useHeritageData } from '../../hooks/useHeritageData';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { RARITY_ORDER, groupByRarity } from '../shared/groupByRarity';
import { RaritySection } from '../shared/RaritySection';
import { FoundryHtml } from '../shared/FoundryHtml';
import { usePickerSearch } from '../shared/usePickerSearch';
import { useScrollSelectedIntoView } from '../shared/useScrollSelectedIntoView';
import { useConfirmAnimation } from '../shared/useConfirmAnimation';
import styles from './WizardStepHeritage.module.css';
import gridStyles from '../shared/confirmedGrid.module.css';

function compareByRarityThenName(a: HeritageRecord, b: HeritageRecord): number {
  const rarityDiff =
    RARITY_ORDER.indexOf(a.rarity as typeof RARITY_ORDER[number]) -
    RARITY_ORDER.indexOf(b.rarity as typeof RARITY_ORDER[number]);
  if (rarityDiff !== 0) return rarityDiff;
  return a.name.localeCompare(b.name);
}

interface WizardStepHeritageProps {
  ancestrySlug: string | undefined;
  selected: CharacterHeritageRef | null;
  onSelect: (heritage: CharacterHeritageRef | null) => void;
  hideHeading?: boolean;
  suppressDetailPanel?: boolean;
  /** When true, only the selected card is shown and its action becomes "Deselect". */
  confirmed?: boolean;
  /** Called when the user clicks "Select" on the highlighted heritage (or double-clicks). */
  onConfirm?: () => void;
  /** Called when the user clicks "Deselect" on the confirmed card. */
  onDeconfirm?: () => void;
}

export function WizardStepHeritage({
  ancestrySlug, selected, onSelect, hideHeading, suppressDetailPanel,
  confirmed = false, onConfirm, onDeconfirm,
}: WizardStepHeritageProps) {
  const { heritages, loading } = useHeritageData(ancestrySlug);
  const { search, setSearch, filtered } = usePickerSearch({
    items: heritages,
    getName: h => h.name,
  });

  const ancestryHeritages = filtered.filter(h => !h.isVersatile).sort(compareByRarityThenName);
  const versatileHeritages = filtered.filter(h => h.isVersatile).sort(compareByRarityThenName);

  const deconfirming = useConfirmAnimation(confirmed);
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  useScrollSelectedIntoView(selectedCardRef, confirmed);

  function selectHeritage(h: HeritageRecord) {
    onSelect({
      id: h.id,
      name: h.name,
      slug: h.slug,
      isVersatile: h.isVersatile,
      versatileAncestrySlug: h.isVersatile ? (h.versatileAncestrySlug ?? null) : null,
    });
  }

  function renderHeritageCard(h: HeritageRecord) {
    const isSelected = selected?.id === h.id;
    const action = isSelected
      ? confirmed
        ? { label: 'Deselect', onClick: () => onDeconfirm?.(), variant: 'secondary' as const }
        : onConfirm
          ? { label: 'Select', onClick: () => onConfirm(), variant: 'primary' as const }
          : undefined
      : undefined;

    return (
      <EntityCard
        key={h.id}
        name={h.name}
        selected={isSelected}
        traits={h.traits}
        collapsed={confirmed && !isSelected}
        domRef={isSelected ? selectedCardRef : undefined}
        onClick={() => !confirmed && selectHeritage(h)}
        onDoubleClick={() => {
          if (confirmed && isSelected) { onDeconfirm?.(); return; }
          selectHeritage(h);
          onConfirm?.();
        }}
        action={action}
      />
    );
  }

  const selectedRecord = selected
    ? heritages.find(h => h.id === selected.id) ?? null
    : null;

  if (!ancestrySlug) {
    return (
      <div className={styles.emptyState}>
        <p>Please select an ancestry first.</p>
      </div>
    );
  }

  const detailContent = selectedRecord && (
    <DetailPanel
      name={selectedRecord.name}
      badge={selectedRecord.isVersatile ? <span className={styles.versatileBadge}>Versatile</span> : undefined}
      className={styles.detailPanel}
    >
      {selectedRecord.description && (
        <FoundryHtml html={selectedRecord.description} />
      )}
      {selectedRecord.traits.length > 0 && (
        <DetailSection label="Traits">
          <div className={styles.traits}>
            {selectedRecord.traits.map(t => <span key={t} className={styles.trait}>{t}</span>)}
          </div>
        </DetailSection>
      )}
      {selectedRecord.publication && (
        <DetailSection label="Source">
          <div className={styles.source}>{selectedRecord.publication}</div>
        </DetailSection>
      )}
    </DetailPanel>
  );

  return (
    <PickerLayout
      title={hideHeading ? undefined : 'Choose Heritage'}
      sub={hideHeading ? undefined : 'Your heritage represents your lineage within your ancestry.'}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search heritages…"
      loading={loading}
      detail={detailContent}
      suppressDetailPanel={suppressDetailPanel}
    >
      {ancestryHeritages.length > 0 && (
        <div className={styles.heritageGroup}>
          {!confirmed && <div className={styles.groupHeader}>Ancestry Heritages</div>}
          {groupByRarity(ancestryHeritages).map(({ rarity, items }) => {
            const containsSelected = confirmed && selected
              ? items.some(h => h.id === selected.id)
              : false;
            return (
              <RaritySection key={`anc-${rarity}`} rarity={rarity} hideHeader={confirmed && !containsSelected}>
                <div className={`${styles.grid} ${confirmed ? gridStyles.gridConfirmed : ''} ${deconfirming ? gridStyles.gridDeconfirming : ''}`}>
                  {items.map(renderHeritageCard)}
                </div>
              </RaritySection>
            );
          })}
        </div>
      )}
      {versatileHeritages.length > 0 && (
        <div className={styles.heritageGroup}>
          {!confirmed && <div className={`${styles.groupHeader} ${styles.groupHeaderVersatile}`}>Versatile Heritages</div>}
          {groupByRarity(versatileHeritages).map(({ rarity, items }) => {
            const containsSelected = confirmed && selected
              ? items.some(h => h.id === selected.id)
              : false;
            return (
              <RaritySection key={`ver-${rarity}`} rarity={rarity} hideHeader={confirmed && !containsSelected}>
                <div className={`${styles.grid} ${confirmed ? gridStyles.gridConfirmed : ''} ${deconfirming ? gridStyles.gridDeconfirming : ''}`}>
                  {items.map(renderHeritageCard)}
                </div>
              </RaritySection>
            );
          })}
        </div>
      )}
    </PickerLayout>
  );
}
