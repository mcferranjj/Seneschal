/**
 * QuickCreatureForm
 *
 * The two-step inline wizard for adding a custom creature to the encounter.
 * Extracted from EncounterManager to keep that component focused on encounter tracking.
 *
 * Step 0: Name + level + optional "use quick wizard" checkbox.
 *   - If quick wizard is unchecked, submits a placeholder creature immediately.
 *   - If checked, advances to step 1.
 * Step 1: Full stat/attack/ability editor with tier-prefill buttons.
 */

import { useState } from 'react';
import type { HpTier, AcTier, SaveTier } from '../../data/pf2eTables';
import type { CustomAttack, CustomAbility } from '../../types/encounter';
import {
  HP_TIERS, AC_TIERS, SAVE_TIERS,
  lookupHp, lookupAc, lookupSave, lookupAttack, lookupDamage,
} from '../../utils/levelScaling';
import styles from './EncounterManager.module.css';

// ── Local types ───────────────────────────────────────────────────────────────

interface AttackDraft {
  name: string;
  type: 'melee' | 'ranged';
  bonus: number;
  bonusTier: AcTier;
  damage: string;
  damageTier: AcTier;
  range?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_ABBREV: Record<HpTier | AcTier | SaveTier, string> = {
  terrible: 'T', low: 'L', moderate: 'M', high: 'H', extreme: 'E',
};

const ALL_TIER_SLOTS: SaveTier[] = ['terrible', 'low', 'moderate', 'high', 'extreme'];

// ── Props ─────────────────────────────────────────────────────────────────────

interface QuickCreatureFormProps {
  partyLevel: number;
  onAdd: (
    name: string,
    level: number,
    hp?: number,
    ac?: number,
    fort?: number,
    ref?: number,
    will?: number,
    attacks?: CustomAttack[],
    abilities?: CustomAbility[],
    isEnemy?: boolean,
  ) => void;
  onCancel: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultAttack(level: number): AttackDraft {
  return {
    name: 'Strike',
    type: 'melee',
    bonus: lookupAttack(level, 'moderate'),
    bonusTier: 'moderate',
    damage: lookupDamage(level, 'moderate'),
    damageTier: 'moderate',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickCreatureForm({ partyLevel, onAdd, onCancel }: QuickCreatureFormProps) {
  const [step, setStep]               = useState(0);
  const [useQuickWizard, setUseQuickWizard] = useState(false);
  const [isEnemy, setIsEnemy]         = useState(true);
  const [name, setName]               = useState('');
  const [level, setLevel]             = useState(partyLevel);

  // Step-1 stat state
  const [customHp,   setCustomHp]   = useState(() => lookupHp(partyLevel,   'moderate'));
  const [customAc,   setCustomAc]   = useState(() => lookupAc(partyLevel,   'moderate'));
  const [customFort, setCustomFort] = useState(() => lookupSave(partyLevel, 'moderate'));
  const [customRef,  setCustomRef]  = useState(() => lookupSave(partyLevel, 'moderate'));
  const [customWill, setCustomWill] = useState(() => lookupSave(partyLevel, 'moderate'));
  const [hpTier,   setHpTier]   = useState<HpTier>('moderate');
  const [acTier,   setAcTier]   = useState<AcTier>('moderate');
  const [fortTier, setFortTier] = useState<SaveTier>('moderate');
  const [refTier,  setRefTier]  = useState<SaveTier>('moderate');
  const [willTier, setWillTier] = useState<SaveTier>('moderate');
  const [attacks,   setAttacks]   = useState<AttackDraft[]>(() => [defaultAttack(partyLevel)]);
  const [abilities, setAbilities] = useState<CustomAbility[]>([]);

  function applyTiers(lvl: number) {
    setCustomHp(lookupHp(lvl,   'moderate'));
    setCustomAc(lookupAc(lvl,   'moderate'));
    setCustomFort(lookupSave(lvl, 'moderate'));
    setCustomRef(lookupSave(lvl,  'moderate'));
    setCustomWill(lookupSave(lvl, 'moderate'));
    setHpTier('moderate');
    setAcTier('moderate');
    setFortTier('moderate');
    setRefTier('moderate');
    setWillTier('moderate');
    setAttacks([defaultAttack(lvl)]);
    setAbilities([]);
  }

  function updateAttack(i: number, patch: Partial<AttackDraft>) {
    setAttacks(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }

  function handleNext() {
    if (step === 0) {
      if (!name.trim()) return;
      if (!useQuickWizard) {
        onAdd(name.trim(), level, undefined, undefined, undefined, undefined, undefined, undefined, undefined, isEnemy);
        return;
      }
      applyTiers(level);
      setStep(1);
    } else {
      const finalAttacks: CustomAttack[] = attacks
        .filter(a => a.name.trim())
        .map(({ name: n, type, bonus, damage, range }) => ({ name: n.trim(), type, bonus, damage, range }));
      const finalAbilities: CustomAbility[] = abilities
        .filter(a => a.name.trim())
        .map(({ name: n, description }) => ({ name: n.trim(), description }));
      onAdd(
        name.trim(), level,
        customHp, customAc, customFort, customRef, customWill,
        finalAttacks.length  ? finalAttacks  : undefined,
        finalAbilities.length ? finalAbilities : undefined,
        isEnemy,
      );
    }
  }

  function handleCancel() {
    if (step === 1) { setStep(0); return; }
    onCancel();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.customForm}>
      {step === 0 ? (
        <>
          <div className={styles.wizardTitle}>Add Creature</div>
          <input
            className={styles.customInput}
            value={name}
            autoFocus
            onChange={e => setName(e.target.value)}
            placeholder="Name…"
            onKeyDown={e => e.key === 'Enter' && handleNext()}
          />
          <div className={styles.wizardCheckRow}>
            <label className={styles.quickWizardCheck}>
              <input
                type="checkbox"
                checked={useQuickWizard}
                onChange={e => setUseQuickWizard(e.target.checked)}
              />
              Use quick wizard?
            </label>
            <label className={styles.quickWizardCheck}>
              <input
                type="checkbox"
                checked={isEnemy}
                onChange={e => setIsEnemy(e.target.checked)}
              />
              Enemy?
            </label>
          </div>
          <div className={styles.customLevelRow}>
            <span className={styles.partyLabel}>Level</span>
            <button className={styles.stepBtn} onClick={() => setLevel(l => Math.max(-1, l - 1))}>−</button>
            <span className={styles.partyVal}>{level}</span>
            <button className={styles.stepBtn} onClick={() => setLevel(l => Math.min(25, l + 1))}>+</button>
          </div>
          <div className={styles.customActions}>
            <button className={styles.addCustomBtn} onClick={handleNext} disabled={!name.trim()}>
              {useQuickWizard ? 'Next →' : 'Add'}
            </button>
            <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.wizardTitle}>{name} (Lvl {level}) — Stats</div>
          <div className={styles.wizardHint}>Click a tier to prefill · T=Terrible L=Low M=Moderate H=High E=Extreme</div>
          <div className={styles.wizardStatList}>
            {/* ── Defenses ── */}
            <div className={styles.wizardSectionHead}>Defenses</div>
            {([
              { label: 'HP',   tiers: HP_TIERS   as readonly string[], tier: hpTier,   setTier: (t: HpTier)   => { setHpTier(t);   setCustomHp(lookupHp(level, t));     }, val: customHp,   setVal: setCustomHp,   min: 1,   max: 9999 },
              { label: 'AC',   tiers: AC_TIERS   as readonly string[], tier: acTier,   setTier: (t: AcTier)   => { setAcTier(t);   setCustomAc(lookupAc(level, t));     }, val: customAc,   setVal: setCustomAc,   min: 1,   max: 99   },
              { label: 'Fort', tiers: SAVE_TIERS as readonly string[], tier: fortTier, setTier: (t: SaveTier) => { setFortTier(t); setCustomFort(lookupSave(level, t)); }, val: customFort, setVal: setCustomFort, min: -10, max: 60   },
              { label: 'Ref',  tiers: SAVE_TIERS as readonly string[], tier: refTier,  setTier: (t: SaveTier) => { setRefTier(t);  setCustomRef(lookupSave(level, t));  }, val: customRef,  setVal: setCustomRef,  min: -10, max: 60   },
              { label: 'Will', tiers: SAVE_TIERS as readonly string[], tier: willTier, setTier: (t: SaveTier) => { setWillTier(t); setCustomWill(lookupSave(level, t)); }, val: customWill, setVal: setCustomWill, min: -10, max: 60   },
            ] as const).map(({ label, tiers, tier, setTier, val, setVal, min, max }) => (
              <div key={label} className={styles.wizardStatRow}>
                <span className={styles.wizardStatLabel}>{label}</span>
                <div className={styles.tierBtns}>
                  {ALL_TIER_SLOTS.map(slot => (
                    tiers.includes(slot)
                      ? <button
                          key={slot}
                          title={slot.charAt(0).toUpperCase() + slot.slice(1)}
                          className={`${styles.tierBtn} ${tier === slot ? styles.tierBtnActive : ''}`}
                          onClick={() => (setTier as (t: string) => void)(slot)}
                        >{TIER_ABBREV[slot]}</button>
                      : <span key={slot} className={styles.tierBtnSpacer} />
                  ))}
                </div>
                <input
                  className={styles.wizardStatInput}
                  type="number" min={min} max={max}
                  value={val}
                  onChange={e => setVal(Number(e.target.value))}
                />
              </div>
            ))}

            {/* ── Attacks ── */}
            <div className={styles.wizardSectionHead}>
              Attacks
              <button
                className={styles.wizardAddBtn}
                onClick={() => setAttacks(prev => [...prev, defaultAttack(level)])}
              >+ Add</button>
            </div>
            {attacks.map((atk, i) => (
              <div key={i} className={styles.attackDraft}>
                <div className={styles.attackDraftRow1}>
                  <button
                    className={`${styles.typeToggle} ${atk.type === 'melee' ? styles.typeToggleMelee : styles.typeToggleRanged}`}
                    title={atk.type === 'melee' ? 'Melee (click to switch)' : 'Ranged (click to switch)'}
                    onClick={() => updateAttack(i, { type: atk.type === 'melee' ? 'ranged' : 'melee', range: atk.type === 'melee' ? 30 : undefined })}
                  >{atk.type === 'melee' ? '⚔' : '🏹'}</button>
                  <input
                    className={styles.attackNameInput}
                    value={atk.name}
                    onChange={e => updateAttack(i, { name: e.target.value })}
                    placeholder="Name…"
                  />
                  <button className={styles.removeAttackBtn} onClick={() => setAttacks(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
                <div className={styles.attackDraftRow2}>
                  <span className={styles.attackSubLabel}>Atk</span>
                  <div className={styles.tierBtns}>
                    {ALL_TIER_SLOTS.map(slot => (
                      (AC_TIERS as readonly string[]).includes(slot)
                        ? <button key={slot} title={slot} className={`${styles.tierBtn} ${atk.bonusTier === slot ? styles.tierBtnActive : ''}`}
                            onClick={() => updateAttack(i, { bonusTier: slot as AcTier, bonus: lookupAttack(level, slot as AcTier) })}
                          >{TIER_ABBREV[slot]}</button>
                        : <span key={slot} className={styles.tierBtnSpacer} />
                    ))}
                  </div>
                  <input className={styles.wizardStatInput} type="number" min={-10} max={70}
                    value={atk.bonus} onChange={e => updateAttack(i, { bonus: Number(e.target.value) })} />
                  <span className={styles.attackSubLabel}>Dmg</span>
                  <div className={styles.tierBtns}>
                    {ALL_TIER_SLOTS.map(slot => (
                      (AC_TIERS as readonly string[]).includes(slot)
                        ? <button key={slot} title={slot} className={`${styles.tierBtn} ${atk.damageTier === slot ? styles.tierBtnActive : ''}`}
                            onClick={() => updateAttack(i, { damageTier: slot as AcTier, damage: lookupDamage(level, slot as AcTier) })}
                          >{TIER_ABBREV[slot]}</button>
                        : <span key={slot} className={styles.tierBtnSpacer} />
                    ))}
                  </div>
                  <input className={styles.wizardDmgInput} type="text"
                    value={atk.damage} onChange={e => updateAttack(i, { damage: e.target.value })}
                    placeholder="2d8+9" />
                </div>
                {atk.type === 'ranged' && (
                  <div className={styles.attackDraftRow3}>
                    <span className={styles.attackSubLabel}>Range</span>
                    <input className={styles.wizardStatInput} type="number" min={5} max={500} step={5}
                      value={atk.range ?? 30}
                      onChange={e => updateAttack(i, { range: Number(e.target.value) })} />
                    <span className={styles.attackSubLabel}>ft</span>
                  </div>
                )}
              </div>
            ))}

            {/* ── Abilities ── */}
            <div className={styles.wizardSectionHead}>
              Abilities
              <button
                className={styles.wizardAddBtn}
                onClick={() => setAbilities(prev => [...prev, { name: '', description: '' }])}
              >+ Add</button>
            </div>
            {abilities.map((ab, i) => (
              <div key={i} className={styles.abilityDraft}>
                <div className={styles.abilityDraftRow1}>
                  <input
                    className={styles.abilityNameInput}
                    value={ab.name}
                    onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a))}
                    placeholder="Ability name…"
                  />
                  <button className={styles.removeAttackBtn} onClick={() => setAbilities(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
                <textarea
                  className={styles.abilityDescInput}
                  value={ab.description}
                  onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, description: e.target.value } : a))}
                  placeholder="Description (optional)…"
                  rows={2}
                />
              </div>
            ))}
          </div>

          <div className={styles.customActions}>
            <button className={styles.cancelBtn} onClick={handleCancel}>← Back</button>
            <button className={styles.addCustomBtn} onClick={handleNext}>Add</button>
            <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
