import type { AncestryRecord } from '../../../../db/schema';
import { DetailPanel, DetailSection } from '../shared/DetailPanel';
import { FoundryHtml } from '../shared/FoundryHtml';
import { titleCase } from '../../../../utils/strings';
import { SIZE_LABELS } from '../../../../data/pf2eConstants';
import styles from './WizardStepAncestry.module.css';

export interface AncestryDetailProps {
  record: AncestryRecord;
  /** Optional HTML transform applied after Foundry macro stripping. */
  descriptionTransform?: (cleaned: string) => string;
}

/**
 * Right-column detail card for an ancestry. Extracted from
 * `WizardStepAncestry` so the picker file can focus on list/selection
 * behaviour and so this view is easy to render in isolation (storybook,
 * tests, etc).
 */
export function AncestryDetail({ record, descriptionTransform }: AncestryDetailProps) {
  return (
    <DetailPanel name={record.name} className={styles.detailPanel}>
      <div className={styles.detailStats}>
        <Stat label="HP"    value={record.hp} />
        <Stat label="Speed" value={`${record.speed} ft.`} />
        <Stat label="Size"  value={SIZE_LABELS[record.size] ?? record.size} />
        <Stat label="Vision" value={record.vision} />
      </div>

      <DetailSection label="Ability Adjustments">
        <div className={styles.boostInfo}>
          {record.boosts.fixed.map((pair, i) =>
            pair.length === 1
              ? <span key={i} className={styles.boostChip}>{pair[0].toUpperCase()} ▲</span>
              : <span key={i} className={styles.boostChipOr}>{pair.map(k => k.toUpperCase()).join(' or ')}</span>
          )}
          {Array.from({ length: record.boosts.freeCount }).map((_, i) => (
            <span key={`free-${i}`} className={styles.boostChipFree}>Free Boost</span>
          ))}
          {record.boosts.flaw && (
            <span className={styles.flawChip}>{record.boosts.flaw.toUpperCase()} ▼</span>
          )}
        </div>
      </DetailSection>

      <DetailSection label="Languages">
        <div className={styles.langList}>
          {record.languages.map(l => <span key={l} className={styles.lang}>{titleCase(l)}</span>)}
        </div>
        {record.additionalLanguages.options.length > 0 && (
          <p className={styles.addLangNote}>
            Additional languages equal to your <strong>Intelligence modifier</strong> (if it's positive). Choose from{' '}
            {record.additionalLanguages.options.map(titleCase).join(', ')}
            , and any other languages to which you have access (such as the languages prevalent in your region).
          </p>
        )}
      </DetailSection>

      <DetailSection label="Traits">
        <div className={styles.traits}>
          {record.traits.map(t => <span key={t} className={styles.trait}>{t}</span>)}
        </div>
      </DetailSection>

      {record.description && (
        <DetailSection label="Description">
          <FoundryHtml html={record.description} transform={descriptionTransform} />
        </DetailSection>
      )}

      {record.publication && (
        <DetailSection label="Source">
          <div className={styles.source}>{record.publication}</div>
        </DetailSection>
      )}
    </DetailPanel>
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
