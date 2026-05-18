/**
 * ManualRollInput
 *
 * A floating popup that lets the user input a physical dice result.
 * Applies the same modifier math as the automatic roller and records
 * the entry to dice history.
 *
 * For strike attacks (`damageGroups` present), the popup only collects
 * the attack roll; damage is rolled automatically, including crit handling
 * on a natural 20.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RollHistoryEntry } from '../../types/diceHistory';
import { parseDice, rollDice, rollCrit } from '../../utils/dice';
import type { ParsedDice } from '../../utils/dice';
import type { DamageGroupInput } from './DiceRoller';
import { useFloatingPanel } from '../../hooks/useFloatingPanel';
import styles from './ManualRollInput.module.css';

export interface ManualRollInputProps {
  /** The full dice expression, e.g. "1d20+7" or "2d6+3" */
  expression: string;
  label?: string;
  creatureName?: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  /** If present, this is a strike attack roll — damage is auto-rolled after input */
  damageGroups?: DamageGroupInput[];
  damageTraits?: string[];
}

export function ManualRollInput({
  expression,
  label,
  creatureName,
  anchorX,
  anchorY,
  onClose,
  onRoll,
  damageGroups,
  damageTraits = [],
}: ManualRollInputProps) {
  const parsed = parseDice(expression);
  const [inputVal, setInputVal] = useState('');
  const [warning, setWarning] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ total: number; isCrit: boolean; dmgResults: DmgResult[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    ref, panelLeft, panelTop, panelTransform, panelMaxHeight,
    onDragHandlePointerDown, onDragPointerMove, onDragPointerUp,
  } = useFloatingPanel(anchorX, anchorY, onClose);

  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard: Escape closes, Enter submits
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const minRoll = parsed ? parsed.count : 1;
  const maxRoll = parsed ? parsed.count * parsed.sides : 20;
  const isAttack = parsed?.sides === 20 && parsed.count === 1;
  const isStrike = isAttack && damageGroups != null && damageGroups.length > 0;

  function diceLabel(p: ParsedDice): string {
    if (p.count === 1) return `d${p.sides}`;
    return `${p.count}d${p.sides}`;
  }

  const promptLabel = parsed ? `Input ${diceLabel(parsed)} result` : 'Input roll result';

  const handleSubmit = useCallback(() => {
    const raw = inputVal.trim();
    const num = parseInt(raw, 10);
    if (isNaN(num) || raw === '') {
      setWarning('Please enter a number.');
      return;
    }

    // Validate range — warn but allow
    let warnMsg = '';
    if (parsed && (num < minRoll || num > maxRoll)) {
      warnMsg = `${num} is outside the valid range (${minRoll}–${maxRoll}). Submitting anyway.`;
      setWarning(warnMsg);
    } else {
      setWarning('');
    }

    if (!parsed) return;

    const total = num + parsed.modifier;
    const isNat20 = isAttack && num === 20;

    // Record the attack/primary roll
    onRollRef.current?.({
      expression: parsed.raw,
      label,
      creatureName,
      rolls: [num],
      modifier: parsed.modifier,
      total,
      timestamp: Date.now(),
    });

    let dmgResults: DmgResult[] = [];

    // Auto-roll damage for strikes
    if (isStrike && damageGroups) {
      const parsedGroups = damageGroups
        .map(g => ({ ...g, parsed: parseDice(g.expr) }))
        .filter((g): g is DamageGroupInput & { parsed: ParsedDice } => g.parsed != null);

      dmgResults = parsedGroups.map((g, i) => {
        const traits = i === 0 ? damageTraits : [];
        if (isNat20) {
          const cr = rollCrit(g.parsed, traits);
          onRollRef.current?.({
            expression: `CRIT ${g.parsed.raw}`,
            label: `${g.label} (Crit)`,
            creatureName,
            rolls: [...cr.baseDice, ...cr.extraDice],
            modifier: cr.baseModifier,
            total: cr.grandTotal,
            timestamp: Date.now(),
          });
          return { label: g.label, expr: g.parsed.raw, isCrit: true as const, cr, dr: null };
        } else {
          const dr = rollDice(g.parsed);
          onRollRef.current?.({
            expression: g.parsed.raw,
            label: g.label,
            creatureName,
            rolls: dr.rolls,
            modifier: dr.modifier,
            total: dr.total,
            timestamp: Date.now(),
          });
          return { label: g.label, expr: g.parsed.raw, isCrit: false as const, cr: null, dr };
        }
      });
    }

    setResult({ total, isCrit: isNat20, dmgResults });
    setSubmitted(true);
  }, [inputVal, parsed, isAttack, isStrike, damageGroups, damageTraits, label, creatureName, minRoll, maxRoll]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (!parsed) return null;

  return (
    <div
      ref={ref}
      className={styles.panel}
      style={{ left: panelLeft, top: panelTop, transform: panelTransform, ['--roller-max-height' as string]: panelMaxHeight }}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
    >
      {/* Header */}
      <div className={`${styles.header} ${styles.dragHandle}`} onPointerDown={onDragHandlePointerDown}>
        <div className={styles.headerLeft}>
          {label && <span className={styles.labelText}>{label}</span>}
          <span className={styles.expr}>{parsed.raw}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {!submitted ? (
        <>
          <div className={styles.prompt}>{promptLabel}</div>
          <div className={styles.rangeHint}>
            Valid: {minRoll}–{maxRoll}
            {parsed.modifier !== 0 && (
              <span className={styles.modHint}>
                {' '}({' '}<span className={styles.modValue}>{parsed.modifier >= 0 ? `+${parsed.modifier}` : parsed.modifier}</span>{' '}modifier)
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            className={styles.input}
            type="number"
            min={minRoll}
            max={maxRoll}
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setWarning(''); }}
            onKeyDown={handleKeyDown}
            placeholder={`${minRoll}–${maxRoll}`}
          />
          {warning && <div className={styles.warning}>{warning}</div>}
          <button className={styles.submitBtn} onClick={handleSubmit}>
            ✓ Submit
          </button>
        </>
      ) : result && (
        <>
          {/* Attack result */}
          <div className={`${styles.total} ${result.isCrit ? styles.totalCrit : styles.totalNormal}`}>
            {result.total}
          </div>
          <div className={styles.breakdown}>
            [{inputVal}]
            {parsed.modifier !== 0 ? ` ${parsed.modifier >= 0 ? '+' : ''}${parsed.modifier}` : ''}
          </div>
          {result.isCrit && isStrike && (
            <div className={styles.critBanner}>✦ Critical Hit — damage auto-rolled</div>
          )}

          {/* Auto-rolled damage results for strikes */}
          {result.dmgResults.length > 0 && (
            <div className={styles.damageSection}>
              <div className={styles.damageSectionLabel}>
                {result.isCrit ? 'Crit Damage' : 'Damage'}
              </div>
              {result.dmgResults.map((d, i) => (
                <div key={i} className={result.dmgResults.length > 1 ? styles.dmgGroup : undefined}>
                  {result.dmgResults.length > 1 && (
                    <div className={styles.dmgGroupLabel}>{d.label}</div>
                  )}
                  <div className={`${styles.dmgTotal} ${d.isCrit ? styles.totalCrit : styles.totalNormal}`}>
                    {d.isCrit && d.cr ? d.cr.grandTotal : d.dr?.total}
                  </div>
                  <div className={styles.breakdown}>
                    {d.isCrit && d.cr ? (
                      <>
                        [{d.cr.baseDice.join(', ')}]
                        {d.cr.baseModifier !== 0 ? ` ${d.cr.baseModifier >= 0 ? '+' : ''}${d.cr.baseModifier}` : ''}
                        {' '}× 2 = {d.cr.doubledTotal}
                        {d.cr.extraDice.length > 0 && (
                          <> + [{d.cr.extraDice.join(', ')}] ({d.cr.extraLabel})</>
                        )}
                      </>
                    ) : d.dr ? (
                      <>
                        [{d.dr.rolls.join(', ')}]
                        {d.dr.modifier !== 0 ? ` ${d.dr.modifier >= 0 ? '+' : ''}${d.dr.modifier}` : ''}
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className={styles.closeResultBtn} onClick={onClose}>Done</button>
        </>
      )}
    </div>
  );
}

// ── Internal types ────────────────────────────────────────────────────────────

interface DmgResultBase {
  label: string;
  expr: string;
}
interface DmgResultCrit extends DmgResultBase {
  isCrit: true;
  cr: import('../../utils/dice').CritResult;
  dr: null;
}
interface DmgResultNormal extends DmgResultBase {
  isCrit: false;
  cr: null;
  dr: import('../../utils/dice').RollResult;
}
type DmgResult = DmgResultCrit | DmgResultNormal;
