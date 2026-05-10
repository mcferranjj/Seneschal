import { useState, useEffect, useRef, useCallback } from 'react';
import type { RollHistoryEntry } from '../../types/diceHistory';
import {
  parseDice, cryptoD, rollDice, rollCrit,
} from '../../utils/dice';
import type { ParsedDice, RollResult, CritResult } from '../../utils/dice';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useFloatingPanel } from '../../hooks/useFloatingPanel';
import styles from './DiceRoller.module.css';

// Re-export for callers that import these from DiceRoller directly
export type { ParsedDice, CritResult };
export { parseDice, cryptoD, rollCrit };

// ─── Component ───────────────────────────────────────────────────────────────

interface DiceRollerProps {
  expression: string;
  label?: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
  // If provided, automatically shows a damage sub-panel
  damageExpr?: string;
  damageLabel?: string;
  damageTraits?: string[]; // for crit calculation
}

export function DiceRoller({
  expression,
  label,
  anchorX,
  anchorY,
  onClose,
  onRoll,
  damageExpr,
  damageLabel,
  damageTraits = [],
}: DiceRollerProps) {
  const parsed = parseDice(expression);
  const damageParsed = damageExpr ? parseDice(damageExpr) : null;

  const [atkResult, setAtkResult] = useState<RollResult | null>(null);
  const [dmgResult, setDmgResult] = useState<RollResult | null>(null);
  const [critResult, setCritResult] = useState<CritResult | null>(null);
  // Animation keys bump on each roll to retrigger CSS animation
  const [atkAnimKey, setAtkAnimKey] = useState(0);
  const [dmgAnimKey, setDmgAnimKey] = useState(0);
  const {
    ref, pos, panelLeft, panelTop, panelTransform,
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
    // Auto-roll damage alongside; if nat 20 on a d20, auto-crit
    if (damageParsed) {
      const isNat20 = parsed.sides === 20 && r.rolls.length === 1 && r.rolls[0] === 20;
      if (isNat20) {
        const cr = rollCrit(damageParsed, damageTraits);
        setCritResult(cr);
        setDmgResult(null);
        setDmgAnimKey(k => k + 1);
        onRollRef.current?.({
          expression: `CRIT ${damageParsed.raw}`,
          label: `${damageLabel ?? 'Damage'} (Crit)`,
          rolls: [...cr.baseDice, ...cr.extraDice],
          modifier: cr.baseModifier,
          total: cr.grandTotal,
          timestamp: Date.now(),
        });
      } else {
        const dr = rollDice(damageParsed);
        setDmgResult(dr);
        setCritResult(null);
        setDmgAnimKey(k => k + 1);
        recordRoll(damageParsed.raw, damageLabel, dr);
      }
    }
  }, [parsed, damageParsed, label, damageLabel, damageTraits, recordRoll]);

  const performDmgRoll = useCallback(() => {
    if (!damageParsed) return;
    const dr = rollDice(damageParsed);
    setDmgResult(dr);
    setCritResult(null);
    setDmgAnimKey(k => k + 1);
    recordRoll(damageParsed.raw, damageLabel, dr);
  }, [damageParsed, damageLabel, recordRoll]);

  const performCrit = useCallback(() => {
    if (!damageParsed) return;
    const cr = rollCrit(damageParsed, damageTraits);
    setCritResult(cr);
    setDmgAnimKey(k => k + 1);
    // Record crit as a history entry
    onRollRef.current?.({
      expression: `CRIT ${damageParsed.raw}`,
      label: `${damageLabel ?? 'Damage'} (Crit)`,
      rolls: [...cr.baseDice, ...cr.extraDice],
      modifier: cr.baseModifier,
      total: cr.grandTotal,
      timestamp: Date.now(),
    });
  }, [damageParsed, damageTraits, damageLabel]);

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
      {damageParsed && (() => {
        const fatalT  = damageTraits.find(t => /^fatal-\d*d\d+$/i.test(t));
        const deadlyT = damageTraits.find(t => /^deadly-\d*d\d+$/i.test(t));
        function traitDieLbl(t: string, prefix: string) {
          const m = t.replace(new RegExp(`^${prefix}-`, 'i'), '').match(/^(\d+)?d(\d+)$/i);
          if (!m) return t;
          return m[1] ? `${m[1]}d${m[2]}` : `d${m[2]}`;
        }
        return (
        <div className={styles.damageSection}>
          <div className={styles.damageSectionHeader}>
            <span className={styles.damageSectionLabel}>{damageLabel ?? 'Damage'}</span>
            <span className={styles.damageSectionExprRow}>
              <span className={styles.damageSectionExpr}>{damageParsed.raw}</span>
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
            {critResult && <span className={styles.critBanner}>✦ Critical Hit</span>}
          </div>

          {critResult ? (
            <>
              <div key={dmgAnimKey} className={`${styles.total} ${styles.totalCrit} ${styles.totalDmgAnimated}`}>{critResult.grandTotal}</div>
              <div className={styles.breakdown}>
                [{critResult.baseDice.join(', ')}]
                {critResult.baseModifier !== 0 ? ` ${critResult.baseModifier >= 0 ? '+' : ''}${critResult.baseModifier}` : ''}
                {' '}× 2 = {critResult.doubledTotal}
                {critResult.extraDice.length > 0 && (
                  <> + [{critResult.extraDice.join(', ')}] ({critResult.extraLabel})</>
                )}
              </div>
            </>
          ) : dmgResult ? (
            <>
              <div key={dmgAnimKey} className={`${styles.total} ${styles.totalNormal} ${styles.totalDmgAnimated}`}>{dmgResult.total}</div>
              <div className={styles.breakdown}>
                [{dmgResult.rolls.join(', ')}]
                {dmgResult.modifier !== 0 ? ` ${dmgResult.modifier >= 0 ? '+' : ''}${dmgResult.modifier}` : ''}
              </div>
            </>
          ) : null}

          <div className={styles.damageActions}>
            <button className={styles.rerollBtn} onClick={performDmgRoll}>
              ↺ Reroll dmg
            </button>
            <button
              className={`${styles.critBtn} ${critResult ? styles.critBtnActive : ''}`}
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

export function MultiDamageRoller({ groups, abilityName, anchorX, anchorY, onClose, onRoll }: MultiDamageRollerProps) {
  const parsedGroups = groups.map(g => ({ ...g, parsed: parseDice(g.expr) })).filter(g => g.parsed != null) as (DamageGroupInput & { parsed: ParsedDice })[];

  const [results, setResults] = useState<GroupResult[]>(() =>
    parsedGroups.map(g => ({ parsed: g.parsed, normal: null, crit: null, animKey: 0 }))
  );
  const [isCrit, setIsCrit] = useState(false);
  const {
    ref, pos, panelLeft: mdrPanelLeft, panelTop: mdrPanelTop, panelTransform: mdrPanelTransform,
    onDragHandlePointerDown, onDragPointerMove, onDragPointerUp,
  } = useFloatingPanel(anchorX, anchorY, onClose);
  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;

  const rollAll = useCallback((asCrit: boolean) => {
    setIsCrit(asCrit);
    setResults(prev => prev.map((gr, i) => {
      const g = parsedGroups[i];
      if (asCrit) {
        const cr = rollCrit(gr.parsed, []);
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
  }, [parsedGroups]);

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
          <div key={i} className={styles.multiGroup}>
            <div className={styles.multiGroupLabel}>{g.label}</div>
            <div className={styles.multiGroupExpr}>{g.parsed.raw}</div>
            {total != null && (
              <>
                <div
                  key={gr.animKey}
                  className={`${styles.multiGroupTotal} ${isCrit ? styles.totalCrit : styles.totalNormal} ${styles.totalDmgAnimated}`}
                >
                  {total}
                </div>
                <div className={styles.breakdown}>
                  {gr.crit ? (
                    <>
                      [{gr.crit.baseDice.join(', ')}]
                      {gr.crit.baseModifier !== 0 ? ` ${gr.crit.baseModifier >= 0 ? '+' : ''}${gr.crit.baseModifier}` : ''}
                      {' '}× 2 = {gr.crit.doubledTotal}
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

// ─── Standalone damage-only roller (used from combat tracker / direct damage clicks) ──

interface DamageRollerProps {
  expression: string;
  label?: string;
  traits?: string[];
  anchorX: number;
  anchorY: number;
  onClose: () => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
}

export function DamageRoller({ expression, label, traits = [], anchorX, anchorY, onClose, onRoll }: DamageRollerProps) {
  const parsed = parseDice(expression);
  const [dmgResult, setDmgResult] = useState<RollResult | null>(null);
  const [critResult, setCritResult] = useState<CritResult | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const {
    ref, pos, panelLeft: drPanelLeft, panelTop: drPanelTop, panelTransform: drPanelTransform,
    onDragHandlePointerDown, onDragPointerMove, onDragPointerUp,
  } = useFloatingPanel(anchorX, anchorY, onClose);
  const onRollRef = useRef(onRoll);
  onRollRef.current = onRoll;

  const recordRoll = useCallback((r: RollResult) => {
    if (!parsed) return;
    onRollRef.current?.({
      expression: parsed.raw,
      label,
      rolls: r.rolls,
      modifier: r.modifier,
      total: r.total,
      timestamp: Date.now(),
    });
  }, [parsed, label]);

  const performDmgRoll = useCallback(() => {
    if (!parsed) return;
    const r = rollDice(parsed);
    setDmgResult(r);
    setCritResult(null);
    setAnimKey(k => k + 1);
    recordRoll(r);
  }, [parsed, recordRoll]);

  const performCrit = useCallback(() => {
    if (!parsed) return;
    const cr = rollCrit(parsed, traits);
    setCritResult(cr);
    setAnimKey(k => k + 1);
    onRollRef.current?.({
      expression: `CRIT ${parsed.raw}`,
      label: `${label ?? 'Damage'} (Crit)`,
      rolls: [...cr.baseDice, ...cr.extraDice],
      modifier: cr.baseModifier,
      total: cr.grandTotal,
      timestamp: Date.now(),
    });
  }, [parsed, traits, label]);

  useEffect(() => { performDmgRoll(); }, []); // eslint-disable-line

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'r' || e.key === 'R') performDmgRoll();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [performDmgRoll, onClose]);

  if (!dmgResult || !parsed) return null;

  // Detect deadly / fatal traits for display
  const fatalTrait  = traits.find(t => /^fatal-\d*d\d+$/i.test(t));
  const deadlyTrait = traits.find(t => /^deadly-\d*d\d+$/i.test(t));
  function traitDieLabel(t: string, prefix: string) {
    const m = t.replace(new RegExp(`^${prefix}-`, 'i'), '').match(/^(\d+)?d(\d+)$/i);
    if (!m) return t;
    return m[1] ? `${m[1]}d${m[2]}` : `d${m[2]}`;
  }

  return (
    <div
      ref={ref}
      className={styles.roller}
      style={{ left: drPanelLeft, top: drPanelTop, transform: drPanelTransform }}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
    >
      <div className={`${styles.header} ${styles.rollerDragHandle}`} onPointerDown={onDragHandlePointerDown}>
        <div className={styles.headerLeft}>
          {label && <span className={styles.label}>{label}</span>}
          <span className={styles.damageSectionExprRow}>
            <span className={styles.expr}>{parsed.raw}</span>
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
          {critResult && <span className={styles.critBanner}>✦ Critical Hit</span>}
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {critResult ? (
        <>
          <div key={animKey} className={`${styles.total} ${styles.totalCrit} ${styles.totalAnimated}`}>{critResult.grandTotal}</div>
          <div className={styles.breakdown}>
            [{critResult.baseDice.join(', ')}]
            {critResult.baseModifier !== 0 ? ` ${critResult.baseModifier >= 0 ? '+' : ''}${critResult.baseModifier}` : ''}
            {' '}× 2 = {critResult.doubledTotal}
            {critResult.extraDice.length > 0 && (
              <> + [{critResult.extraDice.join(', ')}] ({critResult.extraLabel})</>
            )}
          </div>
        </>
      ) : (
        <>
          <div key={animKey} className={`${styles.total} ${styles.totalNormal} ${styles.totalAnimated}`}>{dmgResult.total}</div>
          <div className={styles.breakdown}>
            [{dmgResult.rolls.join(', ')}]
            {dmgResult.modifier !== 0 ? ` ${dmgResult.modifier >= 0 ? '+' : ''}${dmgResult.modifier}` : ''}
          </div>
        </>
      )}

      <div className={styles.damageActions}>
        <button className={styles.rerollBtn} onClick={performDmgRoll}>↺ Reroll <span className={styles.hint}>(R)</span></button>
        <button
          className={`${styles.critBtn} ${critResult ? styles.critBtnActive : ''}`}
          onClick={performCrit}
        >
          ✦ Crit
        </button>
      </div>
    </div>
  );
}
