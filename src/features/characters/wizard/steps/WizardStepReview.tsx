import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import { computeAbilityScores, ALL_ABILITIES, ABILITY_ABBR, ABILITY_LABELS } from '../../utils/abilityComputation';
import { computeDerivedStats } from '../../utils/derivedStats';
import { abilityMod, formatMod, RANK_ABBR } from '../../utils/proficiency';
import { STANDARD_SKILLS } from '../../utils/skillHelpers';
import styles from './WizardStepReview.module.css';

interface WizardStepReviewProps {
  draft: CharacterDraft;
  onFinish: () => void;
  saving: boolean;
}

export function WizardStepReview({ draft, onFinish, saving }: WizardStepReviewProps) {
  const fixedBoosts = draft.ancestry?.fixedBoosts ?? [];
  const flaw = draft.ancestry?.flaw ?? null;
  const scores = computeAbilityScores(draft.boostChoices, fixedBoosts, flaw, draft.level);
  const derived = computeDerivedStats(scores, draft.class, draft.ancestry, draft.level);

  return (
    <div className={styles.step}>
      <div className={styles.heading}>
        <h3 className={styles.title}>Review Character</h3>
        <p className={styles.sub}>Review your choices before creating your character.</p>
      </div>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Identity</div>
          <div className={styles.reviewRow}><span className={styles.label}>Name</span><span className={styles.val}>{draft.name || '—'}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Player</span><span className={styles.val}>{draft.playerName || '—'}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Level</span><span className={styles.val}>{draft.level}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Ancestry</span><span className={styles.val}>{draft.ancestry?.name ?? '—'}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Heritage</span><span className={styles.val}>{draft.heritage?.name ?? '—'}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Background</span><span className={styles.val}>{draft.background?.name ?? '—'}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Class</span><span className={styles.val}>{draft.class?.name ?? '—'}</span></div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Ability Scores</div>
          {ALL_ABILITIES.map(a => {
            const score = scores[a];
            const mod = abilityMod(score);
            return (
              <div key={a} className={styles.reviewRow}>
                <span className={styles.label}>{ABILITY_LABELS[a]}</span>
                <span className={styles.val}>
                  <span className={styles.score}>{score}</span>
                  <span className={styles.mod}>{formatMod(mod)}</span>
                </span>
              </div>
            );
          })}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Derived Stats</div>
          <div className={styles.reviewRow}><span className={styles.label}>Max HP</span><span className={styles.val}>{derived.maxHp}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>AC</span><span className={styles.val}>{derived.ac}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Perception</span><span className={styles.val}>{formatMod(derived.perception)}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Fortitude</span><span className={styles.val}>{formatMod(derived.fort)}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Reflex</span><span className={styles.val}>{formatMod(derived.ref)}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Will</span><span className={styles.val}>{formatMod(derived.will)}</span></div>
          <div className={styles.reviewRow}><span className={styles.label}>Class DC</span><span className={styles.val}>{derived.classDC}</span></div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Trained Skills</div>
          {STANDARD_SKILLS.filter(s => draft.skills[s.key] >= 1).map(s => (
            <div key={s.key} className={styles.reviewRow}>
              <span className={styles.label}>{s.label}</span>
              <span className={styles.val}>
                <span className={`${styles.rankBadge} ${styles['rank' + RANK_ABBR[draft.skills[s.key]]]}`}>
                  {RANK_ABBR[draft.skills[s.key]]}
                </span>
              </span>
            </div>
          ))}
          {STANDARD_SKILLS.filter(s => draft.skills[s.key] >= 1).length === 0 && (
            <span className={styles.none}>None selected</span>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Feats</div>
          {draft.feats.filter(f => f.featId).map(f => (
            <div key={`${f.slotType}-${f.level}`} className={styles.reviewRow}>
              <span className={styles.label}>Lv. {f.level} {f.slotType}</span>
              <span className={styles.val}>{f.featName}</span>
            </div>
          ))}
          {draft.feats.filter(f => f.featId).length === 0 && (
            <span className={styles.none}>No feats selected</span>
          )}
        </section>
      </div>
    </div>
  );
}
