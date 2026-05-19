import { useState } from 'react';
import type { CharacterClassRef, ClassRecord, AbilityKey } from '../../../../db/schema';
import { useClassData } from '../../hooks/useClassData';
import { ABILITY_LABELS, ABILITY_ABBR } from '../../utils/abilityComputation';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import styles from './WizardStepClass.module.css';

interface WizardStepClassProps {
  selected: CharacterClassRef | null;
  keyAbility: AbilityKey | null;
  onSelect: (cls: CharacterClassRef | null) => void;
  onKeyAbilityChange: (ka: AbilityKey) => void;
}

export function WizardStepClass({
  selected, keyAbility, onSelect, onKeyAbilityChange,
}: WizardStepClassProps) {
  const { classes, loading } = useClassData();
  const [search, setSearch] = useState('');

  const filtered = classes
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  function selectClass(c: ClassRecord) {
    onSelect({
      id: c.id,
      name: c.name,
      slug: c.slug,
      hp: c.hp,
      keyAbilityOptions: c.keyAbilityOptions,
      perception: c.perception,
      savingThrows: c.savingThrows,
      unarmoredRank: c.defenses?.unarmored ?? 1,
      trainedSkills: c.trainedSkills,
      additionalSkills: c.additionalSkills,
      ancestryFeatLevels: c.ancestryFeatLevels,
      classFeatLevels: c.classFeatLevels,
      generalFeatLevels: c.generalFeatLevels,
      skillFeatLevels: c.skillFeatLevels,
      skillIncreaseLevels: c.skillIncreaseLevels,
    });
  }

  const selectedRecord = selected
    ? classes.find(c => c.id === selected.id) ?? null
    : null;

  const profLabel = (rank: number) =>
    rank >= 4 ? 'Legendary' : rank >= 3 ? 'Master' : rank >= 2 ? 'Expert' : rank >= 1 ? 'Trained' : 'Untrained';

  const detailContent = selectedRecord && (
    <DetailPanel name={selectedRecord.name} className={styles.detailPanel}>
      <div className={styles.detailStats}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>HP per Level</span>
          <span className={styles.statVal}>{selectedRecord.hp}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Perception</span>
          <span className={styles.statVal}>{profLabel(selectedRecord.perception)}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Fortitude</span>
          <span className={styles.statVal}>{profLabel(selectedRecord.savingThrows.fortitude)}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Reflex</span>
          <span className={styles.statVal}>{profLabel(selectedRecord.savingThrows.reflex)}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Will</span>
          <span className={styles.statVal}>{profLabel(selectedRecord.savingThrows.will)}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Additional Skills</span>
          <span className={styles.statVal}>{selectedRecord.additionalSkills}</span>
        </div>
      </div>

      {selectedRecord.trainedSkills.length > 0 && (
        <DetailSection label="Trained Skills">
          <div className={styles.skillList}>
            {selectedRecord.trainedSkills.map(s => (
              <span key={s} className={styles.skillBadge}>{s}</span>
            ))}
          </div>
        </DetailSection>
      )}

      <DetailSection label="Key Ability">
        {selectedRecord.keyAbilityOptions.length === 1 ? (
          <span className={styles.keyAbilityFixed}>
            {ABILITY_LABELS[selectedRecord.keyAbilityOptions[0]]}
          </span>
        ) : (
          <div className={styles.keyAbilityOptions}>
            {selectedRecord.keyAbilityOptions.map(ka => (
              <button
                key={ka}
                className={`${styles.kaBtn} ${keyAbility === ka ? styles.kaActive : ''}`}
                onClick={() => onKeyAbilityChange(ka)}
              >
                {ABILITY_ABBR[ka]}
                <span className={styles.kaLabel}>{ABILITY_LABELS[ka]}</span>
              </button>
            ))}
          </div>
        )}
      </DetailSection>
    </DetailPanel>
  );

  return (
    <PickerLayout
      title="Choose Class"
      sub="Your class determines your role and abilities in combat."
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search classes…"
      loading={loading}
      detail={detailContent}
    >
      <div className={styles.grid}>
        {filtered.map(c => (
          <EntityCard
            key={c.id}
            name={c.name}
            selected={selected?.id === c.id}
            stats={
              <><span>HP {c.hp}</span><span>{c.keyAbilityOptions.map(k => ABILITY_ABBR[k]).join('/')}</span></>
            }
            onClick={() => selectClass(c)}
          />
        ))}
      </div>
    </PickerLayout>
  );
}
