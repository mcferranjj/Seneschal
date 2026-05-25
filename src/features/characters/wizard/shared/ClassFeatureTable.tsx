import { useMemo, useState } from 'react';
import type { ClassRecord, ClassFeatureItem, FeatRecord } from '../../../../db/schema';
import { FoundryHtml } from './FoundryHtml';
import styles from './ClassFeatureTable.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutoEntry {
  key: string;
  name: string;
  kind: 'feat-slot' | 'skill-increase';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a map of level → auto-entries (feat slots and skill increases) derived
 * from the class's progression arrays.  Pure function — suitable for memoization.
 */
export function buildAutoEntries(cls: ClassRecord): Map<number, AutoEntry[]> {
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

// ── Component ─────────────────────────────────────────────────────────────────

interface ClassFeatureTableProps {
  cls: ClassRecord;
  /** All feat records — the table filters to classfeature category internally. */
  feats: FeatRecord[];
}

/**
 * Renders a level-by-level table of class features and automatic feat/skill
 * slots for a given class.  Rows are expandable to show full feature descriptions.
 */
export function ClassFeatureTable({ cls, feats }: ClassFeatureTableProps) {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const featByName = useMemo(
    () => new Map(feats.filter(f => f.category === 'classfeature').map(f => [f.name, f])),
    [feats],
  );

  const featuresByLevel = useMemo(() => {
    const map = new Map<number, ClassFeatureItem[]>();
    for (const feat of cls.features) {
      if (!map.has(feat.level)) map.set(feat.level, []);
      map.get(feat.level)!.push(feat);
    }
    return map;
  }, [cls.features]);

  const autoByLevel = useMemo(() => buildAutoEntries(cls), [cls]);

  function toggle(key: string) {
    setExpandedFeature(prev => (prev === key ? null : key));
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
                const record   = featByName.get(feature.name);
                const entryKey = `${level}-${feature.name}`;
                const isOpen   = expandedFeature === entryKey;
                return (
                  <div key={feature.name} className={styles.featureEntry}>
                    <button
                      type="button"
                      className={`${styles.featureEntryBtn} ${record ? styles.featureEntryClickable : ''}`}
                      onClick={() => record && toggle(entryKey)}
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
