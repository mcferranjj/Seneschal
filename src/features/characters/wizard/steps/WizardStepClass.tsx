import { useEffect, useState } from 'react';
import type { CharacterClassRef, CharacterSubclassRef, ClassRecord, AbilityKey } from '../../../../db/schema';
import { useClassData } from '../../hooks/useClassData';
import { useFeatData } from '../../hooks/useFeatData';
import { ABILITY_LABELS, ABILITY_ABBR } from '../../utils/abilityComputation';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { RaritySection } from '../shared/RaritySection';
import { groupByRarity, RARITY_ORDER } from '../shared/groupByRarity';
import { usePickerSearch } from '../shared/usePickerSearch';
import { ClassFeatureTable } from '../shared/ClassFeatureTable';
import { WizardStepSubclass } from './WizardStepSubclass';
import styles from './WizardStepClass.module.css';

interface WizardStepClassProps {
  selected: CharacterClassRef | null;
  subclass: CharacterSubclassRef | null;
  keyAbility: AbilityKey | null;
  onSelect: (cls: CharacterClassRef | null) => void;
  onSubclassSelect: (subclass: CharacterSubclassRef | null) => void;
  onKeyAbilityChange: (ka: AbilityKey) => void;
  /** Called when the user clicks "Select" on the highlighted class (or double-clicks). */
  onConfirm?: () => void;
}

function profLabel(rank: number): string {
  if (rank >= 4) return 'Legendary';
  if (rank >= 3) return 'Master';
  if (rank >= 2) return 'Expert';
  if (rank >= 1) return 'Trained';
  return 'Untrained';
}

export function WizardStepClass({
  selected, subclass, keyAbility, onSelect, onSubclassSelect, onKeyAbilityChange, onConfirm,
}: WizardStepClassProps) {
  const { classes, loading } = useClassData();
  const { feats } = useFeatData();

  // Mirror the lineage two-panel pattern: confirm class → subclass picker slides in
  const [classConfirmed, setClassConfirmed] = useState<boolean>(!!subclass);
  const [subclassConfirmed, setSubclassConfirmed] = useState<boolean>(!!subclass);

  useEffect(() => {
    if (!selected) { setClassConfirmed(false); setSubclassConfirmed(false); }
  }, [selected]);

  const { search, setSearch, filtered: filteredUnsorted } = usePickerSearch({
    items: classes,
    getName: c => c.name,
  });
  const filtered = filteredUnsorted
    .slice()
    .sort((a, b) => {
      const rarityDiff =
        RARITY_ORDER.indexOf(a.rarity as typeof RARITY_ORDER[number]) -
        RARITY_ORDER.indexOf(b.rarity as typeof RARITY_ORDER[number]);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });
  const groupedByRarity = groupByRarity(filtered);

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
      subclassTag: c.subclassTag,
      subclassLabel: c.subclassLabel,
    });
  }

  const selectedRecord = selected
    ? classes.find(c => c.id === selected.id) ?? null
    : null;

  const detailContent = selectedRecord && (
    <DetailPanel name={selectedRecord.name} className={styles.detailPanel}>
      <div className={styles.detailStats}>
        <Stat label="HP per Level"     value={selectedRecord.hp} />
        <Stat label="Perception"       value={profLabel(selectedRecord.perception)} />
        <Stat label="Fortitude"        value={profLabel(selectedRecord.savingThrows.fortitude)} />
        <Stat label="Reflex"           value={profLabel(selectedRecord.savingThrows.reflex)} />
        <Stat label="Will"             value={profLabel(selectedRecord.savingThrows.will)} />
        <Stat label="Additional Skills" value={selectedRecord.additionalSkills} />
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

      {selectedRecord.publication && (
        <DetailSection label="Source">
          <div className={styles.source}>{selectedRecord.publication}</div>
        </DetailSection>
      )}

      <DetailSection label="Class Features by Level">
        <ClassFeatureTable cls={selectedRecord} feats={feats} />
      </DetailSection>
    </DetailPanel>
  );

  const classPicker = (
    <PickerLayout
      title={classConfirmed ? undefined : 'Choose Class'}
      sub={classConfirmed ? undefined : 'Your class determines your role and abilities in combat.'}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search classes…"
      loading={loading}
      detail={classConfirmed ? undefined : detailContent}
      suppressDetailPanel={classConfirmed && !subclass}
    >
      {groupedByRarity.map(({ rarity, items }) => {
        const containsSelected = classConfirmed && selected
          ? items.some(c => c.id === selected.id)
          : false;
        return (
          <RaritySection key={rarity} rarity={rarity} hideHeader={classConfirmed && !containsSelected}>
            <div className={`${styles.grid} ${classConfirmed ? styles.gridConfirmed : ''}`}>
              {items.map(c => {
                const isSelected = selected?.id === c.id;
                const hasSubclass = !!c.subclassTag;
                const action = isSelected
                  ? classConfirmed
                    ? { label: 'Change', onClick: () => { setClassConfirmed(false); setSubclassConfirmed(false); onSubclassSelect(null); }, variant: 'secondary' as const }
                    : hasSubclass
                      ? { label: `Choose ${c.subclassLabel}`, onClick: () => setClassConfirmed(true), variant: 'primary' as const }
                      : onConfirm
                        ? { label: 'Select', onClick: () => onConfirm(), variant: 'primary' as const }
                        : undefined
                  : undefined;
                return (
                  <EntityCard
                    key={c.id}
                    name={c.name}
                    selected={isSelected}
                    collapsed={classConfirmed && !isSelected}
                    stats={
                      <>
                        <span>HP {c.hp}</span>
                        <span>{c.keyAbilityOptions.map(k => ABILITY_ABBR[k]).join('/')}</span>
                      </>
                    }
                    onClick={() => !classConfirmed && selectClass(c)}
                    onDoubleClick={() => {
                      if (classConfirmed) return;
                      selectClass(c);
                      if (hasSubclass) setClassConfirmed(true);
                      else onConfirm?.();
                    }}
                    action={action}
                  />
                );
              })}
            </div>
          </RaritySection>
        );
      })}
    </PickerLayout>
  );

  return (
    <div className={classConfirmed && selectedRecord?.subclassTag ? styles.splitLayout : styles.singleLayout}>
      {classPicker}
      {classConfirmed && selectedRecord?.subclassTag && (
        <div className={styles.subclassWrap}>
          <div className={styles.subclassHeading}>
            <span className={styles.subclassTitle}>Choose {selectedRecord.subclassLabel}</span>
          </div>
          <WizardStepSubclass
            subclassTag={selectedRecord.subclassTag}
            subclassLabel={selectedRecord.subclassLabel!}
            selected={subclass}
            onSelect={onSubclassSelect}
            confirmed={subclassConfirmed}
            onConfirm={() => { setSubclassConfirmed(true); onConfirm?.(); }}
            onDeconfirm={() => { setSubclassConfirmed(false); onSubclassSelect(null); }}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statVal}>{value}</span>
    </div>
  );
}
