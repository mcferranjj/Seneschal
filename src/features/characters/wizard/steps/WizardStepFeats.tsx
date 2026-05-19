import { useState } from 'react';
import type { CharacterDraft } from '../../hooks/useCharacterWizard';
import type { FeatChoice, FeatSlotType } from '../../../../db/schema';
import { computeFeatSlots, mergeFeatChoices } from '../../utils/featSlots';
import { FeatBrowser } from '../../feats/FeatBrowser';
import styles from './WizardStepFeats.module.css';

interface WizardStepFeatsProps {
  draft: CharacterDraft;
  onChange: (feats: FeatChoice[]) => void;
}

interface ActiveSlot {
  slotType: FeatSlotType;
  level: number;
}

export function WizardStepFeats({ draft, onChange }: WizardStepFeatsProps) {
  const { class: cls, level, feats } = draft;
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);

  const slots = computeFeatSlots(cls, level);
  const featChoices = mergeFeatChoices(slots, feats);

  function handleAssign(slotType: FeatSlotType, slotLevel: number, featId: string, featName: string) {
    const updated = featChoices.map(fc =>
      fc.slotType === slotType && fc.level === slotLevel
        ? { ...fc, featId, featName }
        : fc
    );
    onChange(updated);
    setActiveSlot(null);
  }

  function handleClear(slotType: FeatSlotType, slotLevel: number) {
    const updated = featChoices.map(fc =>
      fc.slotType === slotType && fc.level === slotLevel
        ? { ...fc, featId: null, featName: null }
        : fc
    );
    onChange(updated);
  }

  const currentFeatId = activeSlot
    ? featChoices.find(fc => fc.slotType === activeSlot.slotType && fc.level === activeSlot.level)?.featId ?? null
    : null;

  const slotTypeLabels: Record<FeatSlotType, string> = {
    ancestry: 'Ancestry',
    class: 'Class',
    general: 'General',
    skill: 'Skill',
    free: 'Free',
  };

  const slotTypeColors: Record<FeatSlotType, string> = {
    ancestry: 'ancestrySlot',
    class: 'classSlot',
    general: 'generalSlot',
    skill: 'skillSlot',
    free: 'freeSlot',
  };

  if (!cls) {
    return (
      <div className={styles.step}>
        <div className={styles.empty}>Please select a class first.</div>
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <div className={styles.left}>
        <div className={styles.heading}>
          <h3 className={styles.title}>Feats</h3>
          <p className={styles.sub}>Select feats for each slot available at your level.</p>
        </div>

        <div className={styles.slotList}>
          {featChoices.map(fc => (
            <div
              key={`${fc.slotType}-${fc.level}`}
              className={`${styles.slotRow} ${activeSlot?.slotType === fc.slotType && activeSlot?.level === fc.level ? styles.slotActive : ''}`}
            >
              <div className={styles.slotMeta}>
                <span className={`${styles.slotType} ${styles[slotTypeColors[fc.slotType]]}`}>
                  {slotTypeLabels[fc.slotType]}
                </span>
                <span className={styles.slotLevel}>Lv. {fc.level}</span>
              </div>
              <div className={styles.slotFeat}>
                {fc.featId ? (
                  <span className={styles.featName}>{fc.featName}</span>
                ) : (
                  <span className={styles.empty}>— Choose a feat —</span>
                )}
              </div>
              <div className={styles.slotActions}>
                <button
                  className={styles.chooseBtn}
                  onClick={() => setActiveSlot({ slotType: fc.slotType, level: fc.level })}
                >
                  {fc.featId ? 'Change' : 'Choose'}
                </button>
                {fc.featId && (
                  <button
                    className={styles.clearBtn}
                    onClick={() => handleClear(fc.slotType, fc.level)}
                    title="Clear feat"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          {featChoices.length === 0 && (
            <div className={styles.noSlots}>
              No feat slots at level {level}. Increase your level to unlock feat slots.
            </div>
          )}
        </div>
      </div>

      {activeSlot && (
        <FeatBrowser
          slotType={activeSlot.slotType}
          slotLevel={activeSlot.level}
          currentFeatId={currentFeatId}
          onAssign={(featId, featName) =>
            handleAssign(activeSlot.slotType, activeSlot.level, featId, featName)
          }
          onClose={() => setActiveSlot(null)}
          ancestrySlug={draft.ancestry?.slug}
          classSlug={draft.class?.slug}
          versatileAncestrySlug={draft.heritage?.versatileAncestrySlug ?? undefined}
        />
      )}
    </div>
  );
}
