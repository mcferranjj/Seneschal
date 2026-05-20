import type { CharacterBackgroundRef, BackgroundRecord } from '../../../../db/schema';
import { useBackgroundData } from '../../hooks/useBackgroundData';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { FoundryHtml } from '../shared/FoundryHtml';
import { usePickerSearch } from '../shared/usePickerSearch';
import styles from './WizardStepBackground.module.css';

interface WizardStepBackgroundProps {
  selected: CharacterBackgroundRef | null;
  onSelect: (background: CharacterBackgroundRef | null) => void;
  /** Called when the user clicks "Select" on the highlighted background (or double-clicks). */
  onConfirm?: () => void;
}

export function WizardStepBackground({ selected, onSelect, onConfirm }: WizardStepBackgroundProps) {
  const { backgrounds, loading } = useBackgroundData();
  const { search, setSearch, filtered } = usePickerSearch({
    items: backgrounds,
    getName: b => b.name,
    getKeywords: b => b.trainedSkills,
  });

  function selectBackground(b: BackgroundRecord) {
    const slug = b.slug ?? b.name.toLowerCase().replace(/\s+/g, '-');
    onSelect({
      id: b.id,
      name: b.name,
      slug,
      boostOptions: b.boostOptions.map(opt => opt.choices),
      freeBoostCount: b.freeBoostCount,
      trainedSkills: b.trainedSkills,
      trainedLoreSkills: b.trainedLoreSkills,
      grantedFeatId: b.grantedFeat?.uuid ?? null,
      grantedFeatName: b.grantedFeat?.name ?? null,
    });
  }

  const selectedRecord = selected
    ? backgrounds.find(b => b.id === selected.id) ?? null
    : null;

  const detailContent = selectedRecord && (
    <DetailPanel name={selectedRecord.name} className={styles.detailPanel}>
      {selectedRecord.description && (
        <FoundryHtml html={selectedRecord.description} />
      )}
      <DetailSection label="Trained Skills">
        <div className={styles.skillList}>
          {selectedRecord.trainedSkills.map(s => (
            <span key={s} className={styles.skillBadge}>{s}</span>
          ))}
          {selectedRecord.trainedLoreSkills.map(s => (
            <span key={s} className={`${styles.skillBadge} ${styles.loreBadge}`}>{s} Lore</span>
          ))}
        </div>
      </DetailSection>
      <DetailSection label="Ability Boosts">
        <div className={styles.boostList}>
          {selectedRecord.boostOptions.map((opt, i) => (
            <span key={i} className={styles.boostOpt}>
              {opt.choices.map(k => k.toUpperCase()).join(' or ')}
            </span>
          ))}
          {selectedRecord.freeBoostCount > 0 && (
            <span className={styles.boostOpt}>Free ({selectedRecord.freeBoostCount})</span>
          )}
        </div>
      </DetailSection>
      {selectedRecord.grantedFeat && (
        <DetailSection label="Granted Feat">
          <span className={styles.grantedFeat}>{selectedRecord.grantedFeat.name}</span>
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
      title="Choose Background"
      sub="Your background describes your life before adventuring."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search backgrounds…"
      loading={loading}
      detail={detailContent}
    >
      <div className={styles.grid}>
        {filtered.map(b => {
          const isSelected = selected?.id === b.id;
          return (
            <EntityCard
              key={b.id}
              name={b.name}
              selected={isSelected}
              traits={b.trainedSkills}
              onClick={() => selectBackground(b)}
              onDoubleClick={() => {
                selectBackground(b);
                onConfirm?.();
              }}
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
