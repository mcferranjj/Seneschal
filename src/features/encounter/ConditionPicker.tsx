/**
 * ConditionPicker
 *
 * A self-contained floating popup for adding conditions to a creature in the
 * combat tracker. Owns its own drag state, sort-mode toggle, value stepper,
 * and hover tooltip via useConditionTooltip.
 *
 * Props
 *   uid          – creature uid that conditions will be applied to
 *   anchor       – viewport position from which the popup is initially placed
 *   onClose      – called when the picker should be dismissed without applying
 *   onApply      – called with (conditionName, value?) when a condition is chosen
 */

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CONDITION_CATEGORIES, VALUED_CONDITIONS, CONDITION_INFO } from '../../data/conditions';
import { useConditionTooltip } from '../../hooks/useConditionTooltip';
import styles from './EncounterManager.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_CONDITIONS_ALPHA = [
  ...new Set(CONDITION_CATEGORIES.flatMap(c => c.conditions)),
].sort((a, b) => a.localeCompare(b));

const POPUP_MIN_HEIGHT = 260;
const POPUP_MARGIN = 8;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Anchor {
  x: number;
  y: number;
  top: number;
  spaceBelow: number;
  spaceAbove: number;
}

interface ConditionPickerProps {
  uid: string;
  anchor: Anchor;
  /** When set, skip straight to the value stepper for this condition (edit flow). */
  initialCondition?: { name: string; value: number };
  onClose: () => void;
  onApply: (conditionName: string, value?: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function popupStyle(anchor: Anchor): React.CSSProperties {
  const flipUp =
    anchor.spaceBelow < POPUP_MIN_HEIGHT && anchor.spaceAbove > anchor.spaceBelow;
  if (flipUp) {
    const availableHeight = Math.max(POPUP_MIN_HEIGHT, anchor.spaceAbove);
    return {
      left: anchor.x,
      bottom: window.innerHeight - anchor.top + POPUP_MARGIN,
      maxHeight: availableHeight,
    };
  }
  const availableHeight = Math.max(POPUP_MIN_HEIGHT, anchor.spaceBelow);
  return {
    left: anchor.x,
    top: anchor.y,
    maxHeight: availableHeight,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConditionPicker({ uid: _uid, anchor, initialCondition, onClose, onApply }: ConditionPickerProps) {
  // ── Sort mode ──────────────────────────────────────────────────────────────
  const [sort, setSort] = useState<'category' | 'alpha'>('category');

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const currentX = pickerPos?.x ?? anchor.x;
      const currentY = pickerPos?.y ?? anchor.y;
      dragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: currentX,
        startY: currentY,
      };
    },
    [pickerPos, anchor],
  );

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setPickerPos({
      x: dragRef.current.startX + (e.clientX - dragRef.current.startMouseX),
      y: dragRef.current.startY + (e.clientY - dragRef.current.startMouseY),
    });
  }, []);

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Hover tooltip ──────────────────────────────────────────────────────────
  const { tooltip, getButtonHandlers, tooltipHandlers, clear: clearTooltip } = useConditionTooltip();

  // ── Value stepper ──────────────────────────────────────────────────────────
  // When opened via a chip edit (initialCondition set), closing the stepper
  // should dismiss the whole picker rather than fall back to the picker list.
  const isEditMode = initialCondition != null;
  const [pendingName, setPendingName] = useState(initialCondition?.name ?? '');
  const [pendingValue, setPendingValue] = useState(initialCondition?.value ?? 1);
  const [stepperAnchor, setStepperAnchor] = useState<Anchor | null>(
    isEditMode ? anchor : null,
  );

  function handleConditionPick(condName: string) {
    clearTooltip();
    if (VALUED_CONDITIONS.has(condName.toLowerCase())) {
      setPendingName(condName);
      setPendingValue(1);
      setStepperAnchor({ ...anchor });
    } else {
      onApply(condName);
    }
  }

  function commitValue() {
    onApply(pendingName, pendingValue);
    setPendingName('');
    setStepperAnchor(null);
  }

  function cancelStepper() {
    if (isEditMode) {
      // In edit mode there is no picker list to fall back to — just close.
      onClose();
    } else {
      setPendingName('');
      setStepperAnchor(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className={styles.conditionPopupBackdrop}
        onClick={() => {
          clearTooltip();
          // If stepper is open, clicking backdrop commits the current value
          if (pendingName && stepperAnchor) {
            commitValue();
          } else {
            onClose();
          }
        }}
      />

      {/* ── Picker popup ── */}
      {!stepperAnchor && (
        <div
          className={styles.conditionPopup}
          style={
            pickerPos
              ? { left: pickerPos.x, top: pickerPos.y, maxHeight: 400 }
              : popupStyle(anchor)
          }
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
        >
          {/* Header / drag handle */}
          <div
            className={`${styles.conditionPopupHeader} ${styles.conditionPopupDragHandle}`}
            onPointerDown={onDragStart}
          >
            <span className={styles.conditionPopupTitle}>Add Condition</span>
            <div className={styles.conditionSortToggle}>
              <button
                className={`${styles.conditionSortBtn} ${sort === 'category' ? styles.conditionSortBtnActive : ''}`}
                onClick={() => setSort('category')}
              >
                Category
              </button>
              <button
                className={`${styles.conditionSortBtn} ${sort === 'alpha' ? styles.conditionSortBtnActive : ''}`}
                onClick={() => setSort('alpha')}
              >
                A–Z
              </button>
            </div>
            <button
              className={styles.conditionPickerClose}
              onClick={() => { clearTooltip(); onClose(); }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className={styles.conditionPopupBody}>
            {sort === 'category' ? (
              CONDITION_CATEGORIES.map(cat => (
                <div key={cat.label} className={styles.conditionCategory}>
                  <span className={styles.conditionCategoryLabel}>{cat.label}</span>
                  <div className={styles.conditionCategoryBtns}>
                    {cat.conditions.map(condName => (
                      <button
                        key={condName}
                        className={styles.conditionPickerBtn}
                        onClick={() => handleConditionPick(condName)}
                        {...getButtonHandlers(condName)}
                      >
                        {condName}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.conditionAlphaGrid}>
                {ALL_CONDITIONS_ALPHA.map(condName => (
                  <button
                    key={condName}
                    className={styles.conditionPickerBtn}
                    onClick={() => handleConditionPick(condName)}
                    {...getButtonHandlers(condName)}
                  >
                    {condName === 'Persistent Damage' ? 'Prsnt Damage' : condName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Value stepper popup ── */}
      {stepperAnchor && (
        <div
          className={styles.conditionPopup}
          style={popupStyle(stepperAnchor)}
        >
          <div className={styles.conditionPopupHeader}>
            <span className={styles.conditionPopupTitle}>{pendingName}</span>
            <button
              className={styles.conditionPickerClose}
              onMouseDown={e => e.preventDefault()}
              onClick={cancelStepper}
            >
              ✕
            </button>
          </div>
          <div className={styles.conditionValueRow}>
            <button
              className={styles.conditionStepBtn}
              onClick={() => setPendingValue(v => Math.max(1, v - 1))}
            >
              −
            </button>
            <span className={styles.conditionValueDisplay}>{pendingValue}</span>
            <button
              className={styles.conditionStepBtn}
              onClick={() => setPendingValue(v => Math.min(20, v + 1))}
            >
              +
            </button>
            <button className={styles.conditionValueConfirm} onClick={commitValue}>
              ✓ Apply
            </button>
          </div>
        </div>
      )}

      {/* ── Hover tooltip ── */}
      {tooltip && (() => {
        const info = CONDITION_INFO.get(tooltip.name.toLowerCase());
        if (!info) return null;
        const TOOLTIP_W = 280;
        return (
          <div
            className={styles.conditionTooltip}
            style={{ left: tooltip.left, top: tooltip.top, width: TOOLTIP_W }}
            {...tooltipHandlers}
          >
            <div className={styles.conditionTooltipName}>{tooltip.name}</div>
            {info.statEffect && (
              <div className={styles.conditionTooltipEffect}>{info.statEffect}</div>
            )}
            <p className={styles.conditionTooltipDesc}>{info.desc}</p>
          </div>
        );
      })()}
    </>,
    document.body,
  );
}

// Export uid type for consumers
export type { ConditionPickerProps };
