import { useState } from 'react';
import type { CharacterBackgroundRef, BackgroundRecord } from '../../../../db/schema';
import { useBackgroundData } from '../../hooks/useBackgroundData';
import styles from './WizardStepBackground.module.css';

interface WizardStepBackgroundProps {
  selected: CharacterBackgroundRef | null;
  onSelect: (background: CharacterBackgroundRef | null) => void;
}

export function WizardStepBackground({ selected, onSelect }: WizardStepBackgroundProps) {
  const { backgrounds, loading } = useBackgroundData();
  const [search, setSearch] = useState('');

  const filtered = backgrounds.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className={styles.step}>
      <div className={styles.left}>
        <div className={styles.heading}>
          <h3 className={styles.title}>Choose Background</h3>
          <p className={styles.sub}>Your background describes your life before adventuring.</p>
        </div>
        <input
          className={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search backgrounds…"
        />
        {loading && <div className={styles.loading}>Loading…</div>}
        <div className={styles.grid}>
          {filtered.map(b => (
            <button
              key={b.id}
              className={`${styles.card} ${selected?.id === b.id ? styles.cardSelected : ''}`}
              onClick={() => selectBackground(b)}
            >
              <div className={styles.cardName}>{b.name}</div>
              <div className={styles.cardSkills}>
                {b.trainedSkills.map(s => (
                  <span key={s} className={styles.skillBadge}>{s}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedRecord && (
        <div className={styles.detail}>
          <h4 className={styles.detailName}>{selectedRecord.name}</h4>
          <p className={styles.description}>{selectedRecord.description}</p>
          <div className={styles.detailSection}>
            <div className={styles.detailSectionLabel}>Trained Skills</div>
            <div className={styles.skillList}>
              {selectedRecord.trainedSkills.map(s => (
                <span key={s} className={styles.skillBadge}>{s}</span>
              ))}
              {selectedRecord.trainedLoreSkills.map(s => (
                <span key={s} className={`${styles.skillBadge} ${styles.loreBadge}`}>{s} Lore</span>
              ))}
            </div>
          </div>
          <div className={styles.detailSection}>
            <div className={styles.detailSectionLabel}>Ability Boosts</div>
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
          </div>
          {selectedRecord.grantedFeat && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionLabel}>Granted Feat</div>
              <span className={styles.grantedFeat}>{selectedRecord.grantedFeat.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
