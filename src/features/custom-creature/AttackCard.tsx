/**
 * AttackCard
 *
 * One entry in the Attacks list of the CustomCreatureWizard. Handles:
 *   - Attack name, melee/ranged toggle
 *   - Attack bonus with tier quick-picks
 *   - Structured multi-damage-type entry (each component has its own expr +
 *     type picker; additional components prepended with "plus")
 *   - Strike ability combobox (Grab, Push, etc.) shown after damage
 *   - Weapon trait chips with always-visible suggestion dropdown
 *   - Range input (ranged only)
 *
 * All state lives in the parent (CustomCreatureWizard); this component is
 * purely presentational and receives data + callbacks via props.
 */

import { useState, useRef } from 'react';
import { HAZARD_OFFENSE_TABLE } from '../../data/pf2eTables';
import type { AcTier, HpTier, SaveTier } from '../../data/pf2eTables';
import {
  AC_TIERS,
  lookupAttack, lookupDamage,
  lookupHazardAtk, lookupHazardDmg,
} from '../../utils/levelScaling';
import { WEAPON_TRAITS, STRIKE_ABILITY_SUGGESTIONS } from '../../data/pf2eConstants';
import type { CustomAttackDamageType } from '../../types/encounter';
import { rankSuggestions } from '../../utils/suggestions';
import { DamageTypePicker } from './DamageTypePicker';
import styles from './CustomCreatureWizard.module.css';

// ── AttackDraft ───────────────────────────────────────────────────────────────
// UI-only draft type; converted to CustomAttack on save.

export interface AttackDraft {
  name: string;
  type: 'melee' | 'ranged';
  bonus: number;
  bonusTier: AcTier;
  /** Primary damage dice expression, e.g. "2d6+9" — mirrors damageTypes[0].expr */
  primaryDmgExpr: string;
  damageTier: AcTier;
  /** Structured list of damage type components */
  damageTypes: CustomAttackDamageType[];
  /** Strike abilities listed in the damage entry (e.g. Grab, Push) */
  strikeAbilities: string[];
  /** Controlled input value for the strike abilities combobox */
  strikeAbilityInput: string;
  range?: number;
  traits: string[];
  traitInput: string;
}

// ── Tier display helpers (shared with CustomCreatureWizard) ───────────────────

const TIER_ABBREV: Record<HpTier | AcTier | SaveTier, string> = {
  terrible: 'T', low: 'L', moderate: 'M', high: 'H', extreme: 'E',
};

const TIER_COL: Record<HpTier | AcTier | SaveTier, number> = {
  terrible: 1, low: 2, moderate: 3, high: 4, extreme: 5,
};

// ── Default factory functions ─────────────────────────────────────────────────

export function defaultAttack(level: number): AttackDraft {
  const dmgExpr = lookupDamage(level, 'moderate');
  return {
    name: 'Strike',
    type: 'melee',
    bonus: lookupAttack(level, 'moderate'),
    bonusTier: 'moderate',
    primaryDmgExpr: dmgExpr,
    damageTier: 'moderate',
    damageTypes: [{ expr: dmgExpr, type: 'slashing' }],
    strikeAbilities: [],
    strikeAbilityInput: '',
    traits: [],
    traitInput: '',
  };
}

export function defaultHazardAttack(level: number, isComplex: boolean): AttackDraft {
  const dmgExpr = lookupHazardDmg(level, isComplex);
  return {
    name: 'Strike',
    type: 'melee',
    bonus: lookupHazardAtk(level, isComplex),
    bonusTier: 'moderate',
    primaryDmgExpr: dmgExpr,
    damageTier: 'moderate',
    damageTypes: [{ expr: dmgExpr, type: 'bludgeoning' }],
    strikeAbilities: [],
    strikeAbilityInput: '',
    traits: [],
    traitInput: '',
  };
}

// ── buildDamageString ─────────────────────────────────────────────────────────

/**
 * Derive the canonical flat damage string from a draft for persistence.
 * e.g. "2d6+9 slashing plus 1d6 fire plus Grab"
 */
