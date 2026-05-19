import { useState } from 'react';
import type { CharacterHeritageRef, HeritageRecord } from '../../../../db/schema';
import { useHeritageData } from '../../hooks/useHeritageData';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import styles from './WizardStepHeritage.module.css';

interface WizardStepHeritageProps {
  ancestrySlug: string | undefined;
  selected: CharacterHeritageRef | null;
  onSelect: (heritage: CharacterHeritageRef | null) => void;
  hideHeading?: boolean;
}

export function WizardStepHeritage({ ancestrySlug, selected, onSelect, hideHeading }: WizardStepHeritageProps) {
  const { heritages, loading } = useHeritageData(ancestrySlug);
  const [search, setSearch] = useState('');

  const filtered = heritages.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const ancestryHeritages = filtered.filter(h => !h.isVersatile).sort((a, b) => a.name.localeCompare(b.name));
  const versatileHeritages = filtered.filter(h => h.isVersatile).sort((a, b) => a.name.localeCompare(b.name));

  function selectHeritage(h: HeritageRecord) {
    onSelect({
      id: h.id,
      name: h.name,
      slug: h.slug,
      isVersatile: h.isVersatile,
      versatileAncestrySlug: h.isVersatile ? (h.versatileAncestrySlug ?? null) : null,
    });
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
      <p className={styles.description}>{selectedRecord.description}</p>
      <DetailSection label="Traits">
        <div className={styles.traits}>
          {selectedRecord.traits.map(t => <span key={t} className={styles.trait}>{t}</span>)}
        </div>
      </DetailSection>
    </DetailPanel>
  );

  return (
    <PickerLayout
      title={hideHeading ? undefined : "Choose Heritage"}
      sub={hideHeading ? undefined : "Your heritage represents your lineage within your ancestry."}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search heritages…"
      loading={loading}
      detail={detailContent}
    >
      {ancestryHeritages.length > 0 && (
        <div className={styles.heritageGroup}>
          <div className={styles.groupHeader}>Ancestry Heritages</div>
          <div className={styles.grid}>
            {ancestryHeritages.map(h => (
              <EntityCard
                key={h.id}
                name={h.name}
                selected={selected?.id === h.id}
                traits={h.traits}
                onClick={() => selectHeritage(h)}
              />
            ))}
          </div>
        </div>
      )}
      {versatileHeritages.length > 0 && (
        <div className={styles.heritageGroup}>
          <div className={`${styles.groupHeader} ${styles.groupHeaderVersatile}`}>Versatile Heritages</div>
          <div className={styles.grid}>
            {versatileHeritages.map(h => (
              <EntityCard
                key={h.id}
                name={h.name}
                selected={selected?.id === h.id}
                traits={h.traits}
                onClick={() => selectHeritage(h)}
              />
            ))}
          </div>
        </div>
      )}
    </PickerLayout>
  );
}
