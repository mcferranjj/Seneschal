import { useEffect, useState } from 'react';
import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import type { CharacterAncestryRef, CharacterHeritageRef } from '../../../../db/schema';
import { WizardStepAncestry } from './WizardStepAncestry';
import { WizardStepHeritage } from './WizardStepHeritage';
import styles from './WizardStepLineage.module.css';

interface WizardStepLineageProps {
  draft: CharacterDraft;
  onChange: (patch: Partial<CharacterDraft>) => void;
  onAncestrySelect: (a: CharacterAncestryRef | null) => void;
  onHeritageSelect: (h: CharacterHeritageRef | null) => void;
  /** Advance to the next wizard step. Used when a heritage is "Selected". */
  onAdvance?: () => void;
}

export function WizardStepLineage({
  draft,
  onChange,
  onAncestrySelect,
  onHeritageSelect,
  onAdvance,
}: WizardStepLineageProps) {
  // Whether the user has "locked in" the highlighted ancestry. While not
  // confirmed, the full ancestry list is visible and the heritage picker is
  // hidden. Once confirmed, only the chosen ancestry card remains and the
  // heritage list takes over the visual focus.
  const [ancestryConfirmed, setAncestryConfirmed] = useState<boolean>(!!draft.heritage);

  // If the user already had a heritage picked (e.g. coming back to this step),
  // keep the ancestry confirmed automatically.
  useEffect(() => {
    if (draft.heritage) setAncestryConfirmed(true);
  }, [draft.heritage]);

  // If the ancestry is cleared entirely, drop back to the un-confirmed state.
  useEffect(() => {
    if (!draft.ancestry) setAncestryConfirmed(false);
  }, [draft.ancestry]);

  return (
    <div className={styles.step}>
      {/* Info Row */}
      <div className={styles.infoSection}>
        <div className={styles.heading}>
          <h3 className={styles.title}>Build Your Character</h3>
          <p className={styles.sub}>Enter your name and choose your ancestry and heritage.</p>
        </div>

        <div className={styles.infoForm}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Character Name</span>
            <input
              className={styles.input}
              value={draft.name}
              onChange={e => onChange({ name: e.target.value })}
              onFocus={e => {
                // Auto-select the default "Unnamed" placeholder so typing
                // overwrites it without the user having to delete first.
                if (draft.name === 'Unnamed') e.currentTarget.select();
              }}
              onBlur={() => {
                // Restore the default if the user clears the field entirely.
                if (!draft.name.trim()) onChange({ name: 'Unnamed' });
              }}
              placeholder="e.g. Aldric Ironveil"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Starting Level</span>
            <select
              className={styles.select}
              value={draft.level}
              onChange={e => onChange({ level: parseInt(e.target.value, 10) })}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Pickers Section - heritage only appears after the ancestry is confirmed. */}
      <div className={ancestryConfirmed ? styles.pickerGrid : styles.pickerSection}>
        <WizardStepAncestry
          selected={draft.ancestry}
          onSelect={onAncestrySelect}
          hideHeading={ancestryConfirmed}
          confirmed={ancestryConfirmed}
          onConfirm={() => { if (draft.ancestry) setAncestryConfirmed(true); }}
          onDeconfirm={() => {
            // Reverse the lock-in: bring the full ancestry grid back and
            // discard any heritage choice made under the old ancestry.
            setAncestryConfirmed(false);
            onHeritageSelect(null);
          }}
          // Once a heritage is picked, the heritage panel takes over the
          // right column entirely — suppress the ancestry detail so it
          // doesn't stack above the heritage detail.
          suppressDetailPanel={!!draft.heritage}
        />

        {ancestryConfirmed && draft.ancestry && (
          <div className={styles.heritageWrap}>
            <WizardStepHeritage
              ancestrySlug={draft.ancestry.slug}
              selected={draft.heritage}
              onSelect={onHeritageSelect}
              hideHeading={true}
              // Only the picker that "owns" the right column at any given
              // moment should project content. Heritage takes over as soon
              // as the user clicks a heritage card.
              suppressDetailPanel={!draft.heritage}
              onConfirm={() => onAdvance?.()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
