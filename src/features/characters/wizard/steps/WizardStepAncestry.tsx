import { useState } from 'react';
import type { CharacterAncestryRef, AncestryRecord } from '../../../../db/schema';
import { useAncestryData } from '../../hooks/useAncestryData';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { RaritySection } from '../shared/RaritySection';
import { groupByRarity, RARITY_ORDER } from '../shared/groupByRarity';
import styles from './WizardStepAncestry.module.css';

interface WizardStepAncestryProps {
  selected: CharacterAncestryRef | null;
  onSelect: (ancestry: CharacterAncestryRef | null) => void;
  hideHeading?: boolean;
}

export function WizardStepAncestry({ selected, onSelect, hideHeading }: WizardStepAncestryProps) {
  const { ancestries, loading } = useAncestryData();
  const [search, setSearch] = useState('');

  const filtered = ancestries
    .filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.traits.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const rarityDiff = RARITY_ORDER.indexOf(a.rarity as any) - RARITY_ORDER.indexOf(b.rarity as any);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });

  const groupedByRarity = groupByRarity(filtered);

  function selectAncestry(a: AncestryRecord) {
    onSelect({
      id: a.id,
      name: a.name,
      slug: a.slug,
      hp: a.hp,
      speed: a.speed,
      size: a.size,
      vision: a.vision,
      traits: a.traits,
      languages: a.languages,
      fixedBoosts: a.boosts.fixed,
      freeBoostCount: a.boosts.freeCount,
      flaw: a.boosts.flaw,
    });
  }

  const selectedRecord = selected
    ? ancestries.find(a => a.id === selected.id) ?? null
    : null;

  const detailContent = selectedRecord && (
    <DetailPanel name={selectedRecord.name} className={styles.detailPanel}>
      <div className={styles.detailStats}>
        <div className={styles.statRow}><span className={styles.statLabel}>HP</span><span className={styles.statVal}>{selectedRecord.hp}</span></div>
        <div className={styles.statRow}><span className={styles.statLabel}>Speed</span><span className={styles.statVal}>{selectedRecord.speed} ft.</span></div>
        <div className={styles.statRow}><span className={styles.statLabel}>Size</span><span className={styles.statVal}>{selectedRecord.size}</span></div>
        <div className={styles.statRow}><span className={styles.statLabel}>Vision</span><span className={styles.statVal}>{selectedRecord.vision}</span></div>
      </div>
      <DetailSection label="Ability Adjustments">
        <div className={styles.boostInfo}>
          {selectedRecord.boosts.fixed.map((pair, i) =>
            pair.length === 1
              ? <span key={i} className={styles.boostChip}>{pair[0].toUpperCase()} ▲</span>
              : <span key={i} className={styles.boostChipOr}>{pair.map(k => k.toUpperCase()).join(' or ')}</span>
          )}
          {Array.from({ length: selectedRecord.boosts.freeCount }).map((_, i) => (
            <span key={`free-${i}`} className={styles.boostChipFree}>Free Boost</span>
          ))}
          {selectedRecord.boosts.flaw && (
            <span className={styles.flawChip}>{selectedRecord.boosts.flaw.toUpperCase()} ▼</span>
          )}
        </div>
      </DetailSection>
      <DetailSection label="Languages">
        <div className={styles.langList}>
          {selectedRecord.languages.map(l => <span key={l} className={styles.lang}>{l}</span>)}
        </div>
      </DetailSection>
      <DetailSection label="Traits">
        <div className={styles.traits}>
          {selectedRecord.traits.map(t => <span key={t} className={styles.trait}>{t}</span>)}
        </div>
      </DetailSection>
    </DetailPanel>
  );

  return (
    <PickerLayout
      title={hideHeading ? undefined : "Choose Ancestry"}
      sub={hideHeading ? undefined : "Your ancestry determines your heritage options and some ability adjustments."}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search ancestries…"
      loading={loading}
      emptyMessage={!loading && ancestries.length === 0 ? 'No ancestry data found. Use the "Sync Now" banner above to download character builder data.' : undefined}
      detail={detailContent}
    >
      {groupedByRarity.map(({ rarity, items }) => (
        <RaritySection key={rarity} rarity={rarity}>
          <div className={styles.grid}>
            {items.map(a => (
              <EntityCard
                key={a.id}
                name={a.name}
                selected={selected?.id === a.id}
                stats={
                  <><span>HP {a.hp}</span><span>Speed {a.speed}</span><span>{a.size}</span></>
                }
                traits={a.traits}
                onClick={() => selectAncestry(a)}
              />
            ))}
          </div>
        </RaritySection>
      ))}
    </PickerLayout>
  );
}
