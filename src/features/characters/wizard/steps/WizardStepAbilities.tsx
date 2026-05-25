import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import type { BoostChoicesByLevel, AbilityKey } from '../../../../db/schema';
import { AbilityBoostPicker } from '../AbilityBoostPicker';
import { computeAbilityScores, ALL_ABILITIES, ABILITY_ABBR } from '../../utils/abilityComputation';
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

  // Fixed ancestry boosts (explicitly defined single-entry pairs)
  const ancestryFixed: AbilityKey[] = fixedBoosts
    .filter(pair => pair.length === 1)
    .map(pair => pair[0]);

  // Background
  const bgOptions = background?.boostOptions ?? [];
  const bgFreeBoostCount = background?.freeBoostCount ?? 0;
  const bgPair = bgOptions[0] ?? []; // constrained pair (e.g. [int, wis])
  // Total background boosts = 1 constrained (if pair exists) + free boosts
  const bgTotalCount = (bgPair.length > 0 ? 1 : 0) + bgFreeBoostCount;
  // All currently chosen background abilities combined
  const bgChosen: AbilityKey[] = [
    ...(bc.backgroundBoost ? [bc.backgroundBoost] : []),
    ...(bc.backgroundFreeBoost ? [bc.backgroundFreeBoost] : []),
  ];
  // Abilities restricted to the bg pair (everything NOT in bgPair is off-limits for slot 0)
  const bgRestrictedAbilities: AbilityKey[] = bgPair.length > 0
    ? ALL_ABILITIES.filter(a => !bgPair.includes(a))
    : [];

  function updateAncestryBoosts(chosen: AbilityKey[]) {
    onChange({ ...bc, ancestryBoosts: chosen });
  }

  function updateBgBoosts(chosen: AbilityKey[]) {
    // First chosen ability goes to the constrained slot (must be in bgPair if it exists),
    // second goes to the free slot.
    const [first = null, second = null] = chosen;
    onChange({
      ...bc,
      backgroundBoost: bgPair.length > 0 ? first : null,
      backgroundFreeBoost: bgPair.length > 0 ? second : first,
    });
  }

  function updateLevel1Free(chosen: AbilityKey[]) {
    onChange({ ...bc, level1FreeBoosts: chosen });
  }

  function updateLevelBoosts(levelKey: keyof BoostChoicesByLevel, chosen: AbilityKey[]) {
    onChange({ ...bc, [levelKey]: chosen });
  }

  // For background picker: abilities that are off-limits because the constrained
  // slot is already filled and this ability wasn't chosen for it.
  // We derive this dynamically: if the first chosen is set and it came from bgPair,
  // then the restriction on non-bgPair abilities only blocks the second pick.
  // Simpler: pass bgRestrictedAbilities only when the constrained slot isn't yet filled.
  const bgConstrainedFilled = bgPair.length > 0 && bc.backgroundBoost !== null;
  const bgDisabled = bgConstrainedFilled ? [] : bgRestrictedAbilities;

  return (
    <div className={styles.step}>
      <div className={styles.totals}>
        {ALL_ABILITIES.map(a => {
          const score = scores[a];
          const mod = abilityMod(score);
          return (
            <div key={a} className={styles.scoreRow}>
              <span className={styles.scoreName}>{ABILITY_ABBR[a]}</span>
              <span className={styles.scoreNum}>{score}</span>
              <span className={styles.scoreMod}>{formatMod(mod)}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.groups}>
        <h3 className={styles.title}>Ability Boosts</h3>

        {ancestry && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Ancestry: {ancestry.name}</div>
            {ancestryFixed.length > 0 && (
              <div className={styles.sectionHint}>
                Fixed boosts are shown in green. Choose {ancestry.freeBoostCount > 1 ? `${ancestry.freeBoostCount} more` : 'one more'}.
              </div>
            )}
            <AbilityBoostPicker
              count={ancestry.freeBoostCount ?? 0}
              chosen={bc.ancestryBoosts}
              lockedBoosts={ancestryFixed}
              lockedFlaws={flaw ? [flaw] : []}
              onChange={updateAncestryBoosts}
            />
          </section>
        )}

        {background && bgTotalCount > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Background: {background.name}</div>
            {bgPair.length > 0 && (
              <div className={styles.sectionHint}>
                First pick must be {bgPair.map(k => k.toUpperCase()).join(' or ')}.
              </div>
            )}
            <AbilityBoostPicker
              count={bgTotalCount}
              chosen={bgChosen}
              disabledInOtherGroups={bgDisabled}
              onChange={updateBgBoosts}
            />
          </section>
        )}

        {draft.class?.keyAbilityOptions && bc.classKeyAbility && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Class: {draft.class.name}</div>
            <div className={styles.sectionHint}>Key ability is set on the Class step.</div>
            <AbilityBoostPicker
              count={0}
              chosen={[]}
              lockedBoosts={[bc.classKeyAbility]}
              onChange={() => {}}
            />
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Free Boosts (Level 1)</div>
          <div className={styles.sectionHint}>Choose any 4 different abilities.</div>
          <AbilityBoostPicker
            count={4}
            chosen={bc.level1FreeBoosts}
            onChange={updateLevel1Free}
          />
        </section>

        {level >= 5 && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>Level 5 Boosts</div>
            <AbilityBoostPicker
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
              count={4}
              chosen={bc.level20}
              onChange={chosen => updateLevelBoosts('level20', chosen)}
            />
          </section>
        )}
      </div>
    </div>
  );
}