export function buildDamageString(draft: AttackDraft): string {
  const dmgParts = draft.damageTypes
    .filter(dt => dt.expr)
    .map(dt => dt.type ? `${dt.expr} ${dt.type}` : dt.expr);
  const dmgStr = dmgParts.join(' plus ');
  const abilStr = draft.strikeAbilities.join(' plus ');
  if (!dmgStr && !abilStr) return draft.primaryDmgExpr;
  if (!dmgStr) return abilStr;
  return abilStr ? `${dmgStr} plus ${abilStr}` : dmgStr;
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface AttackCardProps {
  atk: AttackDraft;
  attackIdx: number;
  level: number;
  entityKind: 'creature' | 'hazard';
  hazardIsComplex: boolean;
  /** Index of the currently focused attack (for trait dropdown visibility) */
  focusedAttackIdx: number | null;
  setFocusedAttackIdx: (idx: number | null) => void;
  updateAttack: (i: number, patch: Partial<AttackDraft>) => void;
  onRemove: () => void;
}

export function AttackCard({
  atk,
  attackIdx: i,
  level,
  entityKind,
  hazardIsComplex,
  focusedAttackIdx,
  setFocusedAttackIdx,
  updateAttack,
  onRemove,
}: AttackCardProps) {
  const [openDmgPickerIdx, setOpenDmgPickerIdx] = useState<number | null>(null);
  const dmgBtnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [traitsFocused, setTraitsFocused] = useState(false);
  const [strikeAbilityFocused, setStrikeAbilityFocused] = useState(false);

  // ── Damage type helpers ───────────────────────────────────────────────────

  function updateDmgType(dtIdx: number, patch: Partial<CustomAttackDamageType>) {
    const updated = atk.damageTypes.map((dt, j) => j === dtIdx ? { ...dt, ...patch } : dt);
    updateAttack(i, { damageTypes: updated, primaryDmgExpr: updated[0]?.expr ?? atk.primaryDmgExpr });
  }

  function addDmgType() {
    updateAttack(i, { damageTypes: [...atk.damageTypes, { expr: '1d6', type: '' }] });
  }

  function removeDmgType(dtIdx: number) {
    const updated = atk.damageTypes.filter((_, j) => j !== dtIdx);
    updateAttack(i, { damageTypes: updated, primaryDmgExpr: updated[0]?.expr ?? '' });
  }

  // ── Strike ability helpers ────────────────────────────────────────────────

  function addStrikeAbility(name: string) {
    const trimmed = name.trim();
    if (!trimmed || atk.strikeAbilities.includes(trimmed)) return;
    updateAttack(i, { strikeAbilities: [...atk.strikeAbilities, trimmed], strikeAbilityInput: '' });
  }

  function removeStrikeAbility(name: string) {
    updateAttack(i, { strikeAbilities: atk.strikeAbilities.filter(a => a !== name) });
  }

  // ── Derived suggestion lists ──────────────────────────────────────────────

  const abilityQ = atk.strikeAbilityInput.trim().toLowerCase();
  const abilitySuggestions = abilityQ.length > 0
    ? rankSuggestions(STRIKE_ABILITY_SUGGESTIONS, abilityQ)
        .filter(a => !atk.strikeAbilities.includes(a))
        .slice(0, 8)
    : STRIKE_ABILITY_SUGGESTIONS.filter(a => !atk.strikeAbilities.includes(a));

  const traitQ = atk.traitInput.trim().toLowerCase();
  const traitSuggestions = traitQ.length > 0
    ? rankSuggestions(WEAPON_TRAITS, traitQ).filter(t => !atk.traits.includes(t)).slice(0, 10)
    : WEAPON_TRAITS.filter(t => !atk.traits.includes(t));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.attackCard}>

      {/* Row 1: type toggle + name + remove */}
      <div className={styles.attackRow1}>
        <button
          className={`${styles.typeToggle} ${atk.type === 'melee' ? styles.typeToggleMelee : styles.typeToggleRanged}`}
          title={atk.type === 'melee' ? 'Melee (click to switch)' : 'Ranged (click to switch)'}
          onClick={() => updateAttack(i, {
            type: atk.type === 'melee' ? 'ranged' : 'melee',
            range: atk.type === 'melee' ? 30 : undefined,
          })}
        >{atk.type === 'melee' ? '⚔' : '🏹'}</button>
        <input
          className={styles.attackNameInput}
          value={atk.name}
          onChange={e => updateAttack(i, { name: e.target.value })}
          placeholder="Name…"
        />
        <button className={styles.removeBtn} onClick={onRemove}>×</button>
      </div>

      {/* Row 2: attack bonus + tier quick-picks */}
      <div className={styles.attackRow2}>
        <span className={styles.subLabel}>Atk</span>
        {entityKind === 'hazard' ? (
          <div className={styles.tierBtns} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {(['low', 'moderate', 'high'] as const).map((t, ci) => {
              const lvOffset = t === 'low' ? -1 : t === 'high' ? 1 : 0;
              const targetLv = Math.max(-1, Math.min(24, level + lvOffset));
              const hasRow = HAZARD_OFFENSE_TABLE[targetLv] != null;
              const atkVal = hasRow
                ? lookupHazardAtk(targetLv, hazardIsComplex)
                : lookupHazardAtk(level, hazardIsComplex) + (lvOffset > 0 ? 1 : -1);
              return (
                <button
                  key={t}
                  title={t === 'low' ? 'Level −1' : t === 'moderate' ? 'At level' : 'Level +1'}
                  className={`${styles.tierBtn} ${atk.bonusTier === t ? styles.tierBtnActive : ''}`}
                  style={{ gridColumn: ci + 1 }}
                  onClick={() => updateAttack(i, { bonusTier: t, bonus: atkVal })}
                >{TIER_ABBREV[t]}</button>
              );
            })}
          </div>
        ) : (
          <div className={styles.tierBtns}>
            {AC_TIERS.map(t => (
              <button
                key={t}
                title={t}
                className={`${styles.tierBtn} ${atk.bonusTier === t ? styles.tierBtnActive : ''}`}
                style={{ gridColumn: TIER_COL[t] }}
                onClick={() => updateAttack(i, { bonusTier: t, bonus: lookupAttack(level, t) })}
              >{TIER_ABBREV[t]}</button>
            ))}
          </div>
        )}
        <input
          className={styles.statInput}
          type="number"
          min={-10}
          max={70}
          value={atk.bonus}
          onChange={e => updateAttack(i, { bonus: Number(e.target.value) })}
        />
      </div>

      {/* Damage rows: one per damage type component */}
      {atk.damageTypes.map((dt, dtIdx) => {
        const isFirst = dtIdx === 0;
        const btnRef: React.RefObject<HTMLButtonElement | null> = {
          current: dmgBtnRefs.current.get(dtIdx) ?? null,
        };
        return (
          <div key={dtIdx} className={styles.attackRow2}>
            {isFirst ? (
              <span className={styles.subLabel}>Dmg</span>
            ) : (
              <span className={styles.subLabel} style={{ color: 'var(--text-mute)', fontStyle: 'italic' }}>plus</span>
            )}

            {/* Tier quick-picks on the primary damage row only */}
            {isFirst && (
              entityKind === 'hazard' ? (
                <div className={styles.tierBtns} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {(['low', 'moderate', 'high'] as const).map((t, ci) => {
                    const lvOffset = t === 'low' ? -1 : t === 'high' ? 1 : 0;
                    const targetLv = Math.max(-1, Math.min(24, level + lvOffset));
                    const hasRow = HAZARD_OFFENSE_TABLE[targetLv] != null;
                    const dmgDelta = hazardIsComplex ? 2 : 4;
                    const dmgVal = hasRow
                      ? lookupHazardDmg(targetLv, hazardIsComplex)
                      : (() => {
                          const base = lookupHazardDmg(level, hazardIsComplex);
                          const m = base.match(/^(.+[+-])(\d+)$/);
                          if (m) return `${m[1]}${Math.max(0, parseInt(m[2]) + lvOffset * dmgDelta)}`;
                          return base;
                        })();
                    return (
                      <button
                        key={t}
                        title={t === 'low' ? 'Level −1' : t === 'moderate' ? 'At level' : 'Level +1'}
                        className={`${styles.tierBtn} ${atk.damageTier === t ? styles.tierBtnActive : ''}`}
                        style={{ gridColumn: ci + 1 }}
                        onClick={() => updateDmgType(0, { expr: dmgVal })}
                      >{TIER_ABBREV[t]}</button>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.tierBtns}>
                  {AC_TIERS.map(t => (
                    <button
                      key={t}
                      title={t}
                      className={`${styles.tierBtn} ${atk.damageTier === t ? styles.tierBtnActive : ''}`}
                      style={{ gridColumn: TIER_COL[t] }}
                      onClick={() => {
                        const expr = lookupDamage(level, t);
                        updateAttack(i, {
                          damageTier: t,
                          primaryDmgExpr: expr,
                          damageTypes: atk.damageTypes.map((d, j) => j === 0 ? { ...d, expr } : d),
                        });
                      }}
                    >{TIER_ABBREV[t]}</button>
                  ))}
                </div>
              )
            )}

            {/* Dice expression */}
            <input
              className={styles.dmgInput}
              type="text"
              value={dt.expr}
              onChange={e => updateDmgType(dtIdx, { expr: e.target.value })}
              placeholder={isFirst ? '2d8+9' : '1d6'}
            />

            {/* Damage type picker button + popup */}
            <div className={styles.dmgTypePickerAnchor}>
              <button
                ref={el => {
                  if (el) dmgBtnRefs.current.set(dtIdx, el);
                  else dmgBtnRefs.current.delete(dtIdx);
                }}
                type="button"
                className={[
                  styles.dmgTypeBtn,
                  openDmgPickerIdx === dtIdx ? styles.dmgTypeBtnActive : '',
                  !dt.type ? styles.dmgTypeBtnEmpty : '',
                ].join(' ')}
                title="Choose damage type"
                onClick={() => setOpenDmgPickerIdx(prev => prev === dtIdx ? null : dtIdx)}
              >
                {dt.type ? `${dt.type} ▾` : 'type ▾'}
              </button>
              {openDmgPickerIdx === dtIdx && (
                <DamageTypePicker
                  anchorRef={btnRef}
                  onPick={type => { updateDmgType(dtIdx, { type }); setOpenDmgPickerIdx(null); }}
                  onClose={() => setOpenDmgPickerIdx(null)}
                />
              )}
            </div>

            {/* Remove button for secondary rows */}
            {!isFirst && (
              <button
                className={styles.removeBtn}
                onClick={() => removeDmgType(dtIdx)}
                title="Remove this damage component"
              >×</button>
            )}
          </div>
        );
      })}

      {/* Add damage type row */}
      <div className={styles.attackRow2}>
        <button
          className={styles.addDmgTypeBtn}
          onClick={addDmgType}
          title="Add another damage type (e.g. plus 1d6 fire)"
        >+ damage type</button>
      </div>

      {/* Strike abilities row */}
      <div className={styles.attackAbilityRow}>
        <span className={styles.subLabel}>Abilities</span>
        <div className={styles.attackAbilityChips}>
          {atk.strikeAbilities.map(ab => (
            <span key={ab} className={styles.attackAbilityChip}>
              {ab}
              <button className={styles.traitRemove} onClick={() => removeStrikeAbility(ab)}>×</button>
            </span>
          ))}
          <div className={styles.attackTraitInputWrap}>
            <input
              className={styles.attackTraitInput}
              value={atk.strikeAbilityInput}
              onChange={e => updateAttack(i, { strikeAbilityInput: e.target.value })}
              onFocus={() => setStrikeAbilityFocused(true)}
              onBlur={() => setTimeout(() => setStrikeAbilityFocused(false), 150)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = atk.strikeAbilityInput.trim();
                  if (val) addStrikeAbility(val);
                }
                if (e.key === 'Tab' && abilitySuggestions.length > 0) {
                  e.preventDefault();
                  addStrikeAbility(abilitySuggestions[0]);
                }
                if (e.key === 'Escape') setStrikeAbilityFocused(false);
              }}
              placeholder="Add ability (e.g. Grab)…"
            />
            {strikeAbilityFocused && abilitySuggestions.length > 0 && (
              <ul className={styles.suggestions}>
                {abilityQ.length === 0 && (
                  <li className={styles.suggestionGroup}>Suggested abilities</li>
                )}
                {abilitySuggestions.map(a => (
                  <li key={a} className={styles.suggestion} onMouseDown={e => {
                    e.preventDefault();
                    addStrikeAbility(a);
                  }}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Range row — ranged attacks only */}
      {atk.type === 'ranged' && (
        <div className={styles.attackRow3}>
          <span className={styles.subLabel}>Range</span>
          <input
            className={styles.statInput}
            type="number"
            min={5}
            max={500}
            step={5}
            value={atk.range ?? 30}
            onChange={e => updateAttack(i, { range: Number(e.target.value) })}
          />
          <span className={styles.subLabel}>ft</span>
        </div>
      )}

      {/* Weapon traits row */}
      <div className={styles.attackTraitRow}>
        {atk.traits.map(t => (
          <span key={t} className={styles.attackTraitChip}>
            {t}
            <button
              className={styles.traitRemove}
              onClick={() => updateAttack(i, { traits: atk.traits.filter(x => x !== t) })}
            >×</button>
          </span>
        ))}
        <div className={styles.attackTraitInputWrap}>
          <input
            className={styles.attackTraitInput}
            value={atk.traitInput}
            onChange={e => updateAttack(i, { traitInput: e.target.value })}
            onFocus={() => { setFocusedAttackIdx(i); setTraitsFocused(true); }}
            onBlur={() => { setFocusedAttackIdx(null); setTimeout(() => setTraitsFocused(false), 150); }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const t = atk.traitInput.trim().toLowerCase();
                if (t && !atk.traits.includes(t)) updateAttack(i, { traits: [...atk.traits, t], traitInput: '' });
                else if (t) updateAttack(i, { traitInput: '' });
              }
              if (e.key === 'Tab' && traitSuggestions.length > 0) {
                e.preventDefault();
                updateAttack(i, { traits: [...atk.traits, traitSuggestions[0]], traitInput: '' });
              }
              if (e.key === 'Escape') setTraitsFocused(false);
            }}
            placeholder="Add weapon trait…"
          />
          {(traitsFocused || focusedAttackIdx === i) && traitSuggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {traitQ.length === 0 && <li className={styles.suggestionGroup}>Weapon traits</li>}
              {traitSuggestions.map(t => (
                <li key={t} className={styles.suggestion} onMouseDown={e => {
                  e.preventDefault();
                  updateAttack(i, { traits: [...atk.traits, t], traitInput: '' });
                }}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
