import { useState } from 'react';
import type { CharacterClassRef, ClassRecord, AbilityKey } from '../../../../db/schema';
import { useClassData } from '../../hooks/useClassData';
import { ABILITY_LABELS, ABILITY_ABBR } from '../../utils/abilityComputation';
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

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
    rank >= 3 ? 'Legendary' : rank >= 2 ? 'Master' : rank >= 1 ? 'Expert' : 'Trained';

  return (
    <div className={styles.step}>
      <div className={styles.left}>
        <div className={styles.heading}>
          <h3 className={styles.title}>Choose Class</h3>
          <p className={styles.sub}>Your class determines your role and abilities in combat.</p>
        </div>
        <input
          className={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search classes…"
        />
        {loading && <div className={styles.loading}>Loading…</div>}
        <div className={styles.grid}>
          {filtered.map(c => (
            <button
              key={c.id}
              className={`${styles.card} ${selected?.id === c.id ? styles.cardSelected : ''}`}
              onClick={() => selectClass(c)}
            >
              <div className={styles.cardName}>{c.name}</div>
              <div className={styles.cardStats}>
                <span>HP {c.hp}</span>
                <span>{c.keyAbilityOptions.map(k => ABILITY_ABBR[k]).join('/')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedRecord && (
        <div className={styles.detail}>
          <h4 className={styles.detailName}>{selectedRecord.name}</h4>

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
            <div className={styles.detailSection}>
              <div className={styles.detailSectionLabel}>Trained Skills</div>
              <div className={styles.skillList}>
                {selectedRecord.trainedSkills.map(s => (
                  <span key={s} className={styles.skillBadge}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.detailSection}>
            <div className={styles.detailSectionLabel}>Key Ability</div>
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
          </div>
        </div>
      )}
    </div>
  );
}
