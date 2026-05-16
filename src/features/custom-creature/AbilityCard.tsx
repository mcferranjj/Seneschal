/**
 * AbilityCard
 *
 * One entry in the Abilities list of the CustomCreatureWizard.
 * Handles:
 *   - Ability name input with Tab-to-autocomplete suggestions
 *   - Building the correct toolbar extras for hazard vs monster mode
 *   - Rendering AbilityEditor with the right props
 *
 * All state lives in the parent (CustomCreatureWizard); this component
 * is purely presentational and receives data + callbacks via props.
 */

import { useState } from 'react';
import { HAZARD_OFFENSE_TABLE } from '../../data/pf2eTables';
import type { AcTier } from '../../data/pf2eTables';
import {
  lookupDamage, lookupAreaDamage,
  lookupHazardDmg,
  lookupSpellDC, lookupSpellAttack,
} from '../../utils/levelScaling';
import { rankSuggestions } from '../../utils/suggestions';
import { AbilityEditor } from './AbilityEditor';
import type { AbilityEditorToolbarExtras } from './AbilityEditor';
import type { CustomAbility } from '../../types/encounter';
import styles from './CustomCreatureWizard.module.css';

// ── Autocomplete suggestions for ability names ────────────────────────────────

const ABILITY_NAME_SUGGESTIONS = [
  'Constrict', 'Swallow Whole', 'Trample', 'Rend', 'Pounce', 'Attach',
];

// ── Toolbar extras builders ───────────────────────────────────────────────────

function buildHazardExtras(
  level: number,
  hazardIsComplex: boolean,
): AbilityEditorToolbarExtras {
  const offRow = HAZARD_OFFENSE_TABLE[Math.max(-1, Math.min(24, level))];
  const edc = offRow?.extremeDC ?? 19;
  const hdc = offRow?.hardDC ?? 16;
  const dmgDelta = hazardIsComplex ? 2 : 4;

  const dmgForOffset = (lvOffset: number): string => {
    const targetLv = Math.max(-1, Math.min(24, level + lvOffset));
    if (HAZARD_OFFENSE_TABLE[targetLv] != null) return lookupHazardDmg(targetLv, hazardIsComplex);
    const base = lookupHazardDmg(level, hazardIsComplex);
    const m = base.match(/^(.+[+-])(\d+)$/);
    if (m) return `${m[1]}${Math.max(0, parseInt(m[2]) + lvOffset * dmgDelta)}`;
    return base;
  };

  return {
    dcs: [
      { label: 'H', value: hdc, title: `Hard DC (${hdc})`    },
      { label: 'E', value: edc, title: `Extreme DC (${edc})` },
    ],
    damages: [
      { label: 'L', value: dmgForOffset(-1), title: `Low (${dmgForOffset(-1)})`     },
      { label: 'M', value: dmgForOffset(0),  title: `Moderate (${dmgForOffset(0)})` },
      { label: 'H', value: dmgForOffset(1),  title: `High (${dmgForOffset(1)})`     },
    ],
  };
}

