import { useState } from 'react';
import type { CharacterAncestryRef, AncestryRecord } from '../../../../db/schema';
import { useAncestryData } from '../../hooks/useAncestryData';
import styles from './WizardStepAncestry.module.css';

interface WizardStepAncestryProps {
  selected: CharacterAncestryRef | null;
  onSelect: (ancestry: CharacterAncestryRef | null) => void;
}

const RARITY_ORDER = ['common', 'uncommon', 'rare'];

export function WizardStepAncestry({ selected, onSelect }: WizardStepAncestryProps) {
  const { ancestries, loading } = useAncestryData();
  const [search, setSearch] = useState('');

  const filtered = ancestries
    .filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.traits.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name);
    });

  const groupedByRarity = RARITY_ORDER.map(rarity => ({
    rarity,
    items: filtered.filter(a => a.rarity === rarity),
  })).filter(g => g.items.length > 0);

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

  return (
    <div className={styles.step}>
      <div className={styles.left}>
        <div className={styles.heading}>
          <h3 className={styles.title}>Choose Ancestry</h3>
          <p className={styles.sub}>Your ancestry determines your heritage options and some ability adjustments.</p>
        </div>
        <input
          className={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ancestries…"
        />
        {loading && <div className={styles.loading}>Loading…</div>}
        {!loading && ancestries.length === 0 && (
          <div className={styles.loading}>
            No ancestry data found. Use the "Sync Now" banner above to download character builder data.
          </div>
        )}
        <div className={styles.groupedList}>
          {groupedByRarity.map(({ rarity, items }) => (
            <div key={rarity} className={styles.rarityGroup}>
              <div className={`${styles.rarityHeader} ${styles[`rarity_${rarity}`]}`}>
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </div>
              <div className={styles.grid}>
                {items.map(a => (
                  <button
                    key={a.id}
                    className={`${styles.card} ${selected?.id === a.id ? styles.cardSelected : ''}`}
                    onClick={() => selectAncestry(a)}
                  >
                    <div className={styles.cardName}>{a.name}</div>
                    <div className={styles.cardStats}>
                      <span>HP {a.hp}</span>
                      <span>Speed {a.speed}</span>
                      <span>{a.size}</span>
                    </div>
                    <div className={styles.traits}>
                      {a.traits.map(t => (
                        <span key={t} className={styles.trait}>{t}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedRecord && (
        <div className={styles.detail}>
          <h4 className={styles.detailName}>{selectedRecord.name}</h4>
          <div className={styles.detailStats}>
            <div className={styles.statRow}><span className={styles.statLabel}>HP</span><span className={styles.statVal}>{selectedRecord.hp}</span></div>
            <div className={styles.statRow}><span className={styles.statLabel}>Speed</span><span className={styles.statVal}>{selectedRecord.speed} ft.</span></div>
            <div className={styles.statRow}><span className={styles.statLabel}>Size</span><span className={styles.statVal}>{selectedRecord.size}</span></div>
            <div className={styles.statRow}><span className={styles.statLabel}>Vision</span><span className={styles.statVal}>{selectedRecord.vision}</span></div>
          </div>
          <div className={styles.detailSection}>
            <div className={styles.detailSectionLabel}>Ability Adjustments</div>
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
          </div>
          <div className={styles.detailSection}>
            <div className={styles.detailSectionLabel}>Languages</div>
            <div className={styles.langList}>
              {selectedRecord.languages.map(l => <span key={l} className={styles.lang}>{l}</span>)}
            </div>
          </div>
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
