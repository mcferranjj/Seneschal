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
}

export function WizardStepLineage({
  draft,
  onChange,
  onAncestrySelect,
  onHeritageSelect,
}: WizardStepLineageProps) {
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
            <span className={styles.fieldLabel}>Character Name <span className={styles.required}>*</span></span>
            <input
              className={styles.input}
              value={draft.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="e.g. Aldric Ironveil"
              autoFocus
            />
            {!draft.name.trim() && (
              <span className={styles.hint}>Character name is required to continue.</span>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Player Name</span>
            <input
              className={styles.input}
              value={draft.playerName}
              onChange={e => onChange({ playerName: e.target.value })}
              placeholder="e.g. Joshua"
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

      {/* Pickers Section - side-by-side when both visible */}
      <div className={draft.ancestry ? styles.pickerGrid : styles.pickerSection}>
        <WizardStepAncestry
          selected={draft.ancestry}
          onSelect={onAncestrySelect}
          hideHeading={draft.ancestry ? true : false}
        />

        {draft.ancestry && (
          <WizardStepHeritage
            ancestrySlug={draft.ancestry.slug}
            selected={draft.heritage}
            onSelect={onHeritageSelect}
            hideHeading={true}
          />
        )}
      </div>
    </div>
  );
}
