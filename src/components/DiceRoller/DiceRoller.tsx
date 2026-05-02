import { useState, useEffect, useRef, useCallback } from 'react';
import type { RollHistoryEntry } from '../../types/diceHistory';
import styles from './DiceRoller.module.css';

// ─── Dice parsing ────────────────────────────────────────────────────────────

export interface ParsedDice {
  count: number;
  sides: number;
  modifier: number;
  raw: string; // normalized, e.g. "2d6+3"
}

export function parseDice(expr: string): ParsedDice | null {
  // Normalize: collapse spaces around +/-
  const spaceNorm = expr.trim().replace(/\s*([+-])\s*/g, '$1');

  // Strip trailing non-numeric text (e.g. "slashing", "fire") — keep only the dice math
  const mathOnly = spaceNorm.replace(/^(\d+d\d+(?:[+-]\d+)*).*$/i, '$1');

  // Pure modifier "+7" / "-3" → treat as 1d20+mod
  const modOnly = mathOnly.match(/^([+-]\d+)$/);
  if (modOnly) {
    const mod = parseInt(modOnly[1]);
    return { count: 1, sides: 20, modifier: mod, raw: mathOnly };
  }

  // Extract dice portion and all subsequent +/- terms, then sum them into one modifier
  const diceMatch = mathOnly.match(/^(\d+)d(\d+)((?:[+-]\d+)*)$/i);
  if (diceMatch) {
    const count = parseInt(diceMatch[1]);
    const sides = parseInt(diceMatch[2]);
    // Sum all modifier terms: e.g. "+1-3" → [+1, -3] → -2
    const modTerms = diceMatch[3].match(/[+-]\d+/g) ?? [];
    const modifier = modTerms.reduce((sum, t) => sum + parseInt(t), 0);
    // Rebuild a clean canonical expression
    const raw = `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''}`;
    return { count, sides, modifier, raw };
  }

  return null;
}

interface RollResult {
  rolls: number[];
  modifier: number;
  total: number;
}

function rollDice(parsed: ParsedDice): RollResult {
  const rolls = Array.from({ length: parsed.count }, () =>
    Math.floor(Math.random() * parsed.sides) + 1
  );
  const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier;
  return { rolls, modifier: parsed.modifier, total };
}

// ─── Critical damage calculation ─────────────────────────────────────────────
// PF2E crit rules (Remaster):
//   1. If the weapon has the Fatal trait (fatal-dX):
//      - Replace ALL damage dice with dX for the initial roll
//      - After doubling, add one extra dX
//   2. Otherwise roll normal dice
//   3. Double the total (dice + modifier)
//   4. If Deadly (deadly-dX): add 1×dX (tier 1), 2×dX (tier 2+), or 3×dX (tier 3+)
//      Deadly tier is based on die size: d6=tier1, d8=tier1, d10=tier2, d12=tier3
//   For simplicity we roll 1×dX for deadly (most NPCs are tier 1).

export interface CritResult {
  baseDice: number[];   // the dice rolled (fatal-upsized if applicable)
  baseModifier: number;
  doubledTotal: number; // (dice sum + modifier) * 2
  extraDice: number[];  // fatal extra die, or deadly dice
  extraLabel: string;   // "Fatal d12 extra" / "Deadly d6"
  grandTotal: number;
}

