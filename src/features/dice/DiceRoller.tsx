import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { RollHistoryEntry } from '../../types/diceHistory';
import {
  parseDice, cryptoD, rollDice, rollCrit,
} from '../../utils/dice';
import type { ParsedDice, RollResult, CritResult } from '../../utils/dice';
import { useFloatingPanel } from '../../hooks/useFloatingPanel';
import styles from './DiceRoller.module.css';

// Re-export for callers that import these from DiceRoller directly
export type { ParsedDice, CritResult };
export { parseDice, cryptoD, rollCrit };

// ─── Component ───────────────────────────────────────────────────────────────

interface DmgGroupState {
  normal: RollResult | null;
  crit: CritResult | null;
}

interface DiceRollerProps {
  expression: string;
  label?: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  damageGroups?: DamageGroupInput[];
  damageTraits?: string[];
}

export function DiceRoller({
  expression,
  label,
  anchorX,
  anchorY,
  onClose,
  onRoll,
  damageGroups,
  damageTraits = [],
}: DiceRollerProps) {
  const parsed = parseDice(expression);

  const parsedGroups = useMemo(
    () => (damageGroups ?? [])
      .map(g => ({ ...g, parsed: parseDice(g.expr) }))
      .filter((g): g is DamageGroupInput & { parsed: ParsedDice } => g.parsed != null),
    [damageGroups],
  );
  const hasDamage = parsedGroups.length > 0;

  const [atkResult, setAtkResult] = useState<RollResult | null>(null);
  const [dmgStates, setDmgStates] = useState<DmgGroupState[]>([]);
  const [isCrit, setIsCrit] = useState(false);
  // Animation keys bump on each roll to retrigger CSS animation
  const [atkAnimKey, setAtkAnimKey] = useState(0);
  const [dmgAnimKey, setDmgAnimKey] = useState(0);
  const {
    ref, panelLeft, panelTop, panelTransform,
    onDragHandlePointerDown, onDragPointerMove, onDragPointerUp,
  } = useFloatingPanel(anchorX, anchorY, onClose);
  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;

  const recordRoll = useCallback((expr: string, lbl: string | undefined, r: RollResult) => {
    onRollRef.current?.({
      expression: expr,
      label: lbl,
      rolls: r.rolls,
      modifier: r.modifier,
      total: r.total,
      timestamp: Date.now(),
    });
  }, []);

  const performAtkRoll = useCallback(() => {
    if (!parsed) return;
    const r = rollDice(parsed);
    setAtkResult(r);
    setAtkAnimKey(k => k + 1);
    recordRoll(parsed.raw, label, r);
    if (parsedGroups.length > 0) {
      const isNat20 = parsed.sides === 20 && r.rolls.length === 1 && r.rolls[0] === 20;
      setIsCrit(isNat20);
      setDmgStates(parsedGroups.map((g, i) => {
        const traits = i === 0 ? damageTraits : [];
        if (isNat20) {
          const cr = rollCrit(g.parsed, traits);
          onRollRef.current?.({ expression: `CRIT ${g.parsed.raw}`, label: `${g.label} (Crit)`, rolls: [...cr.baseDice, ...cr.extraDice], modifier: cr.baseModifier, total: cr.grandTotal, timestamp: Date.now() });
          return { normal: null, crit: cr };
        } else {
          const dr = rollDice(g.parsed);
          recordRoll(g.parsed.raw, g.label, dr);
          return { normal: dr, crit: null };
        }
      }));
      setDmgAnimKey(k => k + 1);
    }
  }, [parsed, parsedGroups, label, damageTraits, recordRoll]);

  const performDmgRoll = useCallback(() => {
    if (parsedGroups.length === 0) return;
    setIsCrit(false);
    setDmgStates(parsedGroups.map(g => {
      const dr = rollDice(g.parsed);
      recordRoll(g.parsed.raw, g.label, dr);
      return { normal: dr, crit: null };
    }));
    setDmgAnimKey(k => k + 1);
  }, [parsedGroups, recordRoll]);

  const performCrit = useCallback(() => {
    if (parsedGroups.length === 0) return;
    setIsCrit(true);
    setDmgStates(parsedGroups.map((g, i) => {
      const traits = i === 0 ? damageTraits : [];
      const cr = rollCrit(g.parsed, traits);
      onRollRef.current?.({ expression: `CRIT ${g.parsed.raw}`, label: `${g.label} (Crit)`, rolls: [...cr.baseDice, ...cr.extraDice], modifier: cr.baseModifier, total: cr.grandTotal, timestamp: Date.now() });
      return { normal: null, crit: cr };
    }));
    setDmgAnimKey(k => k + 1);
  }, [parsedGroups, damageTraits]);

  // Roll on mount
  useEffect(() => {
    performAtkRoll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'r' || e.key === 'R') performAtkRoll();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [performAtkRoll, onClose]);


  if (!atkResult || !parsed) return null;

  const isD20 = parsed.sides === 20 && atkResult.rolls.length === 1;
  const isNat20 = isD20 && atkResult.rolls[0] === 20;
  const isNat1  = isD20 && atkResult.rolls[0] === 1;
  const atkTotalClass = isNat20 ? styles.totalCrit : isNat1 ? styles.totalFumble : styles.totalNormal;

  return (
    <div
      ref={ref}
      className={styles.roller}
      style={{ left: panelLeft, top: panelTop, transform: panelTransform }}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
    >
      {/* ── Attack section ── */}
      <div className={`${styles.header} ${styles.rollerDragHandle}`} onPointerDown={onDragHandlePointerDown}>
        <div className={styles.headerLeft}>
          {label && <span className={styles.label}>{label}</span>}
          <span className={styles.expr}>{parsed.raw}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div key={atkAnimKey} className={`${styles.total} ${atkTotalClass} ${styles.totalAnimated}`}>{atkResult.total}</div>
      <div className={styles.breakdown}>
        [{atkResult.rolls.join(', ')}]
        {atkResult.modifier !== 0 ? ` ${atkResult.modifier >= 0 ? '+' : ''}${atkResult.modifier}` : ''}
      </div>
      <button className={styles.rerollBtn} onClick={performAtkRoll}>
        ↺ Reroll <span className={styles.hint}>(R)</span>
      </button>

      {/* ── Damage section ── */}
      {hasDamage && (() => {
        const single = parsedGroups.length === 1;
        const fatalT  = single ? damageTraits.find(t => /^fatal-\d*d\d+$/i.test(t)) : undefined;
        const deadlyT = single ? damageTraits.find(t => /^deadly-\d*d\d+$/i.test(t)) : undefined;
        function traitDieLbl(t: string, prefix: string) {
          const m = t.replace(new RegExp(`^${prefix}-`, 'i'), '').match(/^(\d+)?d(\d+)$/i);
          if (!m) return t;
          return m[1] ? `${m[1]}d${m[2]}` : `d${m[2]}`;
        }
        const grandTotal = dmgStates.reduce((sum, st) => sum + (st?.crit?.grandTotal ?? st?.normal?.total ?? 0), 0);
        return (
        <div className={styles.damageSection}>
          <div className={styles.damageSectionHeader}>
            <span className={styles.damageSectionLabel}>{label ? `${label} damage` : 'Damage'}</span>
            {single && (
              <span className={styles.damageSectionExprRow}>
                <span className={styles.damageSectionExpr}>{parsedGroups[0].parsed.raw}</span>
                {fatalT && (
                  <span className={styles.traitTag} title="On a crit: all dice become this size + one extra die added">
                    Fatal {traitDieLbl(fatalT, 'fatal')}
                  </span>
                )}
                {deadlyT && (
                  <span className={styles.traitTag} title="On a crit: add extra dice of this size">
                    Deadly {traitDieLbl(deadlyT, 'deadly')}
                  </span>
                )}
              </span>
            )}
            {isCrit && <span className={styles.critBanner}>✦ Critical Hit</span>}
          </div>

          {parsedGroups.map((g, i) => {
            const st = dmgStates[i];
            if (!st) return null;
            const cr = st.crit;
            const dr = st.normal;
            return (
              <div key={i} className={single ? undefined : styles.multiGroup}>
                {!single && <div className={styles.multiGroupLabel}>{g.label}</div>}
                {cr ? (
                  <>
                    <div key={`${dmgAnimKey}-${i}`} className={`${single ? styles.total : styles.multiGroupTotal} ${styles.totalCrit} ${styles.totalDmgAnimated}`}>{cr.grandTotal}</div>
                    <div className={styles.breakdown}>
                      [{cr.baseDice.join(', ')}]
                      {cr.baseModifier !== 0 ? ` ${cr.baseModifier >= 0 ? '+' : ''}${cr.baseModifier}` : ''}
                      {' '}× 2 = {cr.doubledTotal}
                      {cr.extraDice.length > 0 && <> + [{cr.extraDice.join(', ')}] ({cr.extraLabel})</>}
                    </div>
                  </>
                ) : dr ? (
                  <>
                    <div key={`${dmgAnimKey}-${i}`} className={`${single ? styles.total : styles.multiGroupTotal} ${styles.totalNormal} ${styles.totalDmgAnimated}`}>{dr.total}</div>
                    <div className={styles.breakdown}>
                      [{dr.rolls.join(', ')}]
                      {dr.modifier !== 0 ? ` ${dr.modifier >= 0 ? '+' : ''}${dr.modifier}` : ''}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}

          {!single && grandTotal > 0 && (
            <div className={styles.multiGroupTotal} style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
              Total: {grandTotal}
            </div>
          )}

          <div className={styles.damageActions}>
            <button className={styles.rerollBtn} onClick={performDmgRoll}>
              ↺ Reroll dmg
            </button>
            <button
              className={`${styles.critBtn} ${isCrit ? styles.critBtnActive : ''}`}
              onClick={performCrit}
            >
              ✦ Crit
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// ─── Multi-damage roller (ability "Roll all damage" button) ──────────────────

export interface DamageGroupInput {
  expr: string;
  label: string;
}

interface MultiDamageRollerProps {
  groups: DamageGroupInput[];
  abilityName: string;
  /** Weapon traits (e.g. fatal-d12, deadly-d6) applied to the first damage group on crits */
  traits?: string[];
  anchorX: number;
  anchorY: number;
  onClose: () => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
}

interface GroupResult {
  parsed: ParsedDice;
  normal: RollResult | null;
  crit: CritResult | null;
  animKey: number;
}

function traitDieLabel(t: string, prefix: string): string {
  const m = t.replace(new RegExp(`^${prefix}-`, 'i'), '').match(/^(\d+)?d(\d+)$/i);
  if (!m) return t;
  return m[1] ? `${m[1]}d${m[2]}` : `d${m[2]}`;
}

export function MultiDamageRoller({ groups, abilityName, traits = [], anchorX, anchorY, onClose, onRoll }: MultiDamageRollerProps) {
  const parsedGroups = groups.map(g => ({ ...g, parsed: parseDice(g.expr) })).filter(g => g.parsed != null) as (DamageGroupInput & { parsed: ParsedDice })[];

  const [results, setResults] = useState<GroupResult[]>(() =>
    parsedGroups.map(g => ({ parsed: g.parsed, normal: null, crit: null, animKey: 0 }))
  );
  const [isCrit, setIsCrit] = useState(false);
  const {
    ref, panelLeft: mdrPanelLeft, panelTop: mdrPanelTop, panelTransform: mdrPanelTransform,
    onDragHandlePointerDown, onDragPointerMove, onDragPointerUp,
  } = useFloatingPanel(anchorX, anchorY, onClose);
  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;

  const rollAll = useCallback((asCrit: boolean) => {
    setIsCrit(asCrit);
    setResults(prev => prev.map((gr, i) => {
      const g = parsedGroups[i];
      // Weapon traits (fatal/deadly) only apply to the first group
      const groupTraits = i === 0 ? traits : [];
      if (asCrit) {
        const cr = rollCrit(gr.parsed, groupTraits);
        onRollRef.current?.({
          expression: `CRIT ${gr.parsed.raw}`,
          label: `${g.label} (Crit)`,
          rolls: [...cr.baseDice, ...cr.extraDice],
          modifier: cr.baseModifier,
          total: cr.grandTotal,
          timestamp: Date.now(),
        });
        return { ...gr, crit: cr, normal: null, animKey: gr.animKey + 1 };
      } else {
        const r = rollDice(gr.parsed);
        onRollRef.current?.({
          expression: gr.parsed.raw,
          label: g.label,
          rolls: r.rolls,
          modifier: r.modifier,
          total: r.total,
          timestamp: Date.now(),
        });
        return { ...gr, normal: r, crit: null, animKey: gr.animKey + 1 };
      }
    }));
  }, [parsedGroups, traits]);

  // Roll on mount
  useEffect(() => { rollAll(false); }, []); // eslint-disable-line

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'r' || e.key === 'R') rollAll(isCrit);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rollAll, isCrit, onClose]);

  if (parsedGroups.length === 0) return null;

  const isSingle = parsedGroups.length === 1;
  const fatalTrait  = isSingle ? traits.find(t => /^fatal-\d*d\d+$/i.test(t))  : undefined;
  const deadlyTrait = isSingle ? traits.find(t => /^deadly-\d*d\d+$/i.test(t)) : undefined;

  // Grand total across all groups (shown for multi-group rolls)
  const grandTotal = results.reduce((sum, gr) => sum + (gr.crit?.grandTotal ?? gr.normal?.total ?? 0), 0);

  return (
    <div
      ref={ref}
      className={styles.roller}
      style={{ left: mdrPanelLeft, top: mdrPanelTop, transform: mdrPanelTransform, width: 220 }}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
    >
      <div className={`${styles.header} ${styles.rollerDragHandle}`} onPointerDown={onDragHandlePointerDown}>
        <div className={styles.headerLeft}>
          <span className={styles.label}>{abilityName}</span>
          {isSingle && (fatalTrait || deadlyTrait) && (
            <span className={styles.damageSectionExprRow}>
              {fatalTrait && (
                <span className={styles.traitTag} title="On a crit: all dice become this size + one extra die added">
                  Fatal {traitDieLabel(fatalTrait, 'fatal')}
                </span>
              )}
              {deadlyTrait && (
                <span className={styles.traitTag} title="On a crit: add extra dice of this size">
                  Deadly {traitDieLabel(deadlyTrait, 'deadly')}
                </span>
              )}
            </span>
          )}
          {isCrit && <span className={styles.critBanner}>✦ Critical Hit</span>}
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {parsedGroups.map((g, i) => {
        const gr = results[i];
        if (!gr) return null;
        const res = gr.crit ?? gr.normal;
        const total = gr.crit ? gr.crit.grandTotal : gr.normal?.total ?? null;
        return (
          <div key={i} className={isSingle ? undefined : styles.multiGroup}>
            {!isSingle && <div className={styles.multiGroupLabel}>{g.label}</div>}
            <div className={styles.multiGroupExpr}>{g.parsed.raw}</div>
            {total != null && (
              <>
                <div
                  key={gr.animKey}
                  className={`${isSingle ? styles.total : styles.multiGroupTotal} ${isCrit ? styles.totalCrit : styles.totalNormal} ${styles.totalDmgAnimated}`}
                >
                  {total}
                </div>
                <div className={styles.breakdown}>
                  {gr.crit ? (
                    <>
                      [{gr.crit.baseDice.join(', ')}]
                      {gr.crit.baseModifier !== 0 ? ` ${gr.crit.baseModifier >= 0 ? '+' : ''}${gr.crit.baseModifier}` : ''}
                      {' '}× 2 = {gr.crit.doubledTotal}
                      {gr.crit.extraDice.length > 0 && (
                        <> + [{gr.crit.extraDice.join(', ')}] ({gr.crit.extraLabel})</>
                      )}
                    </>
                  ) : res && 'rolls' in res ? (
                    <>
                      [{(res as RollResult).rolls.join(', ')}]
                      {(res as RollResult).modifier !== 0 ? ` ${(res as RollResult).modifier >= 0 ? '+' : ''}${(res as RollResult).modifier}` : ''}
                    </>
                  ) : null}
                </div>
              </>
            )}
          </div>
        );
      })}

      {!isSingle && grandTotal > 0 && (
        <div className={styles.multiGroupTotal} style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
          Total: {grandTotal}
        </div>
      )}

      <div className={styles.damageActions}>
        <button className={styles.rerollBtn} onClick={() => rollAll(isCrit)}>
          ↺ Reroll <span className={styles.hint}>(R)</span>
        </button>
        <button
          className={`${styles.critBtn} ${isCrit ? styles.critBtnActive : ''}`}
          onClick={() => rollAll(!isCrit)}
        >
          ✦ Crit
        </button>
      </div>
    </div>
  );
}
