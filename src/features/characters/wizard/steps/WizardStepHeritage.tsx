import { useState } from 'react';
import type { CharacterHeritageRef, HeritageRecord } from '../../../../db/schema';
import { useHeritageData } from '../../hooks/useHeritageData';
import styles from './WizardStepHeritage.module.css';

interface WizardStepHeritageProps {
  ancestrySlug: string | undefined;
  selected: CharacterHeritageRef | null;
  onSelect: (heritage: CharacterHeritageRef | null) => void;
}

export function WizardStepHeritage({ ancestrySlug, selected, onSelect }: WizardStepHeritageProps) {
  const { heritages, loading } = useHeritageData(ancestrySlug);
  const [search, setSearch] = useState('');

  const filtered = heritages.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  function selectHeritage(h: HeritageRecord) {
    onSelect({
      id: h.id,
      name: h.name,
      slug: h.id,
      isVersatile: h.isVersatile,
      versatileAncestrySlug: h.isVersatile ? (h.versatileAncestrySlug ?? null) : null,
    });
  }

  const selectedRecord = selected
    ? heritages.find(h => h.id === selected.id) ?? null
    : null;

  if (!ancestrySlug) {
    return (
      <div className={styles.step}>
        <div className={styles.empty}>Please select an ancestry first.</div>
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <div className={styles.left}>
        <div className={styles.heading}>
          <h3 className={styles.title}>Choose Heritage</h3>
          <p className={styles.sub}>Your heritage represents your lineage within your ancestry.</p>
        </div>
        <input
          className={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search heritages…"
        />
        {loading && <div className={styles.loading}>Loading…</div>}
        <div className={styles.grid}>
          {filtered.map(h => (
            <button
              key={h.id}
              className={`${styles.card} ${selected?.id === h.id ? styles.cardSelected : ''}`}
              onClick={() => selectHeritage(h)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{h.name}</span>
                {h.isVersatile && <span className={styles.versatileBadge}>Versatile</span>}
              </div>
              <div className={styles.traits}>
                {h.traits.map(t => (
                  <span key={t} className={styles.trait}>{t}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedRecord && (
        <div className={styles.detail}>
          <div className={styles.detailHeader}>
            <h4 className={styles.detailName}>{selectedRecord.name}</h4>
            {selectedRecord.isVersatile && (
              <span className={styles.versatileBadge}>Versatile</span>
            )}
          </div>
          <p className={styles.description}>{selectedRecord.description}</p>
          <div className={styles.detailSection}>
            <div className={styles.detailSectionLabel}>Traits</div>
            <div className={styles.traits}>
              {selectedRecord.traits.map(t => <span key={t} className={styles.trait}>{t}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
