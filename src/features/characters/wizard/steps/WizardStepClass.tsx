import { useEffect, useState } from 'react';
import type { CharacterClassRef, CharacterSubclassRef, ClassRecord, AbilityKey, ClassFeatureItem } from '../../../../db/schema';
import { useClassData } from '../../hooks/useClassData';
import { useFeatData } from '../../hooks/useFeatData';
import { ABILITY_LABELS, ABILITY_ABBR } from '../../utils/abilityComputation';
import { PickerLayout } from '../shared/PickerLayout';
import { EntityCard } from '../shared/EntityCard';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { FoundryHtml } from '../shared/FoundryHtml';
import { RaritySection } from '../shared/RaritySection';
import { groupByRarity, RARITY_ORDER } from '../shared/groupByRarity';
import { usePickerSearch } from '../shared/usePickerSearch';
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
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  // Mirror the lineage two-panel pattern: confirm class → subclass picker slides in
  const [classConfirmed, setClassConfirmed] = useState<boolean>(!!subclass);

  useEffect(() => {
    if (subclass) setClassConfirmed(true);
  }, [subclass]);

  useEffect(() => {
    if (!selected) setClassConfirmed(false);
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
        <ClassFeatureTable
          cls={selectedRecord}
          feats={feats}
          expandedFeature={expandedFeature}
          onToggle={key => setExpandedFeature(prev => prev === key ? null : key)}
        />
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
                    ? { label: 'Change', onClick: () => { setClassConfirmed(false); onSubclassSelect(null); }, variant: 'secondary' as const }
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
            onConfirm={onConfirm}
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

// ── Feature-level table ────────────────────────────────────────────────────────

interface AutoEntry {
  key: string;
  name: string;
  kind: 'feat-slot' | 'skill-increase';
}

function buildAutoEntries(cls: ClassRecord): Map<number, AutoEntry[]> {
  const map = new Map<number, AutoEntry[]>();

  function add(level: number, entry: AutoEntry) {
    if (!map.has(level)) map.set(level, []);
    map.get(level)!.push(entry);
  }

  for (const lv of cls.ancestryFeatLevels)  add(lv, { key: `ancestry-feat-${lv}`,  name: 'Ancestry Feat',  kind: 'feat-slot' });
  for (const lv of cls.classFeatLevels)     add(lv, { key: `class-feat-${lv}`,     name: 'Class Feat',     kind: 'feat-slot' });
  for (const lv of cls.generalFeatLevels)   add(lv, { key: `general-feat-${lv}`,   name: 'General Feat',   kind: 'feat-slot' });
  for (const lv of cls.skillFeatLevels)     add(lv, { key: `skill-feat-${lv}`,     name: 'Skill Feat',     kind: 'feat-slot' });
  for (const lv of cls.skillIncreaseLevels) add(lv, { key: `skill-increase-${lv}`, name: 'Skill Increase', kind: 'skill-increase' });

  return map;
}

interface ClassFeatureTableProps {
  cls: ClassRecord;
  feats: import('../../../../db/schema').FeatRecord[];
  expandedFeature: string | null;
  onToggle: (key: string) => void;
}

function ClassFeatureTable({ cls, feats, expandedFeature, onToggle }: ClassFeatureTableProps) {
  const featByName = new Map(feats.filter(f => f.category === 'classfeature').map(f => [f.name, f]));
  const autoByLevel = buildAutoEntries(cls);

  // Group class features by level
  const featuresByLevel = new Map<number, ClassFeatureItem[]>();
  for (const feat of cls.features) {
    if (!featuresByLevel.has(feat.level)) featuresByLevel.set(feat.level, []);
    featuresByLevel.get(feat.level)!.push(feat);
  }

  return (
    <div className={styles.featureTable}>
      {Array.from({ length: 20 }, (_, i) => i + 1).map(level => {
        const classFeatures = featuresByLevel.get(level) ?? [];
        const autoEntries   = autoByLevel.get(level) ?? [];
        if (classFeatures.length === 0 && autoEntries.length === 0) return null;

        return (
          <div key={level} className={styles.featureLevel}>
            <div className={styles.featureLevelHeader}>
              <span className={styles.featureLevelNum}>{level}</span>
            </div>
            <div className={styles.featureLevelEntries}>
              {classFeatures.map(feature => {
                const record  = featByName.get(feature.name);
                const entryKey = `${level}-${feature.name}`;
                const isOpen   = expandedFeature === entryKey;
                return (
                  <div key={feature.name} className={styles.featureEntry}>
                    <button
                      type="button"
                      className={`${styles.featureEntryBtn} ${record ? styles.featureEntryClickable : ''}`}
                      onClick={() => record && onToggle(entryKey)}
                      disabled={!record}
                    >
                      <span className={styles.featureEntryName}>{feature.name}</span>
                      {record && (
                        <span className={styles.featureEntryChevron}>{isOpen ? '▲' : '▼'}</span>
                      )}
                    </button>
                    {isOpen && record && (
                      <div className={styles.featureEntryDetail}>
                        {record.prerequisites.length > 0 && (
                          <div className={styles.featureEntryPrereqs}>
                            <span className={styles.featureEntryPrereqLabel}>Prerequisites: </span>
                            {record.prerequisites.join(', ')}
                          </div>
                        )}
                        <FoundryHtml html={record.description} />
                      </div>
                    )}
                  </div>
                );
              })}
              {autoEntries.map(entry => (
                <div key={entry.key} className={styles.featureEntry}>
                  <div className={`${styles.featureEntryBtn} ${styles.featureEntryAuto}`}>
                    <span className={styles.featureEntryName}>{entry.name}</span>
                    <span className={`${styles.featureEntryKindBadge} ${styles[`kind_${entry.kind}`]}`}>
                      {entry.kind === 'feat-slot' ? 'Feat' : 'Skill'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