export function rollCrit(parsed: ParsedDice, traits: string[]): CritResult {
  // Detect fatal / deadly — both may include a count prefix: fatal-d12, fatal-2d12, deadly-d10, deadly-2d10
  const fatalTrait = traits.find(t => /^fatal-\d*d\d+$/i.test(t));
  const deadlyTrait = traits.find(t => /^deadly-\d*d\d+$/i.test(t));

  function parseTraitDice(trait: string, prefix: string): { count: number; sides: number } | null {
    const m = trait.replace(new RegExp(`^${prefix}-`, 'i'), '').match(/^(\d+)?d(\d+)$/i);
    if (!m) return null;
    return { count: m[1] ? parseInt(m[1]) : 1, sides: parseInt(m[2]) };
  }

  const fatalDice = fatalTrait ? parseTraitDice(fatalTrait, 'fatal') : null;
  const deadlyDice = deadlyTrait ? parseTraitDice(deadlyTrait, 'deadly') : null;

  // Step 1: roll damage dice (fatal replaces die size)
  const dieSides = fatalDice?.sides ?? parsed.sides;
  const baseDice = Array.from({ length: parsed.count }, () =>
    Math.floor(Math.random() * dieSides) + 1
  );
  const baseSum = baseDice.reduce((a, b) => a + b, 0);

  // Step 2: double (dice + modifier)
  const doubledTotal = (baseSum + parsed.modifier) * 2;

  // Step 3: extra dice
  let extraDice: number[] = [];
  let extraLabel = '';

  if (fatalDice != null) {
    // One extra fatal die added after doubling (always 1 die, just the upsized sides)
    extraDice = [Math.floor(Math.random() * fatalDice.sides) + 1];
    extraLabel = `Fatal d${fatalDice.sides}`;
  } else if (deadlyDice != null) {
    // Roll all deadly dice (count from the trait, e.g. deadly-2d10 = 2 extra d10)
    extraDice = Array.from({ length: deadlyDice.count }, () =>
      Math.floor(Math.random() * deadlyDice.sides) + 1
    );
    extraLabel = `Deadly ${deadlyDice.count > 1 ? `${deadlyDice.count}d` : 'd'}${deadlyDice.sides}`;
  }

  const grandTotal = doubledTotal + extraDice.reduce((a, b) => a + b, 0);

  return { baseDice, baseModifier: parsed.modifier, doubledTotal, extraDice, extraLabel, grandTotal };
}

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
  const [clampedY, setClampedY] = useState(anchorY);
  // Drag state: offset from top-left of panel, null when not dragging
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // Animation keys bump on each roll to retrigger CSS animation
  const [atkAnimKey, setAtkAnimKey] = useState(0);
  const [dmgAnimKey, setDmgAnimKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startPanelX: number; startPanelY: number } | null>(null);
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

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  // Drag handlers
  const onDragHandlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!ref.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = ref.current.getBoundingClientRect();
    // Always use the actual rendered left edge so the transition from
    // translateX(-50%) to transform:none doesn't cause a jump.
    const currentX = rect.left;
    const currentY = rect.top;
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPanelX: currentX,
      startPanelY: currentY,
    };
  }, []);

  const onDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startMouseX;
    const dy = e.clientY - dragRef.current.startMouseY;
    setPos({
      x: dragRef.current.startPanelX + dx,
      y: dragRef.current.startPanelY + dy,
    });
  }, []);

  const onDragPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Clamp vertical position so roller never overflows the bottom of the viewport
  useEffect(() => {
    if (pos) return; // user is dragging — skip auto-clamp
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const overflow = rect.bottom - window.innerHeight + 8; // 8px margin
    if (overflow > 0) setClampedY(y => y - overflow);
  });

  if (!atkResult || !parsed) return null;

  const isD20 = parsed.sides === 20 && atkResult.rolls.length === 1;
  const isNat20 = isD20 && atkResult.rolls[0] === 20;
  const isNat1  = isD20 && atkResult.rolls[0] === 1;
  const atkTotalClass = isNat20 ? styles.totalCrit : isNat1 ? styles.totalFumble : styles.totalNormal;

  const panelLeft = pos ? pos.x : anchorX;
  const panelTop  = pos ? pos.y : clampedY;

  return (
    <div
      ref={ref}
      className={styles.roller}
      style={{ left: panelLeft, top: panelTop, transform: pos ? 'none' : 'translateX(-50%)' }}
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
      {damageParsed && (
        <div className={styles.damageSection}>
          <div className={styles.damageSectionHeader}>
            <span className={styles.damageSectionLabel}>{damageLabel ?? 'Damage'}</span>
            <span className={styles.damageSectionExpr}>{damageParsed.raw}</span>
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
      )}
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
  const [clampedY, setClampedY] = useState(anchorY);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startPanelX: number; startPanelY: number } | null>(null);
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

  const onDragHandlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!ref.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = ref.current.getBoundingClientRect();
    dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startPanelX: rect.left, startPanelY: rect.top };
  }, []);

  const onDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPos({ x: dragRef.current.startPanelX + (e.clientX - dragRef.current.startMouseX), y: dragRef.current.startPanelY + (e.clientY - dragRef.current.startMouseY) });
  }, []);

  const onDragPointerUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => { performDmgRoll(); }, []); // eslint-disable-line

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'r' || e.key === 'R') performDmgRoll();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [performDmgRoll, onClose]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  // Clamp vertical position so roller never overflows the bottom of the viewport
  useEffect(() => {
    if (pos) return;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const overflow = rect.bottom - window.innerHeight + 8;
    if (overflow > 0) setClampedY(y => y - overflow);
  });

  if (!dmgResult || !parsed) return null;

  const panelLeft = pos ? pos.x : anchorX;
  const panelTop  = pos ? pos.y : clampedY;

  return (
    <div
      ref={ref}
      className={styles.roller}
      style={{ left: panelLeft, top: panelTop, transform: pos ? 'none' : 'translateX(-50%)' }}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
    >
      <div className={`${styles.header} ${styles.rollerDragHandle}`} onPointerDown={onDragHandlePointerDown}>
        <div className={styles.headerLeft}>
          {label && <span className={styles.label}>{label}</span>}
          <span className={styles.expr}>{parsed.raw}</span>
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
