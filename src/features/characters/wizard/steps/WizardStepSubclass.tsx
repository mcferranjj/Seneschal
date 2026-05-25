import type { CharacterSubclassRef, FeatRecord } from '../../../../db/schema';
import { useFeatData } from '../../hooks/useFeatData';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { FoundryHtml } from '../shared/FoundryHtml';
import { usePickerSearch } from '../shared/usePickerSearch';
import styles from './WizardStepSubclass.module.css';

interface WizardStepSubclassProps {
  subclassTag: string;
  subclassLabel: string;
  selected: CharacterSubclassRef | null;
  onSelect: (subclass: CharacterSubclassRef | null) => void;
  /** Called when the user double-clicks or clicks "Select". */
  onConfirm?: () => void;
}

export function WizardStepSubclass({
  subclassTag, subclassLabel, selected, onSelect, onConfirm,
}: WizardStepSubclassProps) {
  const { feats, loading } = useFeatData();

  const subclassOptions = feats
    .filter(f => f.category === 'classfeature' && f.otherTags.includes(subclassTag))
    .sort((a, b) => a.name.localeCompare(b.name));

  const { search, setSearch, filtered } = usePickerSearch({
    items: subclassOptions,
    getName: f => f.name,
  });

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
      <div className={styles.grid}>
        {filtered.map(f => {
          const isSelected = selected?.id === f.id;
          return (
            <EntityCard
              key={f.id}
              name={f.name}
              selected={isSelected}
              onClick={() => selectSubclass(f)}
              onDoubleClick={() => { selectSubclass(f); onConfirm?.(); }}
              action={isSelected && onConfirm
                ? { label: 'Select', onClick: () => onConfirm(), variant: 'primary' as const }
                : undefined}
            />
          );
        })}
      </div>
    </PickerLayout>
  );
}
