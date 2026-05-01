import { useState, useEffect, useRef } from 'react';
import styles from './DiceRoller.module.css';

interface RollResult {
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
}

function parseDice(expr: string): { dice: string; modifier: number } | null {
  // Handles: "2d6+3", "1d20", "+7", "-3", "2d6"
  const trimmed = expr.trim();
  // Pure modifier: "+7" or "-3"
  const modOnly = trimmed.match(/^([+-]\d+)$/);
  if (modOnly) return { dice: '1d20', modifier: parseInt(modOnly[1]) };
  // Dice with optional modifier: "2d6+3", "3d8-2", "1d20"
  const full = trimmed.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (full) return { dice: `${full[1]}d${full[2]}`, modifier: full[3] ? parseInt(full[3]) : 0 };
  return null;
}

function roll(expr: string): RollResult | null {
  const parsed = parseDice(expr);
  if (!parsed) return null;
  const [countStr, sidesStr] = parsed.dice.split('d');
  const count = parseInt(countStr);
  const sides = parseInt(sidesStr);
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier;
  return { expression: expr, rolls, modifier: parsed.modifier, total };
}

interface DiceRollerProps {
  expression: string;
  anchorX: number;
  anchorY: number;
  onClose: () => void;
}

export function DiceRoller({ expression, anchorX, anchorY, onClose }: DiceRollerProps) {
  const [result, setResult] = useState<RollResult | null>(() => roll(expression));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'r' || e.key === 'R') setResult(roll(expression));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expression, onClose]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

  if (!result) return null;

  const isNatural20 = result.rolls.length === 1 && result.rolls[0] === 20 && result.modifier === 0;
  const isCrit = result.rolls.some(r => {
    const sides = parseInt(expression.match(/d(\d+)/i)?.[1] ?? '0');
    return r === sides && sides > 1;
  });

  return (
    <div
      ref={ref}
      className={styles.roller}
      style={{ left: anchorX, top: anchorY }}
    >
      <div className={styles.header}>
        <span className={styles.expr}>{expression}</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={`${styles.total} ${isCrit || isNatural20 ? styles.totalCrit : ''}`}>
        {result.total >= 0 && result.total <= 999 ? result.total : result.total}
      </div>
      {result.rolls.length > 0 && (
        <div className={styles.breakdown}>
          [{result.rolls.join(', ')}]{result.modifier !== 0 ? ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}` : ''}
        </div>
      )}
      <button className={styles.rerollBtn} onClick={() => setResult(roll(expression))}>
        ↺ Reroll <span className={styles.hint}>(R)</span>
      </button>
    </div>
  );
}
