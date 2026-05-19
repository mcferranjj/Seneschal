import { useState, useRef } from 'react';
import styles from './SheetHPBlock.module.css';

interface SheetHPBlockProps {
  currentHp: number;
  maxHp: number;
  tempHp: number;
  onHpChange: (hp: number) => void;
  onTempHpChange: (temp: number) => void;
}

export function SheetHPBlock({
  currentHp, maxHp, tempHp, onHpChange, onTempHpChange,
}: SheetHPBlockProps) {
  const [amount, setAmount] = useState('');
  const [directInput, setDirectInput] = useState(false);
  const [directVal, setDirectVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pct = maxHp > 0 ? currentHp / maxHp : 0;
  const barClass = pct > 0.5 ? styles.barHealthy : pct > 0.25 ? styles.barWounded : styles.barCritical;

  function handleDamage() {
    const n = parseInt(amount, 10);
    if (!isNaN(n) && n > 0) {
      onHpChange(currentHp - n);
      setAmount('');
    }
  }

  function handleHeal() {
    const n = parseInt(amount, 10);
    if (!isNaN(n) && n > 0) {
      onHpChange(currentHp + n);
      setAmount('');
    }
  }

  function handleDirectSet() {
    const n = parseInt(directVal, 10);
    if (!isNaN(n)) {
      onHpChange(n);
    }
    setDirectInput(false);
    setDirectVal('');
  }

  return (
    <div className={styles.block}>
      <div className={styles.hpDisplay}>
        <div className={styles.hpMain}>
          {directInput ? (
            <input
              ref={inputRef}
              className={styles.directInput}
              type="number"
              value={directVal}
              onChange={e => setDirectVal(e.target.value)}
              onBlur={handleDirectSet}
              onKeyDown={e => { if (e.key === 'Enter') handleDirectSet(); if (e.key === 'Escape') setDirectInput(false); }}
              autoFocus
            />
          ) : (
            <span
              className={styles.currentHp}
              onClick={() => { setDirectInput(true); setDirectVal(String(currentHp)); }}
              title="Click to set directly"
            >
              {currentHp}
            </span>
          )}
          <span className={styles.hpSep}>/</span>
          <span className={styles.maxHp}>{maxHp}</span>
        </div>
        <div className={styles.hpLabel}>Hit Points</div>
        {tempHp > 0 && (
          <div className={styles.tempHp}>+{tempHp} temp</div>
        )}
      </div>

      <div className={styles.hpBar}>
        <div className={`${styles.hpFill} ${barClass}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>

      <div className={styles.controls}>
        <input
          className={styles.amountInput}
          type="number"
          min={0}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Amount"
          onKeyDown={e => {
            if (e.key === 'Enter') handleHeal();
          }}
        />
        <button className={styles.damageBtn} onClick={handleDamage} disabled={!amount || parseInt(amount) <= 0}>
          Damage
        </button>
        <button className={styles.healBtn} onClick={handleHeal} disabled={!amount || parseInt(amount) <= 0}>
          Heal
        </button>
      </div>

      <div className={styles.tempRow}>
        <span className={styles.tempLabel}>Temp HP</span>
        <input
          className={styles.tempInput}
          type="number"
          min={0}
          value={tempHp || ''}
          placeholder="0"
          onChange={e => onTempHpChange(parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}
