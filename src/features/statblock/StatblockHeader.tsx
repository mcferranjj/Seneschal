/**
 * StatblockHeader
 *
 * Renders the name row, level/type row, scale dropdown, action buttons
 * (AoN link, edit, copy, close), and the notes toggle button.
 * Extracted from StatblockContent to improve readability and testability.
 */
import { useState, useEffect } from 'react';
import type { CreatureRecord } from '../../db/schema';
import type { PF2ECreature } from '../../types/pf2e';
import { eliteWeakLevel } from '../../utils/levelScaling';
import styles from './StatblockDrawer.module.css';

interface StatblockHeaderProps {
  creature: CreatureRecord;
  c: PF2ECreature;
  level: number;
  size: string;
  isHazard: boolean;
  isComplex: boolean;
  aonURL: string | null;
  effectiveScaledLevel: number | undefined;
  activeEliteWeak?: 'elite' | 'weak';
  notesOpen: boolean;
  activeNotes?: string;
  hasCustomName: boolean;
  displayName: string;
  onClose: () => void;
  onEdit?: (creature: CreatureRecord) => void;
  onCopyAsCustom?: (creature: CreatureRecord) => void;
  onSetScaledLevel?: (level: number | undefined) => void;
  onSetPreviewScaledLevel: (level: number | undefined) => void;
  onToggleNotes: () => void;
  /** Whether to show the GM Notes toggle button (only for creatures in the encounter tracker) */
  showNotesButton?: boolean;
}

export function StatblockHeader({
  creature,
  c,
  level,
  size,
  isHazard,
  isComplex,
  aonURL,
  effectiveScaledLevel,
  activeEliteWeak,
  notesOpen,
  activeNotes,
  hasCustomName,
  displayName,
  onClose,
  onEdit,
  onCopyAsCustom,
  onSetScaledLevel,
  onSetPreviewScaledLevel,
  onToggleNotes,
  showNotesButton = false,
}: StatblockHeaderProps) {
  const [scaleDropdownOpen, setScaleDropdownOpen] = useState(false);

  // Close scale dropdown on outside click
  useEffect(() => {
    if (!scaleDropdownOpen) return;
    function handler(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.' + styles.scaleWrap)) {
        setScaleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [scaleDropdownOpen]);

  function handleSetLevel(l: number) {
    if (onSetScaledLevel) onSetScaledLevel(l);
    else onSetPreviewScaledLevel(l);
    setScaleDropdownOpen(false);
  }

  function handleRemoveScaling() {
    if (onSetScaledLevel) onSetScaledLevel(undefined);
    else onSetPreviewScaledLevel(undefined);
    setScaleDropdownOpen(false);
  }

  const displayedLevel = effectiveScaledLevel != null
    ? (activeEliteWeak ? eliteWeakLevel(effectiveScaledLevel, activeEliteWeak) : effectiveScaledLevel)
    : (activeEliteWeak ? eliteWeakLevel(level, activeEliteWeak) : level);

  return (
    <div className={styles.header}>
      <div className={styles.headerRow1}>
        <span className={styles.creatureName}>
          {displayName}
          {activeEliteWeak === 'elite' ? ' (Elite)' : activeEliteWeak === 'weak' ? ' (Weak)' : ''}
          {effectiveScaledLevel != null && (
            <span className={styles.scaledBadge}> ⇅ Lv {effectiveScaledLevel}</span>
          )}
        </span>
        <div className={styles.headerActions}>
          {creature.publication !== 'Custom' && (
            <a
              className={styles.aonLink}
              href={aonURL ?? undefined}
              target="_blank"
              rel="noreferrer"
              title="View on Archives of Nethys"
            >
              AoN ↗
            </a>
          )}
          {creature.publication === 'Custom' && onEdit && (
            <button className={styles.editBtn} onClick={() => onEdit(creature)} title="Edit custom creature">
              ✎
            </button>
          )}
          {onCopyAsCustom && (
            <button className={styles.copyBtn} onClick={() => onCopyAsCustom(creature)} title="Copy and edit as custom creature">
              ⧉
            </button>
          )}
          <div className={styles.scaleWrap}>
            <button
              className={`${styles.scaleBtn} ${effectiveScaledLevel != null ? styles.scaleBtnActive : ''}`}
              title={isHazard ? 'Scale hazard to a different level' : 'Scale creature to a different level'}
              onClick={e => { e.stopPropagation(); setScaleDropdownOpen(o => !o); }}
            >
              ⇅
            </button>
            {scaleDropdownOpen && (
              <div className={styles.scaleDropdown}>
                <div className={styles.scaleDropdownHeader}>Scale to level</div>
                {effectiveScaledLevel != null && (
                  <button className={styles.scaleDropdownRemove} onClick={handleRemoveScaling}>
                    ✕ Remove scaling
                  </button>
                )}
                <div className={styles.scaleDropdownList}>
                  {Array.from({ length: 27 }, (_, i) => i - 1)
                    .filter(l => l !== level)
                    .map(l => (
                      <button
                        key={l}
                        className={`${styles.scaleDropdownItem} ${effectiveScaledLevel === l ? styles.scaleDropdownItemActive : ''}`}
                        onClick={() => handleSetLevel(l)}
                      >
                        {l}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close statblock">
            ✕
          </button>
        </div>
      </div>
      <div className={styles.headerRow2}>
        <span className={styles.creatureLevel}>
          {isHazard ? (isComplex ? 'Complex Hazard' : 'Simple Hazard') : 'Creature'}{' '}
          {displayedLevel}
          {activeEliteWeak && ` (base ${effectiveScaledLevel ?? level})`}
          {effectiveScaledLevel != null && !activeEliteWeak && ` (base ${level})`}
          {!isHazard && ` · ${size}`}
          {hasCustomName && (
            <span className={styles.creatureOriginalName}> · {c.name}</span>
          )}
        </span>
        {/* Notes toggle — only shown for creatures currently in the encounter tracker */}
        {showNotesButton && (
          <button
            className={`${styles.notesBtn} ${notesOpen ? styles.notesBtnActive : ''} ${activeNotes ? styles.notesBtnHasContent : ''}`}
            title={notesOpen ? 'Hide notes' : 'Add GM notes'}
            onClick={onToggleNotes}
          >
            📝
          </button>
        )}
      </div>
    </div>
  );
}
