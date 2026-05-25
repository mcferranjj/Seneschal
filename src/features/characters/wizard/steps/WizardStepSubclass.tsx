import { useRef } from 'react';
import type { CharacterSubclassRef, FeatRecord } from '../../../../db/schema';
import { useFeatData } from '../../hooks/useFeatData';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { FoundryHtml } from '../shared/FoundryHtml';
import { usePickerSearch } from '../shared/usePickerSearch';
import { useScrollSelectedIntoView } from '../shared/useScrollSelectedIntoView';
import { useConfirmAnimation } from '../shared/useConfirmAnimation';
import styles from './WizardStepSubclass.module.css';
import gridStyles from '../shared/confirmedGrid.module.css';

interface WizardStepSubclassProps {
  subclassTag: string;
  subclassLabel: string;
  selected: CharacterSubclassRef | null;
  onSelect: (subclass: CharacterSubclassRef | null) => void;
  /** When true, only the selected card is shown and its action becomes "Deselect". */
  confirmed?: boolean;
  /** Called when the user clicks "Select" or double-clicks. */
  onConfirm?: () => void;
  /** Called when the user clicks "Deselect" on the confirmed card. */
  onDeconfirm?: () => void;
}

export function WizardStepSubclass({
  subclassTag, subclassLabel, selected, onSelect,
  confirmed = false, onConfirm, onDeconfirm,
}: WizardStepSubclassProps) {
  const { feats, loading } = useFeatData();

  const subclassOptions = feats
    .filter(f => f.category === 'classfeature' && f.otherTags.includes(subclassTag))
    .sort((a, b) => a.name.localeCompare(b.name));

  const { search, setSearch, filtered } = usePickerSearch({
    items: subclassOptions,
    getName: f => f.name,
  });

  const deconfirming = useConfirmAnimation(confirmed);
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  useScrollSelectedIntoView(selectedCardRef, confirmed);

  const selectedRecord = selected
    ? subclassOptions.find(f => f.id === selected.id) ?? null
    : null;

  function selectSubclass(f: FeatRecord) {
    onSelect({ id: f.id, name: f.name, slug: f.slug });
  }

  const detailContent = selectedRecord && (
    <DetailPanel name={selectedRecord.name} className={styles.detailPanel}>
      {selectedRecord.description && (
        <FoundryHtml html={selectedRecord.description} />
      )}
      {selectedRecord.traits.length > 0 && (
        <DetailSection label="Traits">
          <div className={styles.traits}>
            {selectedRecord.traits.map(t => (
              <span key={t} className={styles.trait}>{t}</span>
            ))}
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
      title={undefined}
      sub={undefined}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={`Search ${subclassLabel.toLowerCase()}s…`}
      loading={loading}
      detail={detailContent}
    >
      <div className={`${styles.grid} ${confirmed ? gridStyles.gridConfirmed : ''} ${deconfirming ? gridStyles.gridDeconfirming : ''}`}>
        {filtered.map(f => {
          const isSelected = selected?.id === f.id;
          const action = isSelected
            ? confirmed
              ? { label: 'Deselect', onClick: () => onDeconfirm?.(), variant: 'secondary' as const }
              : onConfirm
                ? { label: 'Select', onClick: () => onConfirm(), variant: 'primary' as const }
                : undefined
            : undefined;
          return (
            <EntityCard
              key={f.id}
              name={f.name}
              selected={isSelected}
              collapsed={confirmed && !isSelected}
              domRef={isSelected ? selectedCardRef : undefined}
              onClick={() => !confirmed && selectSubclass(f)}
              onDoubleClick={() => {
                if (confirmed && isSelected) { onDeconfirm?.(); return; }
                selectSubclass(f);
                onConfirm?.();
              }}
              action={action}
            />
          );
        })}
      </div>
    </PickerLayout>
  );
}
