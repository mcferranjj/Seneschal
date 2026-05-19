import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import type { BoostChoicesByLevel, AbilityKey } from '../../../../db/schema';
import { AbilityBoostPicker } from '../AbilityBoostPicker';
import { computeAbilityScores, ALL_ABILITIES, ABILITY_ABBR, ABILITY_LABELS } from '../../utils/abilityComputation';
import { abilityMod, formatMod } from '../../utils/proficiency';
import styles from './WizardStepAbilities.module.css';

interface WizardStepAbilitiesProps {
  draft: CharacterDraft;
  onChange: (boostChoices: BoostChoicesByLevel) => void;
}

export function WizardStepAbilities({ draft, onChange }: WizardStepAbilitiesProps) {
  const { ancestry, background, boostChoices, level } = draft;
  const bc = boostChoices;

  // Compute current scores for preview
  const fixedBoosts = ancestry?.fixedBoosts ?? [];
  const flaw = ancestry?.flaw ?? null;
  const scores = computeAbilityScores(bc, fixedBoosts, flaw, level);

  // Fixed ancestry boosts (the explicitly defined pairs with single entries)
  const ancestryFixed: AbilityKey[] = fixedBoosts
    .filter(pair => pair.length === 1)
    .map(pair => pair[0]);

  // For the ancestry free boosts, collect all chosen so far to disable in each slot
  const ancestryFreeCount = ancestry?.freeBoostCount ?? 0;

  // Background boost options — boostOptions holds constrained choices only;
  // freeBoostCount indicates how many unconstrained free boosts the background grants.
  const bgOptions = background?.boostOptions ?? [];
  const bgFreeBoostCount = background?.freeBoostCount ?? 0;
  // bgOptions[0] = the pair choice (e.g. [int, wis])
  const bgPair = bgOptions[0] ?? [];

  function updateAncestryBoosts(chosen: AbilityKey[]) {
    onChange({ ...bc, ancestryBoosts: chosen });
  }

  function updateBgBoost(chosen: AbilityKey[]) {
    onChange({ ...bc, backgroundBoost: chosen[0] ?? null });
  }

  function updateBgFreeBoost(chosen: AbilityKey[]) {
    onChange({ ...bc, backgroundFreeBoost: chosen[0] ?? null });
  }

  function updateLevel1Free(chosen: AbilityKey[]) {
    onChange({ ...bc, level1FreeBoosts: chosen });
  }

  function updateLevelBoosts(levelKey: keyof BoostChoicesByLevel, chosen: AbilityKey[]) {
    onChange({ ...bc, [levelKey]: chosen });
  }

  return (
    <div className={styles.step}>
      <div className={styles.groups}>
        <h3 className={styles.title}>Ability Boosts</h3>

        {ancestry && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Ancestry: {ancestry.name}</div>
            <AbilityBoostPicker
              label="Ancestry Boosts"
              count={ancestryFreeCount}
              chosen={bc.ancestryBoosts}
              lockedBoosts={ancestryFixed}
              lockedFlaws={flaw ? [flaw] : []}
              onChange={updateAncestryBoosts}
            />
          </section>
        )}

        {background && (bgPair.length > 0 || bgFreeBoostCount > 0) && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Background: {background.name}</div>
            <div className={styles.bgBoosts}>
              {bgPair.length > 0 && (
                <AbilityBoostPicker
                  label={`Pick one: ${bgPair.map(k => k.toUpperCase()).join(' or ')}`}
                  count={1}
                  chosen={bc.backgroundBoost ? [bc.backgroundBoost] : []}
                  disabledInOtherGroups={bgPair.length > 0 ? ALL_ABILITIES.filter(a => !bgPair.includes(a)) : []}
                  onChange={updateBgBoost}
                />
              )}
              {bgFreeBoostCount > 0 && (
                <AbilityBoostPicker
                  label="Free Background Boost"
                  count={1}
                  chosen={bc.backgroundFreeBoost ? [bc.backgroundFreeBoost] : []}
                  disabledInOtherGroups={bc.backgroundBoost ? [bc.backgroundBoost] : []}
                  onChange={updateBgFreeBoost}
                />
              )}
            </div>
          </section>
        )}

        {draft.class?.keyAbilityOptions && bc.classKeyAbility && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Class: {draft.class.name}</div>
            <div className={styles.lockedBoostRow}>
              <span className={styles.sectionLabel}>Key Ability (locked)</span>
              <span className={styles.lockedChip}>{ABILITY_ABBR[bc.classKeyAbility]}</span>
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Free Boosts (Level 1)</div>
          <p className={styles.sectionHint}>Choose 4 different ability boosts.</p>
          <AbilityBoostPicker
            label="4 Free Boosts"
            count={4}
            chosen={bc.level1FreeBoosts}
            onChange={updateLevel1Free}
          />
        </section>

        {level >= 5 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Level 5 Boosts</div>
            <AbilityBoostPicker
              label="4 Boosts at Level 5"
              count={4}
              chosen={bc.level5}
              onChange={chosen => updateLevelBoosts('level5', chosen)}
            />
          </section>
        )}

        {level >= 10 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Level 10 Boosts</div>
            <AbilityBoostPicker
              label="4 Boosts at Level 10"
              count={4}
              chosen={bc.level10}
              onChange={chosen => updateLevelBoosts('level10', chosen)}
            />
          </section>
        )}

        {level >= 15 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Level 15 Boosts</div>
            <AbilityBoostPicker
              label="4 Boosts at Level 15"
              count={4}
              chosen={bc.level15}
              onChange={chosen => updateLevelBoosts('level15', chosen)}
            />
          </section>
        )}

        {level >= 20 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Level 20 Boosts</div>
            <AbilityBoostPicker
              label="4 Boosts at Level 20"
              count={4}
              chosen={bc.level20}
              onChange={chosen => updateLevelBoosts('level20', chosen)}
            />
          </section>
        )}
      </div>

      <div className={styles.totals}>
        <div className={styles.totalsTitle}>Ability Scores</div>
        {ALL_ABILITIES.map(a => {
          const score = scores[a];
          const mod = abilityMod(score);
          return (
            <div key={a} className={styles.scoreRow}>
              <span className={styles.scoreName}>{ABILITY_ABBR[a]}</span>
              <span className={styles.scoreLabel}>{ABILITY_LABELS[a].slice(0, 3)}</span>
              <span className={styles.scoreNum}>{score}</span>
              <span className={styles.scoreMod}>{formatMod(mod)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