function buildMonsterExtras(
  level: number,
  isMultiAction: boolean,
  isLimitedUse: boolean,
): AbilityEditorToolbarExtras {
  const clampedLevel = Math.max(-1, Math.min(25, level));
  const areaTier = isLimitedUse ? 'limited' : 'unlimited';

  // Spell DCs and attack bonuses
  const mdc  = lookupSpellDC(clampedLevel, 'moderate');
  const hdc  = lookupSpellDC(clampedLevel, 'high');
  const edc  = lookupSpellDC(clampedLevel, 'extreme');
  const matk = lookupSpellAttack(clampedLevel, 'moderate');
  const hatk = lookupSpellAttack(clampedLevel, 'high');
  const eatk = lookupSpellAttack(clampedLevel, 'extreme');

  // Single-target strike damage: at level (single-action) or level+2 (multi-action)
  const strikeLv = isMultiAction ? clampedLevel + 2 : clampedLevel;
  const stTiers: AcTier[] = ['low', 'moderate', 'high', 'extreme'];
  const stTierLabels: Record<AcTier, string> = { low: 'L', moderate: 'M', high: 'H', extreme: 'E' };
  const stTierTitles: Record<AcTier, string> = { low: 'Low', moderate: 'Moderate', high: 'High', extreme: 'Extreme' };

  // Area damage base level: level (multi-action) or level-2 (single-action)
  // High = base+1, Moderate = base, Low = base-1
  const areaBaseLv = isMultiAction ? clampedLevel : clampedLevel - 2;

  return {
    dcs: [
      { label: 'M', value: mdc, title: `Moderate DC (${mdc})` },
      { label: 'H', value: hdc, title: `High DC (${hdc})`     },
      { label: 'E', value: edc, title: `Extreme DC (${edc})`  },
    ],
    attackBonuses: [
      { label: 'M', value: matk, title: `Moderate attack +${matk}` },
      { label: 'H', value: hatk, title: `High attack +${hatk}`     },
      { label: 'E', value: eatk, title: `Extreme attack +${eatk}`  },
    ],
    damageGroups: [
      {
        label: 'Single-Target Damage',
        tiers: stTiers.map(t => {
          const val = lookupDamage(strikeLv, t);
          return { label: stTierLabels[t], value: val, title: `${stTierTitles[t]} (${val})` };
        }),
      },
      {
        label: 'Area Damage',
        tiers: [
          { label: 'H', value: lookupAreaDamage(areaBaseLv + 1, areaTier), title: `High (${lookupAreaDamage(areaBaseLv + 1, areaTier)})` },
          { label: 'M', value: lookupAreaDamage(areaBaseLv,     areaTier), title: `Moderate (${lookupAreaDamage(areaBaseLv, areaTier)})` },
          { label: 'L', value: lookupAreaDamage(areaBaseLv - 1, areaTier), title: `Low (${lookupAreaDamage(areaBaseLv - 1, areaTier)})` },
        ],
      },
    ],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AbilityCardProps {
  ability: CustomAbility;
  onChange: (patch: Partial<CustomAbility>) => void;
  onRemove: () => void;
  entityKind: 'creature' | 'hazard';
  level: number;
  hazardIsComplex: boolean;
}

export function AbilityCard({
  ability,
  onChange,
  onRemove,
  entityKind,
  level,
  hazardIsComplex,
}: AbilityCardProps) {
  const [nameFocused, setNameFocused] = useState(false);

  const isMultiAction = ability.actionType === 'two' || ability.actionType === 'three';

  const toolbarExtras: AbilityEditorToolbarExtras =
    entityKind === 'hazard'
      ? buildHazardExtras(level, hazardIsComplex)
      : buildMonsterExtras(level, isMultiAction, ability.isLimitedUse ?? false);

  const nameSuggestions =
    nameFocused && ability.name.length > 0
      ? rankSuggestions(ABILITY_NAME_SUGGESTIONS, ability.name.toLowerCase()).filter(
          s => s.toLowerCase() !== ability.name.toLowerCase(),
        )
      : [];

  return (
    <div className={styles.abilityCard}>
      {/* Name row */}
      <div className={styles.abilityRow1}>
        <div className={styles.abilityNameWrap}>
          <input
            className={styles.attackNameInput}
            value={ability.name}
            onChange={e => onChange({ name: e.target.value })}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Tab' && ability.name.length > 0 && nameSuggestions.length > 0) {
                e.preventDefault();
                onChange({ name: nameSuggestions[0] });
              }
            }}
            placeholder="Ability name…"
          />
          {nameSuggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {nameSuggestions.map(s => (
                <li
                  key={s}
                  className={styles.suggestion}
                  onMouseDown={e => { e.preventDefault(); onChange({ name: s }); }}
                >{s}</li>
              ))}
            </ul>
          )}
        </div>
        <button className={styles.removeBtn} onClick={onRemove}>×</button>
      </div>

      {/* Editor */}
      <AbilityEditor
        ready={ability.name.trim().length > 0 && ability.actionType !== undefined}
        value={ability.description}
        onChange={html => onChange({ description: html })}
        actionType={ability.actionType}
        onActionTypeChange={t => onChange({ actionType: t })}
        // Monster: limited-use checkbox gates the frequency input
        // Hazard: frequency shown whenever action type is not passive
        showLimitedUse={entityKind === 'creature'}
        isLimitedUse={ability.isLimitedUse ?? false}
        onIsLimitedUseChange={v => onChange({ isLimitedUse: v, frequency: v ? (ability.frequency ?? '') : '' })}
        frequency={ability.frequency ?? ''}
        onFrequencyChange={v => onChange({ frequency: v })}
        showTrigger={ability.actionType === 'reaction' || ability.actionType === 'free'}
        trigger={ability.trigger ?? ''}
        onTriggerChange={v => onChange({ trigger: v })}
        requirements={ability.requirements ?? ''}
        onRequirementsChange={v => onChange({ requirements: v })}
        toolbarExtras={toolbarExtras}
      />
    </div>
  );
}
