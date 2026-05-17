import { useState, useRef, useEffect } from 'react';
import type { HpTier, AcTier, SaveTier, AbilityTier, ResWeakTier, HazardDCTier, HazardDefenseTier } from '../../data/pf2eTables';
import {
  HP_TIERS, AC_TIERS, SAVE_TIERS, ABILITY_TIERS, RES_WEAK_TIERS,
  lookupHp, lookupAc, lookupSave, lookupAttack,
  lookupAbility, lookupPerception, lookupResWeak,
  lookupHazardStealth, lookupHazardAc, lookupHazardSave, lookupHazardHp, lookupHazardHardness,
  closestTier,
} from '../../utils/levelScaling';
import { CREATURE_TYPES, HAZARD_TYPES, SIZES, DAMAGE_TYPES, COMMON_SENSES, OFFICIAL_SKILLS, LANGUAGE_SUGGESTIONS } from '../../data/pf2eConstants';
import type { CreatureRecord } from '../../db/schema';
import type { CustomAttack, CustomAttackDamageType, CustomAbility, AbilityActionType, CustomSpeed, CustomSense, CustomImmunity, CustomResistance, SpeedType, CustomSpellcastingEntry, CustomSpell, SpellTradition, SpellcastingType, SpellFrequency, CustomSkill } from '../../types/encounter';
import { creatureRepository } from '../../db/repositories/CreatureRepository';
import { getAllTraits } from '../../search/search';
import { rankSuggestions } from '../../utils/suggestions';
import { AbilityCard } from './AbilityCard';
import { GenericAbilityPicker } from './GenericAbilityPicker';
import { AttackCard, defaultAttack, defaultHazardAttack, buildDamageString } from './AttackCard';
import type { AttackDraft } from './AttackCard';
import styles from './CustomCreatureWizard.module.css';


const HAZARD_DC_TIERS:      HazardDCTier[]      = ['low', 'high', 'extreme'];
const HAZARD_DEFENSE_TIERS: HazardDefenseTier[] = ['low', 'high', 'extreme'];

const TIER_ABBREV: Record<HpTier | AcTier | SaveTier, string> = {
  terrible: 'T', low: 'L', moderate: 'M', high: 'H', extreme: 'E',
};

/** Fixed grid-column position for each tier (1-based, out of 5 columns: T L M H E) */
const TIER_COL: Record<HpTier | AcTier | SaveTier, number> = {
  terrible: 1, low: 2, moderate: 3, high: 4, extreme: 5,
};

// Hazard tier abbreviations (3-column grid: L H E)
const HAZARD_TIER_ABBREV: Record<HazardDCTier, string> = { low: 'L', high: 'H', extreme: 'E' };
/** Grid column for hazard 3-tier buttons (L H E → columns 1 2 3) */
const HAZARD_TIER_COL: Record<HazardDCTier, number> = { low: 1, high: 2, extreme: 3 };


// ── ResWeakRow ────────────────────────────────────────────────────────────────

function ResWeakRow({
  entry,
  level,
  onChange,
  onRemove,
}: {
  entry: CustomResistance;
  level: number;
  onChange: (patch: Partial<CustomResistance>) => void;
  onRemove: () => void;
}) {
  const [typeInput, setTypeInput] = useState(entry.type);
  const [focused, setFocused] = useState(false);
  const [excInput, setExcInput] = useState(entry.exceptions ?? '');
  const [tier, setTier] = useState<ResWeakTier>('moderate');

  return (
    <div className={styles.attackCard}>
      <div className={styles.attackRow1}>
        <div className={styles.attackTraitInputWrap} style={{ flex: 1 }}>
          <input
            className={styles.attackNameInput}
            value={typeInput}
            placeholder="Type (e.g. fire)…"
            onChange={e => { setTypeInput(e.target.value); onChange({ type: e.target.value.trim().toLowerCase() }); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Tab' && typeInput.length > 0) {
                const q = typeInput.toLowerCase();
                const sugg = rankSuggestions(DAMAGE_TYPES, q).filter(d => d !== typeInput.toLowerCase()).slice(0, 6);
                if (sugg.length > 0) { e.preventDefault(); setTypeInput(sugg[0]); onChange({ type: sugg[0] }); }
              }
            }}
          />
          {focused && typeInput.length > 0 && (() => {
            const q = typeInput.toLowerCase();
            const sugg = rankSuggestions(DAMAGE_TYPES, q).filter(d => d !== typeInput.toLowerCase()).slice(0, 6);
            return sugg.length > 0 ? (
              <ul className={styles.suggestions}>
                {sugg.map(d => (
                  <li key={d} className={styles.suggestion} onMouseDown={e => {
                    e.preventDefault(); setTypeInput(d); onChange({ type: d });
                  }}>{d}</li>
                ))}
              </ul>
            ) : null;
          })()}
        </div>
        <div className={styles.tierBtns}>
          {RES_WEAK_TIERS.map(t => (
            <button key={t} title={t === 'high' ? 'High (max)' : t === 'low' ? 'Low (min)' : 'Moderate'}
              className={`${styles.tierBtn} ${tier === t ? styles.tierBtnActive : ''}`}
              style={{ gridColumn: TIER_COL[t] }}
              onClick={() => { setTier(t); onChange({ value: lookupResWeak(level, t) }); }}
            >{TIER_ABBREV[t]}</button>
          ))}
        </div>
        <input className={styles.statInput} type="number" min={0} max={999}
          value={entry.value}
          onChange={e => onChange({ value: Number(e.target.value) })} />
        <button className={styles.removeBtn} onClick={onRemove}>×</button>
      </div>
      <div className={styles.attackRow2} style={{ alignItems: 'center', gap: 5 }}>
        <span className={styles.subLabel}>Except</span>
        <input className={styles.attackNameInput}
          value={excInput}
          placeholder="exceptions (optional)…"
          onChange={e => { setExcInput(e.target.value); onChange({ exceptions: e.target.value || undefined }); }}
        />
      </div>
    </div>
  );
}

interface WizardProps {
  partyLevel: number;
  onSave: (creature: CreatureRecord) => void;
  onCancel: () => void;
  /** If provided, wizard opens in edit mode pre-populated with this creature */
  editCreature?: CreatureRecord;
}

export function CustomCreatureWizard({ partyLevel, onSave, onCancel, editCreature }: WizardProps) {
  const isEditing = editCreature != null;

  // Derive initial values from editCreature if present
  function initFromEdit<T>(editVal: T, fallback: T): T {
    return isEditing ? editVal : fallback;
  }

  const editData = editCreature?.data as (ReturnType<typeof Object.assign> | undefined);

  // Determine if editing a hazard
  const editIsHazard = isEditing && editCreature!.entityType === 'hazard';
  const editIsComplex = isEditing && (editCreature!.customData?.isComplex ?? editCreature!.isComplex ?? false);

  const editType = isEditing
    ? editIsHazard
      ? (editCreature!.traits.find(t => HAZARD_TYPES.map(h => h.value).includes(t)) ?? '')
      : (editCreature!.traits.find(t => CREATURE_TYPES.map(c => c.toLowerCase()).includes(t)) ?? '')
    : '';
  const editExtraTraits = isEditing
    ? editIsHazard
      ? editCreature!.traits.filter(t => !HAZARD_TYPES.map(h => h.value).includes(t) && t !== 'complex')
      : editCreature!.traits.filter(t => !CREATURE_TYPES.map(c => c.toLowerCase()).includes(t))
    : [];
  const editAttacks: AttackDraft[] = isEditing && editCreature!.customData?.attacks
    ? editCreature!.customData.attacks.map(a => {
        // Restore structured damage types if saved; otherwise parse from legacy string
        const savedTypes = a.damageTypes;
        let damageTypes: CustomAttackDamageType[];
        let primaryDmgExpr: string;
        if (savedTypes && savedTypes.length > 0) {
          damageTypes = savedTypes;
          primaryDmgExpr = savedTypes[0].expr;
        } else {
          // Legacy: extract first dice expr from the damage string
          const m = a.damage.match(/^(\d+d\d+(?:[+-]\d+)?)/);
          primaryDmgExpr = m ? m[1] : a.damage;
          damageTypes = [{ expr: primaryDmgExpr, type: '' }];
        }
        return {
          name: a.name,
          type: a.type,
          bonus: a.bonus,
          bonusTier: closestTier(AC_TIERS, t => lookupAttack(editCreature!.level, t), a.bonus, 'moderate'),
          primaryDmgExpr,
          damageTier: 'moderate' as AcTier,
          damageTypes,
          strikeAbilities: a.strikeAbilities ?? [],
          strikeAbilityInput: '',
          range: a.range,
          traits: a.traits ?? [],
          traitInput: '',
        };
      })
    : [];

  const [step, setStep] = useState(isEditing ? 0 : 0);
  const [name, setName] = useState(initFromEdit(editCreature?.name ?? '', ''));
  const [level, setLevel] = useState(initFromEdit(editCreature?.level ?? partyLevel, partyLevel));
  const [size, setSize] = useState(initFromEdit(editCreature?.size ?? 'med', 'med'));

  // Entity kind: 'creature' | 'hazard'
  const [entityKind, setEntityKind] = useState<'creature' | 'hazard'>(
    isEditing ? (editIsHazard ? 'hazard' : 'creature') : 'creature'
  );
  // Complexity (hazard only)
  const [hazardIsComplex, setHazardIsComplex] = useState<boolean>(
    isEditing ? editIsComplex : false
  );

  const [creatureType, setCreatureType] = useState(
    isEditing
      ? editIsHazard
        ? ''
        : (CREATURE_TYPES.find(t => t.toLowerCase() === editType) ?? '')
      : ''
  );
  const [hazardType, setHazardType] = useState(
    isEditing && editIsHazard ? editType : ''
  );
  const [hp, setHp] = useState(() =>
    isEditing ? (editData?.system?.attributes?.hp?.max ?? lookupHp(partyLevel, 'moderate')) : lookupHp(partyLevel, 'moderate')
  );
  const [ac, setAc] = useState(() =>
    isEditing ? (editData?.system?.attributes?.ac?.value ?? lookupAc(partyLevel, 'moderate')) : lookupAc(partyLevel, 'moderate')
  );
  const [fort, setFort] = useState(() =>
    isEditing ? (editData?.system?.saves?.fortitude?.value ?? lookupSave(partyLevel, 'moderate')) : lookupSave(partyLevel, 'moderate')
  );
  const [ref, setRef] = useState(() =>
    isEditing ? (editData?.system?.saves?.reflex?.value ?? lookupSave(partyLevel, 'moderate')) : lookupSave(partyLevel, 'moderate')
  );
  const [will, setWill] = useState(() =>
    isEditing ? (editData?.system?.saves?.will?.value ?? lookupSave(partyLevel, 'moderate')) : lookupSave(partyLevel, 'moderate')
  );
  const [hpTier, setHpTier] = useState<HpTier>(() =>
    isEditing
      ? closestTier(HP_TIERS, t => lookupHp(editCreature!.level, t), editData?.system?.attributes?.hp?.max ?? lookupHp(partyLevel, 'moderate'), 'moderate')
      : 'moderate'
  );
  const [acTier, setAcTier] = useState<AcTier>(() =>
    isEditing
      ? closestTier(AC_TIERS, t => lookupAc(editCreature!.level, t), editData?.system?.attributes?.ac?.value ?? lookupAc(partyLevel, 'moderate'), 'moderate')
      : 'moderate'
  );
  const [fortTier, setFortTier] = useState<SaveTier>(() =>
    isEditing
      ? closestTier(SAVE_TIERS, t => lookupSave(editCreature!.level, t), editData?.system?.saves?.fortitude?.value ?? lookupSave(partyLevel, 'moderate'), 'moderate')
      : 'moderate'
  );
  const [refTier, setRefTier] = useState<SaveTier>(() =>
    isEditing
      ? closestTier(SAVE_TIERS, t => lookupSave(editCreature!.level, t), editData?.system?.saves?.reflex?.value ?? lookupSave(partyLevel, 'moderate'), 'moderate')
      : 'moderate'
  );
  const [willTier, setWillTier] = useState<SaveTier>(() =>
    isEditing
      ? closestTier(SAVE_TIERS, t => lookupSave(editCreature!.level, t), editData?.system?.saves?.will?.value ?? lookupSave(partyLevel, 'moderate'), 'moderate')
      : 'moderate'
  );
  const [attacks, setAttacks] = useState<AttackDraft[]>(() =>
    isEditing && editAttacks.length > 0 ? editAttacks : [defaultAttack(partyLevel)]
  );
  const [abilities, setAbilities] = useState<CustomAbility[]>(
    initFromEdit(editCreature?.customData?.abilities ?? [], [])
  );
  const [genericPickerOpen, setGenericPickerOpen] = useState(false);
  const [extraTraits, setExtraTraits] = useState<string[]>(initFromEdit(editExtraTraits, []));
  const [traitInput, setTraitInput] = useState('');
  const traitInputRef = useRef<HTMLInputElement>(null);
  const [allTraits, setAllTraits] = useState<string[]>([]);
  const [focusedAttackIdx, setFocusedAttackIdx] = useState<number | null>(null);
  const [flavorText, setFlavorText] = useState(initFromEdit(editCreature?.customData?.flavorText ?? '', ''));

  // Ability modifiers
  const editAbils = editCreature?.data as any;
  const [strMod, setStrMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.str?.mod ?? 0, 0));
  const [dexMod, setDexMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.dex?.mod ?? 0, 0));
  const [conMod, setConMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.con?.mod ?? 0, 0));
  const [intMod, setIntMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.int?.mod ?? 0, 0));
  const [wisMod, setWisMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.wis?.mod ?? 0, 0));
  const [chaMod, setChaMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.cha?.mod ?? 0, 0));
  const [strTier, setStrTier] = useState<AbilityTier>(() =>
    isEditing ? closestTier(ABILITY_TIERS, t => lookupAbility(editCreature!.level, t), editAbils?.system?.abilities?.str?.mod ?? 0, 'moderate') : 'moderate'
  );
  const [dexTier, setDexTier] = useState<AbilityTier>(() =>
    isEditing ? closestTier(ABILITY_TIERS, t => lookupAbility(editCreature!.level, t), editAbils?.system?.abilities?.dex?.mod ?? 0, 'moderate') : 'moderate'
  );
  const [conTier, setConTier] = useState<AbilityTier>(() =>
    isEditing ? closestTier(ABILITY_TIERS, t => lookupAbility(editCreature!.level, t), editAbils?.system?.abilities?.con?.mod ?? 0, 'moderate') : 'moderate'
  );
  const [intTier, setIntTier] = useState<AbilityTier>(() =>
    isEditing ? closestTier(ABILITY_TIERS, t => lookupAbility(editCreature!.level, t), editAbils?.system?.abilities?.int?.mod ?? 0, 'moderate') : 'moderate'
  );
  const [wisTier, setWisTier] = useState<AbilityTier>(() =>
    isEditing ? closestTier(ABILITY_TIERS, t => lookupAbility(editCreature!.level, t), editAbils?.system?.abilities?.wis?.mod ?? 0, 'moderate') : 'moderate'
  );
  const [chaTier, setChaTier] = useState<AbilityTier>(() =>
    isEditing ? closestTier(ABILITY_TIERS, t => lookupAbility(editCreature!.level, t), editAbils?.system?.abilities?.cha?.mod ?? 0, 'moderate') : 'moderate'
  );

  // Perception
  const [perception, setPerception] = useState<number>(() => {
    if (isEditing) return editAbils?.system?.perception?.mod ?? editAbils?.system?.perception?.value ?? lookupPerception(partyLevel, 'moderate');
    return lookupPerception(partyLevel, 'moderate');
  });
  const [perceptionTier, setPerceptionTier] = useState<SaveTier>(() => {
    if (!isEditing) return 'moderate';
    const val = editAbils?.system?.perception?.mod ?? editAbils?.system?.perception?.value ?? lookupPerception(partyLevel, 'moderate');
    return closestTier(SAVE_TIERS, t => lookupPerception(editCreature!.level, t), val, 'moderate');
  });

  // Speed
  const editSpeeds: CustomSpeed[] = isEditing && editCreature!.customData?.speeds
    ? editCreature!.customData.speeds
    : [{ type: 'land', value: 25 }];
  const [speeds, setSpeeds] = useState<CustomSpeed[]>(initFromEdit(editSpeeds, [{ type: 'land', value: 25 }]));

  // Senses
  const [senses, setSenses] = useState<CustomSense[]>(initFromEdit(editCreature?.customData?.senses ?? [], []));
  const [senseNameInput, setSenseNameInput] = useState('');
  const [senseRangeInput, setSenseRangeInput] = useState('');
  const [focusedSenseInput, setFocusedSenseInput] = useState(false);

  // Immunities
  const [immunities, setImmunities] = useState<CustomImmunity[]>(initFromEdit(editCreature?.customData?.immunities ?? [], []));
  const [immunityInput, setImmunityInput] = useState('');

  // Resistances
  const [resistances, setResistances] = useState<CustomResistance[]>(initFromEdit(editCreature?.customData?.resistances ?? [], []));
  // Weaknesses
  const [weaknesses, setWeaknesses] = useState<CustomResistance[]>(initFromEdit(editCreature?.customData?.weaknesses ?? [], []));

  // Spellcasting
  const [spellcasting, setSpellcasting] = useState<CustomSpellcastingEntry[]>(
    initFromEdit(editCreature?.customData?.spellcasting ?? [], [])
  );

  // Hazard-specific state
  const [hazardHasHealth, setHazardHasHealth] = useState<boolean>(
    isEditing && editIsHazard ? (editCreature!.customData?.hasHealth ?? true) : true
  );
  const [hazardHardness, setHazardHardness] = useState<number>(() => {
    if (isEditing && editIsHazard) return editCreature!.customData?.hardness ?? 0;
    return 0;
  });
  const [hazardStealthDC, setHazardStealthDC] = useState<number>(() => {
    if (isEditing && editIsHazard) return editCreature!.customData?.stealthDC ?? 0;
    return 0;
  });
  const [hazardStealthDCTier, setHazardStealthDCTier] = useState<HazardDCTier>('high');
  const [hazardStealthDetails, setHazardStealthDetails] = useState<string>(
    isEditing && editIsHazard ? (editCreature!.customData?.stealthDetails ?? '') : ''
  );
  const [hazardDisable, setHazardDisable] = useState<string>(
    isEditing && editIsHazard ? (editCreature!.customData?.disable ?? '') : ''
  );
  const [hazardReset, setHazardReset] = useState<string>(
    isEditing && editIsHazard ? (editCreature!.customData?.reset ?? '') : ''
  );
  const [hazardRoutine, setHazardRoutine] = useState<string>(
    isEditing && editIsHazard ? (editCreature!.customData?.routine ?? '') : ''
  );
  // Hazard AC / save tiers (reuse existing ac/fort/ref/will state for values; these tiers drive hazard tier buttons)
  const [hazardAcTier, setHazardAcTier] = useState<HazardDefenseTier>('high');
  const [hazardFortTier, setHazardFortTier] = useState<HazardDefenseTier>('high');
  const [hazardRefTier, setHazardRefTier] = useState<HazardDefenseTier>('high');
  const [hazardWillTier, setHazardWillTier] = useState<HazardDefenseTier>('high');

  // Skills — each skill tracks its active tier so the buttons highlight correctly.
  // When editing, initialise each skill's tier to whichever SAVE_TIERS value is
  // numerically closest to the stored mod (at the creature's level).
  type SkillWithTier = CustomSkill & { tier: SaveTier };
  const [skills, setSkills] = useState<SkillWithTier[]>(() => {
    const raw: CustomSkill[] = isEditing ? (editCreature!.customData?.skills ?? []) : [];
    return raw.map(sk => ({
      ...sk,
      tier: closestTier(SAVE_TIERS, t => lookupSave(editCreature!.level, t), sk.mod, 'moderate'),
    }));
  });
  const [focusedSkillInput, setFocusedSkillInput] = useState(false);
  const [focusedSkillIdx, setFocusedSkillIdx] = useState<number | null>(null);

  // Languages
  const [languages, setLanguages] = useState<string[]>(
    initFromEdit(editCreature?.customData?.languages ?? [], [])
  );
  const [langInput, setLangInput] = useState('');
  const [focusedLangInput, setFocusedLangInput] = useState(false);

  // All Saves Note
  const [allSavesNote, setAllSavesNote] = useState(
    initFromEdit(editCreature?.customData?.allSavesNote ?? '', '')
  );

  const [saving, setSaving] = useState(false);
  const [hazardInfoOpen, setHazardInfoOpen] = useState(false);

  useEffect(() => { getAllTraits().then(setAllTraits).catch(() => {}); }, []);

  function applyTiers(lv: number) {
    setHp(lookupHp(lv, 'moderate'));
    setAc(lookupAc(lv, 'moderate'));
    setFort(lookupSave(lv, 'moderate'));
    setRef(lookupSave(lv, 'moderate'));
    setWill(lookupSave(lv, 'moderate'));
    setHpTier('moderate'); setAcTier('moderate');
    setFortTier('moderate'); setRefTier('moderate'); setWillTier('moderate');
    const abMod = lookupAbility(lv, 'moderate');
    setStrMod(abMod); setDexMod(abMod); setConMod(abMod);
    setIntMod(abMod); setWisMod(abMod); setChaMod(abMod);
    setStrTier('moderate'); setDexTier('moderate'); setConTier('moderate');
    setIntTier('moderate'); setWisTier('moderate'); setChaTier('moderate');
    setPerception(lookupPerception(lv, 'moderate'));
    setPerceptionTier('moderate');
    setSpeeds([{ type: 'land', value: 25 }]);
    setAttacks([defaultAttack(lv)]);
    setAbilities([]);
    setSenses([]); setImmunities([]); setResistances([]); setWeaknesses([]); setSpellcasting([]);
    setSkills([]); setLanguages([]); setAllSavesNote('');

  }

  function applyHazardTiers(lv: number, isComplex: boolean) {
    // Stealth DC defaults to high
    setHazardStealthDC(lookupHazardStealth(lv, 'high'));
    setHazardStealthDCTier('high');
    // Defense defaults
    setHp(lookupHazardHp(lv));
    setHpTier('moderate');
    setAc(lookupHazardAc(lv, 'high'));
    setHazardAcTier('high');
    setFort(lookupHazardSave(lv, 'high'));
    setHazardFortTier('high');
    setRef(lookupHazardSave(lv, 'high'));
    setHazardRefTier('high');
    setWill(lookupHazardSave(lv, 'high'));
    setHazardWillTier('high');
    setHazardHardness(lookupHazardHardness(lv));
    setHazardHasHealth(true);
    // Default attack
    setAttacks([defaultHazardAttack(lv, isComplex)]);
    setAbilities([]);
    setImmunities([]); setResistances([]); setWeaknesses([]);
    setHazardStealthDetails('');
    setHazardDisable('');
    setHazardReset('');
    setHazardRoutine('');
  }

  function goNext() {
    if (entityKind === 'hazard') {
      if (!name.trim() || !hazardType) return;
      if (!isEditing) applyHazardTiers(level, hazardIsComplex);
    } else {
      if (!name.trim() || !creatureType) return;
      if (!isEditing) applyTiers(level);
    }
    setStep(1);
  }

  function addExtraTrait(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t || extraTraits.includes(t)) return;
    setExtraTraits(prev => [...prev, t]);
    setTraitInput('');
  }

  function removeExtraTrait(t: string) {
    setExtraTraits(prev => prev.filter(x => x !== t));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const cleanAttacks: CustomAttack[] = attacks
      .filter(a => a.name.trim())
      .map(a => {
        const dmgStr = buildDamageString(a);
        return {
          name: a.name.trim(),
          type: a.type,
          bonus: a.bonus,
          damage: dmgStr,
          range: a.range,
          traits: a.traits.length ? a.traits : undefined,
          damageTypes: a.damageTypes.length ? a.damageTypes : undefined,
          strikeAbilities: a.strikeAbilities.length ? a.strikeAbilities : undefined,
        };
      });
    const cleanAbilities: CustomAbility[] = abilities
      .filter(a => a.name.trim())
      .map(({ name: n, description, actionType, frequency, trigger, requirements }) => ({
        name: n.trim(), description, actionType,
        frequency: frequency?.trim() || undefined,
        trigger: trigger?.trim() || undefined,
        requirements: requirements?.trim() || undefined,
      }));
    // Preserve ID when editing; generate new one for new creatures
    const id = isEditing ? editCreature!.id : `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const trimmedName = name.trim();

    // Build immunities/resistances/weaknesses for PF2E system blob
    const pf2eImmunities = immunities.map(i => ({ type: i.type }));
    const pf2eResistances = resistances.map(r => ({ type: r.type, value: r.value, exceptions: r.exceptions ? [r.exceptions] : undefined }));
    const pf2eWeaknesses = weaknesses.map(w => ({ type: w.type, value: w.value, exceptions: w.exceptions ? [w.exceptions] : undefined }));

    if (entityKind === 'hazard') {
      // Build hazard traits (hazardType chip + extras; add 'complex' if applicable)
      const hazardTraits = [hazardType, ...(hazardIsComplex ? ['complex'] : []), ...extraTraits];
      const record: CreatureRecord = {
        id,
        entityType: 'hazard',
        name: trimmedName,
        nameLower: trimmedName.toLowerCase(),
        level,
        traits: hazardTraits,
        size: 'med',
        rarity: 'common',
        packSource: 'custom',
        publication: 'Custom',
        blobSha: '',
        isComplex: hazardIsComplex || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {
          _id: id,
          name: trimmedName,
          type: 'hazard',
          items: [],
          system: {
            details: {
              level: { value: level },
              publication: { title: 'Custom' },
              isComplex: hazardIsComplex,
              disable: hazardDisable.trim() || undefined,
              reset: hazardReset.trim() || undefined,
              routine: hazardRoutine.trim() || undefined,
            },
            attributes: {
              ...(hazardHasHealth ? {
                hp: { value: hp, max: hp },
                ac: { value: ac },
                hardness: hazardHardness,
              } : {
                hardness: hazardHardness,
              }),
              hasHealth: hazardHasHealth,
              stealth: { value: hazardStealthDC, details: hazardStealthDetails.trim() || undefined },
              immunities: pf2eImmunities.length ? pf2eImmunities : undefined,
              resistances: pf2eResistances.length ? pf2eResistances : undefined,
              weaknesses: pf2eWeaknesses.length ? pf2eWeaknesses : undefined,
            },
            saves: hazardHasHealth ? { fortitude: { value: fort }, reflex: { value: ref }, will: { value: will } } : undefined,
            traits: { value: hazardTraits, rarity: 'common', size: { value: 'med' } },
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
        customData: {
          attacks: cleanAttacks.length ? cleanAttacks : undefined,
          abilities: cleanAbilities.length ? cleanAbilities : undefined,
          flavorText: flavorText.trim() || undefined,
          immunities: immunities.length ? immunities : undefined,
          resistances: resistances.length ? resistances : undefined,
          weaknesses: weaknesses.length ? weaknesses : undefined,
          hardness: hazardHardness || undefined,
          hasHealth: hazardHasHealth,
          stealthDC: hazardStealthDC || undefined,
          stealthDetails: hazardStealthDetails.trim() || undefined,
          isComplex: hazardIsComplex || undefined,
          disable: hazardDisable.trim() || undefined,
          reset: hazardReset.trim() || undefined,
          routine: hazardRoutine.trim() || undefined,
        },
      };
      await creatureRepository.put(record);
      onSave(record);
      return;
    }

    const allTraitsList = [creatureType.toLowerCase(), ...extraTraits];
    // Build speed string for PF2E system blob
    const landSpeed = speeds.find(s => s.type === 'land');
    const otherSpeeds = speeds.filter(s => s.type !== 'land').map(s => ({ type: s.type, value: s.value, label: s.type }));

    // Build senses for PF2E system blob
    const pf2eSenses = senses.map(s => ({ type: s.name, range: s.range }));

    const record: CreatureRecord = {
      id,
      entityType: 'npc',
      name: trimmedName,
      nameLower: trimmedName.toLowerCase(),
      level,
      traits: allTraitsList,
      size,
      rarity: 'common',
      packSource: 'custom',
      publication: 'Custom',
      blobSha: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        _id: id,
        name: trimmedName,
        type: 'npc',
        items: [],
        system: {
          details: { level: { value: level }, publication: { title: 'Custom' }, languages: { value: languages } },
          attributes: {
            hp: { value: hp, max: hp },
            ac: { value: ac },
            speed: landSpeed ? { value: landSpeed.value, otherSpeeds } : { value: 0, otherSpeeds },
            immunities: pf2eImmunities.length ? pf2eImmunities : undefined,
            resistances: pf2eResistances.length ? pf2eResistances : undefined,
            weaknesses: pf2eWeaknesses.length ? pf2eWeaknesses : undefined,
            allSaves: allSavesNote.trim() ? { value: allSavesNote.trim() } : undefined,
          },
          saves: { fortitude: { value: fort }, reflex: { value: ref }, will: { value: will } },
          abilities: {
            str: { mod: strMod }, dex: { mod: dexMod }, con: { mod: conMod },
            int: { mod: intMod }, wis: { mod: wisMod }, cha: { mod: chaMod },
          },
          perception: { mod: perception, senses: pf2eSenses },
          traits: { value: allTraitsList, rarity: 'common', size: { value: size } },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      customData: {
        attacks: cleanAttacks.length ? cleanAttacks : undefined,
        abilities: cleanAbilities.length ? cleanAbilities : undefined,
        flavorText: flavorText.trim() || undefined,
        speeds: speeds.length ? speeds : undefined,
        senses: senses.length ? senses : undefined,
        immunities: immunities.length ? immunities : undefined,
        resistances: resistances.length ? resistances : undefined,
        weaknesses: weaknesses.length ? weaknesses : undefined,
        spellcasting: spellcasting.length ? spellcasting : undefined,
        skills: skills.length ? skills.map(({ tier: _tier, ...sk }) => sk) : undefined,
        languages: languages.length ? languages : undefined,
        allSavesNote: allSavesNote.trim() || undefined,
      },
    };
    await creatureRepository.put(record);
    onSave(record);
  }

  function updateAttack(i: number, patch: Partial<AttackDraft>) {
    setAttacks(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }

  if (step === 0) {
    const canProceed = name.trim() && (entityKind === 'creature' ? !!creatureType : !!hazardType);
    return (
      <div className={styles.wizard}>
        <div className={styles.wizardHeader}>
          <span className={styles.wizardTitle}>{isEditing ? `Edit: ${editCreature!.name}` : 'New Custom Entry'}</span>
          <button className={styles.cancelBtn} onClick={onCancel}>✕</button>
        </div>
        <div className={styles.wizardBody}>
          <div className={styles.fieldLabel}>Name</div>
          <input
            className={styles.nameInput}
            value={name}
            autoFocus
            onChange={e => setName(e.target.value)}
            placeholder="Name…"
            onKeyDown={e => e.key === 'Enter' && canProceed && goNext()}
          />
          <div className={styles.fieldLabel}>Level</div>
          <div className={styles.levelRow}>
            <button className={styles.stepBtn} onClick={() => setLevel(l => Math.max(-1, l - 1))}>−</button>
            <span className={styles.levelVal}>{level}</span>
            <button className={styles.stepBtn} onClick={() => setLevel(l => Math.min(25, l + 1))}>+</button>
          </div>
          <div className={styles.fieldLabel}>Building a…</div>
          <div className={styles.toggleRow}>
            <button
              className={`${styles.typeChip} ${entityKind === 'creature' ? styles.typeChipActive : ''}`}
              onClick={() => setEntityKind('creature')}
            >Creature</button>
            <button
              className={`${styles.typeChip} ${entityKind === 'hazard' ? styles.typeChipActive : ''}`}
              onClick={() => setEntityKind('hazard')}
            >Hazard</button>
          </div>

          {entityKind === 'hazard' && (
            <>
              <div className={styles.fieldLabel}>Complexity</div>
              <div className={styles.toggleRow}>
                <button
                  className={`${styles.typeChip} ${!hazardIsComplex ? styles.typeChipActive : ''}`}
                  onClick={() => setHazardIsComplex(false)}
                >Simple</button>
                <button
                  className={`${styles.typeChip} ${hazardIsComplex ? styles.typeChipActive : ''}`}
                  onClick={() => setHazardIsComplex(true)}
                >Complex</button>
              </div>
            </>
          )}

          {entityKind === 'creature' && (
            <>
              <div className={styles.fieldLabel}>Size</div>
              <div className={styles.typeGrid}>
                {SIZES.map(s => (
                  <button
                    key={s.value}
                    className={`${styles.typeChip} ${size === s.value ? styles.typeChipActive : ''}`}
                    onClick={() => setSize(s.value)}
                  >{s.label}</button>
                ))}
              </div>
              <div className={styles.fieldLabel}>Creature Type</div>
              <div className={styles.typeGrid}>
                {CREATURE_TYPES.map(t => (
                  <button
                    key={t}
                    className={`${styles.typeChip} ${creatureType === t ? styles.typeChipActive : ''}`}
                    onClick={() => setCreatureType(t)}
                  >{t}</button>
                ))}
              </div>
            </>
          )}

          {entityKind === 'hazard' && (
            <>
              <div className={styles.fieldLabel}>Hazard Type</div>
              <div className={styles.typeGrid}>
                {HAZARD_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`${styles.typeChip} ${hazardType === t.value ? styles.typeChipActive : ''}`}
                    onClick={() => setHazardType(t.value)}
                  >{t.label}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className={styles.wizardFooter}>
          <button className={styles.primaryBtn} onClick={goNext} disabled={!canProceed}>
            Next →
          </button>
          <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.wizardHeader}>
        <span className={styles.wizardTitle}>{name} (Lvl {level})</span>
        <button className={styles.cancelBtn} onClick={onCancel}>✕</button>
      </div>
      {entityKind === 'hazard' ? (
        <div className={styles.wizardHintRow}>
          <span className={styles.wizardHint}>Click a tier to prefill · L=Low H=High E=Extreme · Attacks: L=level−1 M=at-level H=level+1</span>
          <button className={styles.infoBtn} onClick={() => setHazardInfoOpen(o => !o)} title="Hazard design tips">?</button>
        </div>
      ) : (
        <div className={styles.wizardHint}>Click a tier to prefill · T=Terrible L=Low M=Moderate H=High E=Extreme</div>
      )}
      {hazardInfoOpen && entityKind === 'hazard' && (
        <div className={styles.hazardInfoPanel}>
          <button className={styles.hazardInfoClose} onClick={() => setHazardInfoOpen(false)}>✕</button>
          <p className={styles.hazardInfoHeading}>Designing Simple Hazards</p>
          <p className={styles.hazardInfoBody}>When designing a simple hazard, make sure to select an appropriate trigger and effect. Often, a simple hazard that merely damages its target is little more than a speed bump that slows down the game without much added value, so think about the purpose of your hazard carefully, both in the story and in the game world, especially when it's a hazard that a creature intentionally built or placed in that location. A great simple hazard does something interesting, has a longer-lasting consequence, or integrates with the nearby inhabitants or even the encounters in some way.</p>
          <p className={styles.hazardInfoHeading}>Designing Complex Hazards</p>
          <p className={styles.hazardInfoBody}>Unlike a simple hazard, a complex hazard can play the part of a creature in a battle, or can be an encounter all its own. Many of the concerns with damaging effects when designing a simple hazard don't apply when designing a complex hazard. A complex hazard can apply its damage over and over again, eventually killing its hapless victim, and isn't intended to be a quick-to-overcome obstacle.</p>
          <p className={styles.hazardInfoBody}>A good complex hazard often requires disabling multiple components or otherwise interacting with the encounter in some way. For instance, while the poisoned dart gallery requires only one Thievery check to disable, the control panel is on the far end of the gallery, so a PC would need to make their way across first.</p>
          <p className={styles.hazardInfoHeading}>Building Routines</p>
          <p className={styles.hazardInfoBody}>A complex hazard has a routine each round, whether it stems from preprogrammed instructions built into a trap, instincts and residual emotions swirling around a complex haunt, or a force of nature like sinking in quicksand. Make sure to build a routine that makes sense for the hazard; an environmental lava chute that ejects lava into the area each round shouldn't be able to seek out and precisely target only the PCs, but it might spatter random areas within range or everything within range, depending on how you describe the hazard. However, a complex haunt might be able to recognize life force and target living creatures.</p>
          <p className={styles.hazardInfoBody}>If you create a hazard that can't consistently attack the PCs (like the blade pillar, which moves in a random direction), you can make it deadlier than normal in other ways.</p>
          <p className={styles.hazardInfoBody}>The hazard should have as many actions as you feel it needs to perform its routine. If you split the routine out into several actions, you can also remove some of the hazard's actions once partial progress is made in disabling or destroying it; this can give the PCs a feeling of progress, and it can encourage them to handle the hazard if it appears in an encounter alongside creatures.</p>
        </div>
      )}
      <div className={styles.wizardBody}>
        {/* Traits */}
        <div className={styles.sectionHead}>Traits</div>
        <div className={styles.traitRow}>
          <span className={styles.traitChipFixed}>{entityKind === 'hazard' ? HAZARD_TYPES.find(h => h.value === hazardType)?.label ?? hazardType : creatureType}</span>
          {entityKind === 'hazard' && hazardIsComplex && (
            <span className={styles.traitChipFixed}>complex</span>
          )}
          {extraTraits.map(t => (
            <span key={t} className={styles.traitChipExtra}>
              {t}
              <button className={styles.traitRemove} onClick={() => removeExtraTrait(t)}>×</button>
            </span>
          ))}
        </div>
        <div className={styles.traitInputRow}>
          <div className={styles.traitInputWrap}>
            <input
              ref={traitInputRef}
              className={styles.traitInput}
              value={traitInput}
              onChange={e => setTraitInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addExtraTrait(traitInput); }
                if (e.key === 'Tab' && traitInput.length > 0) {
                  const suggestions = rankSuggestions(allTraits, traitInput)
                    .filter(t => !extraTraits.includes(t) && t !== creatureType.toLowerCase())
                    .slice(0, 10);
                  if (suggestions.length > 0) { e.preventDefault(); addExtraTrait(suggestions[0]); }
                }
              }}
              placeholder="Add trait… (Enter to add)"
            />
            {traitInput.length > 0 && (() => {
              const suggestions = rankSuggestions(allTraits, traitInput)
                .filter(t => !extraTraits.includes(t) && t !== creatureType.toLowerCase())
                .slice(0, 10);
              return suggestions.length > 0 ? (
                <ul className={styles.suggestions}>
                  {suggestions.map(t => (
                    <li key={t} className={styles.suggestion} onMouseDown={e => { e.preventDefault(); addExtraTrait(t); }}>{t}</li>
                  ))}
                </ul>
              ) : null;
            })()}
          </div>
          <button className={styles.addBtn} onClick={() => addExtraTrait(traitInput)}>+ Add</button>
        </div>

        {/* Stealth (hazard) or Perception (creature) */}
        {entityKind === 'hazard' ? (
          <>
            <div className={styles.sectionHead}>Stealth</div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>DC</span>
              <div className={styles.tierBtns} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {HAZARD_DC_TIERS.map(t => (
                  <button key={t} title={t}
                    className={`${styles.tierBtn} ${hazardStealthDCTier === t ? styles.tierBtnActive : ''}`}
                    style={{ gridColumn: HAZARD_TIER_COL[t] }}
                    onClick={() => { setHazardStealthDCTier(t); setHazardStealthDC(lookupHazardStealth(level, t)); }}
                  >{HAZARD_TIER_ABBREV[t]}</button>
                ))}
              </div>
              <input className={styles.statInput} type="number" min={0} max={80}
                value={hazardStealthDC} onChange={e => setHazardStealthDC(Number(e.target.value))} />
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel} style={{ width: 'auto', marginRight: 6 }}>Details</span>
              <input
                className={styles.attackNameInput}
                value={hazardStealthDetails}
                onChange={e => setHazardStealthDetails(e.target.value)}
                placeholder="e.g. legendary, or detect magic"
              />
            </div>
          </>
        ) : (
          <>
            <div className={styles.sectionHead}>Perception</div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Perc</span>
              <div className={styles.tierBtns}>
                {SAVE_TIERS.map(t => (
                  <button key={t} title={t}
                    className={`${styles.tierBtn} ${perceptionTier === t ? styles.tierBtnActive : ''}`}
                    style={{ gridColumn: TIER_COL[t] }}
                    onClick={() => { setPerceptionTier(t); setPerception(lookupPerception(level, t)); }}
                  >{TIER_ABBREV[t]}</button>
                ))}
              </div>
              <input className={styles.statInput} type="number" min={-10} max={80}
                value={perception} onChange={e => setPerception(Number(e.target.value))} />
            </div>
          </>
        )}

        {/* Defenses */}
        <div className={styles.sectionHead}>Defenses</div>
        {entityKind === 'hazard' ? (
          <>
            {/* Has Physical Component toggle */}
            <div className={styles.statRow}>
              <span className={styles.statLabel} style={{ width: 'auto', marginRight: 8 }}>Has Physical Component</span>
              <div className={styles.toggleRow}>
                <button
                  className={`${styles.typeChip} ${hazardHasHealth ? styles.typeChipActive : ''}`}
                  onClick={() => setHazardHasHealth(true)}
                >Yes</button>
                <button
                  className={`${styles.typeChip} ${!hazardHasHealth ? styles.typeChipActive : ''}`}
                  onClick={() => setHazardHasHealth(false)}
                >No</button>
              </div>
            </div>
            {hazardHasHealth && (
              <>
                {/* AC */}
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>AC</span>
                  <div className={styles.tierBtns} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {HAZARD_DEFENSE_TIERS.map(t => (
                      <button key={t} title={t}
                        className={`${styles.tierBtn} ${hazardAcTier === t ? styles.tierBtnActive : ''}`}
                        style={{ gridColumn: HAZARD_TIER_COL[t] }}
                        onClick={() => { setHazardAcTier(t); setAc(lookupHazardAc(level, t)); }}
                      >{HAZARD_TIER_ABBREV[t]}</button>
                    ))}
                  </div>
                  <input className={styles.statInput} type="number" min={1} max={99}
                    value={ac} onChange={e => setAc(Number(e.target.value))} />
                </div>
                {/* Hardness */}
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Hardness</span>
                  <input className={styles.statInput} type="number" min={0} max={99}
                    value={hazardHardness} onChange={e => setHazardHardness(Number(e.target.value))} />
                </div>
                {/* Fort */}
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Fort</span>
                  <div className={styles.tierBtns} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {HAZARD_DEFENSE_TIERS.map(t => (
                      <button key={t} title={t}
                        className={`${styles.tierBtn} ${hazardFortTier === t ? styles.tierBtnActive : ''}`}
                        style={{ gridColumn: HAZARD_TIER_COL[t] }}
                        onClick={() => { setHazardFortTier(t); setFort(lookupHazardSave(level, t)); }}
                      >{HAZARD_TIER_ABBREV[t]}</button>
                    ))}
                  </div>
                  <input className={styles.statInput} type="number" min={-10} max={60}
                    value={fort} onChange={e => setFort(Number(e.target.value))} />
                </div>
                {/* Ref */}
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Ref</span>
                  <div className={styles.tierBtns} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {HAZARD_DEFENSE_TIERS.map(t => (
                      <button key={t} title={t}
                        className={`${styles.tierBtn} ${hazardRefTier === t ? styles.tierBtnActive : ''}`}
                        style={{ gridColumn: HAZARD_TIER_COL[t] }}
                        onClick={() => { setHazardRefTier(t); setRef(lookupHazardSave(level, t)); }}
                      >{HAZARD_TIER_ABBREV[t]}</button>
                    ))}
                  </div>
                  <input className={styles.statInput} type="number" min={-10} max={60}
                    value={ref} onChange={e => setRef(Number(e.target.value))} />
                </div>
                {/* Will */}
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Will</span>
                  <div className={styles.tierBtns} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {HAZARD_DEFENSE_TIERS.map(t => (
                      <button key={t} title={t}
                        className={`${styles.tierBtn} ${hazardWillTier === t ? styles.tierBtnActive : ''}`}
                        style={{ gridColumn: HAZARD_TIER_COL[t] }}
                        onClick={() => { setHazardWillTier(t); setWill(lookupHazardSave(level, t)); }}
                      >{HAZARD_TIER_ABBREV[t]}</button>
                    ))}
                  </div>
                  <input className={styles.statInput} type="number" min={-10} max={60}
                    value={will} onChange={e => setWill(Number(e.target.value))} />
                </div>
                {/* HP */}
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>HP</span>
                  <input className={styles.statInput} type="number" min={1} max={9999}
                    value={hp} onChange={e => setHp(Number(e.target.value))} />
                  <span className={styles.subLabel} style={{ marginLeft: 6 }}>BT {Math.floor(hp / 2)}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {([
              { label: 'HP',   tiers: HP_TIERS,   tier: hpTier,   setTier: (t: HpTier)   => { setHpTier(t);   setHp(lookupHp(level, t));     }, val: hp,   setVal: setHp,   min: 1,   max: 9999 },
              { label: 'AC',   tiers: AC_TIERS,   tier: acTier,   setTier: (t: AcTier)   => { setAcTier(t);   setAc(lookupAc(level, t));     }, val: ac,   setVal: setAc,   min: 1,   max: 99   },
              { label: 'Fort', tiers: SAVE_TIERS, tier: fortTier, setTier: (t: SaveTier) => { setFortTier(t); setFort(lookupSave(level, t)); }, val: fort, setVal: setFort, min: -10, max: 60   },
              { label: 'Ref',  tiers: SAVE_TIERS, tier: refTier,  setTier: (t: SaveTier) => { setRefTier(t);  setRef(lookupSave(level, t));  }, val: ref,  setVal: setRef,  min: -10, max: 60   },
              { label: 'Will', tiers: SAVE_TIERS, tier: willTier, setTier: (t: SaveTier) => { setWillTier(t); setWill(lookupSave(level, t)); }, val: will, setVal: setWill, min: -10, max: 60   },
            ] as const).map(({ label, tiers, tier, setTier, val, setVal, min, max }) => (
              <div key={label} className={styles.statRow}>
                <span className={styles.statLabel}>{label}</span>
                <div className={styles.tierBtns}>
                  {(tiers as readonly string[]).map(t => (
                    <button
                      key={t}
                      title={t.charAt(0).toUpperCase() + t.slice(1)}
                      className={`${styles.tierBtn} ${tier === t ? styles.tierBtnActive : ''}`}
                      style={{ gridColumn: TIER_COL[t as keyof typeof TIER_COL] }}
                      onClick={() => (setTier as (t: string) => void)(t)}
                    >{TIER_ABBREV[t as keyof typeof TIER_ABBREV]}</button>
                  ))}
                </div>
                <input
                  className={styles.statInput}
                  type="number" min={min} max={max}
                  value={val}
                  onChange={e => setVal(Number(e.target.value))}
                />
              </div>
            ))}
            <div className={styles.statRow}>
              <span className={styles.statLabel} style={{ width: 'auto', marginRight: 6 }}>All Saves Note</span>
              <input
                className={styles.attackNameInput}
                value={allSavesNote}
                onChange={e => setAllSavesNote(e.target.value)}
                placeholder="e.g. +1 status bonus to all saves vs. magic"
              />
            </div>
          </>
        )}

        {/* Skills — creatures only */}
        {entityKind !== 'hazard' && <div className={styles.sectionHead}>
          Skills
          <button className={styles.addBtn} onClick={() => setSkills(prev => [...prev, { name: '', mod: lookupSave(level, 'moderate'), tier: 'moderate' }])}>+ Add Skill</button>
        </div>}
        {entityKind !== 'hazard' && skills.map((sk, i) => (
          <div key={i} className={styles.statRow}>
            <div className={styles.attackTraitInputWrap} style={{ flex: 1 }}>
              <input
                className={styles.attackNameInput}
                value={sk.name}
                placeholder="Skill name…"
                onChange={e => setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                onFocus={() => { setFocusedSkillInput(true); setFocusedSkillIdx(i); }}
                onBlur={() => { setFocusedSkillInput(false); setFocusedSkillIdx(null); }}
                onKeyDown={e => {
                  if (e.key === 'Tab' && sk.name.length > 0) {
                    const q = sk.name.toLowerCase();
                    const sugg = rankSuggestions(OFFICIAL_SKILLS, q).filter(s => s.toLowerCase() !== sk.name.toLowerCase()).slice(0, 8);
                    if (sugg.length > 0) { e.preventDefault(); setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, name: sugg[0] } : s)); }
                  }
                }}
              />
              {focusedSkillInput && focusedSkillIdx === i && sk.name.length > 0 && (() => {
                const q = sk.name.toLowerCase();
                const sugg = rankSuggestions(OFFICIAL_SKILLS, q).filter(s => s.toLowerCase() !== sk.name.toLowerCase()).slice(0, 8);
                return sugg.length > 0 ? (
                  <ul className={styles.suggestions}>
                    {sugg.map(s => (
                      <li key={s} className={styles.suggestion} onMouseDown={e => {
                        e.preventDefault();
                        setSkills(prev => prev.map((x, idx) => idx === i ? { ...x, name: s } : x));
                      }}>{s}</li>
                    ))}
                  </ul>
                ) : null;
              })()}
            </div>
            <div className={styles.tierBtns}>
              {SAVE_TIERS.map(t => (
                <button key={t} title={t}
                  className={`${styles.tierBtn} ${sk.tier === t ? styles.tierBtnActive : ''}`}
                  style={{ gridColumn: TIER_COL[t] }}
                  onClick={() => setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, tier: t, mod: lookupSave(level, t) } : s))}
                >{TIER_ABBREV[t]}</button>
              ))}
            </div>
            <input className={styles.statInput} type="number" min={-10} max={80}
              value={sk.mod}
              onChange={e => setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, mod: Number(e.target.value) } : s))} />
            <button className={styles.removeBtn} onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))}>×</button>
          </div>
        ))}

        {/* Languages — creatures only */}
        {entityKind !== 'hazard' && (
          <>
            <div className={styles.sectionHead}>Languages</div>
            <div className={styles.traitRow}>
              {languages.map((lang, i) => (
                <span key={i} className={styles.traitChipExtra}>
                  {lang}
                  <button className={styles.traitRemove} onClick={() => setLanguages(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </span>
              ))}
            </div>
            <div className={styles.traitInputRow}>
              <div className={styles.traitInputWrap}>
                <input
                  className={styles.traitInput}
                  value={langInput}
                  onChange={e => setLangInput(e.target.value)}
                  onFocus={() => setFocusedLangInput(true)}
                  onBlur={() => setFocusedLangInput(false)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const t = langInput.trim();
                      if (t && !languages.includes(t)) setLanguages(prev => [...prev, t]);
                      setLangInput('');
                    }
                    if (e.key === 'Tab' && langInput.length > 0) {
                      const q = langInput.toLowerCase();
                      const sugg = rankSuggestions(LANGUAGE_SUGGESTIONS, q).filter(l => !languages.includes(l)).slice(0, 8);
                      if (sugg.length > 0) { e.preventDefault(); if (!languages.includes(sugg[0])) setLanguages(prev => [...prev, sugg[0]]); setLangInput(''); }
                    }
                  }}
                  placeholder="Add language… (Enter to add)"
                />
                {focusedLangInput && langInput.length > 0 && (() => {
                  const q = langInput.toLowerCase();
                  const sugg = rankSuggestions(LANGUAGE_SUGGESTIONS, q).filter(l => !languages.includes(l)).slice(0, 8);
                  return sugg.length > 0 ? (
                    <ul className={styles.suggestions}>
                      {sugg.map(l => (
                        <li key={l} className={styles.suggestion} onMouseDown={e => {
                          e.preventDefault();
                          if (!languages.includes(l)) setLanguages(prev => [...prev, l]);
                          setLangInput('');
                        }}>{l}</li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </div>
              <button className={styles.addBtn} onClick={() => {
                const t = langInput.trim();
                if (t && !languages.includes(t)) setLanguages(prev => [...prev, t]);
                setLangInput('');
              }}>+ Add</button>
            </div>
          </>
        )}

        {/* Senses — creatures only */}
        {entityKind !== 'hazard' && (
          <>
            <div className={styles.sectionHead}>Senses</div>
            {senses.map((s, i) => (
              <div key={i} className={styles.senseRow}>
                <span className={styles.senseChip}>
                  {s.name}{s.range != null ? ` ${s.range} ft.` : ''}
                  <button className={styles.traitRemove} onClick={() => setSenses(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </span>
              </div>
            ))}
            <div className={styles.senseInputRow}>
              <div className={styles.senseNameWrap}>
                <input
                  className={styles.traitInput}
                  value={senseNameInput}
                  onChange={e => setSenseNameInput(e.target.value)}
                  onFocus={() => setFocusedSenseInput(true)}
                  onBlur={() => setFocusedSenseInput(false)}
                  placeholder="Sense name…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const n = senseNameInput.trim().toLowerCase();
                      if (!n) return;
                      const range = senseRangeInput.trim() ? Number(senseRangeInput) : undefined;
                      setSenses(prev => [...prev, { name: n, range }]);
                      setSenseNameInput(''); setSenseRangeInput('');
                    }
                    if (e.key === 'Tab' && senseNameInput.length > 0) {
                      const q = senseNameInput.toLowerCase();
                      const sugg = rankSuggestions(COMMON_SENSES, q).filter(s => !senses.some(x => x.name === s));
                      if (sugg.length > 0) { e.preventDefault(); setSenseNameInput(sugg[0]); }
                    }
                  }}
                />
                {focusedSenseInput && senseNameInput.length > 0 && (() => {
                  const q = senseNameInput.toLowerCase();
                  const sugg = rankSuggestions(COMMON_SENSES, q).filter(s => !senses.some(x => x.name === s));
                  return sugg.length > 0 ? (
                    <ul className={styles.suggestions}>
                      {sugg.map(s => (
                        <li key={s} className={styles.suggestion} onMouseDown={e => {
                          e.preventDefault();
                          setSenseNameInput(s);
                        }}>{s}</li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </div>
              <input className={styles.senseRangeInput} type="number" min={0} step={5}
                value={senseRangeInput} onChange={e => setSenseRangeInput(e.target.value)}
                placeholder="Range ft (blank=∞)" />
              <button className={styles.addBtn} onMouseDown={e => {
                e.preventDefault();
                const n = senseNameInput.trim().toLowerCase();
                if (!n) return;
                const range = senseRangeInput.trim() ? Number(senseRangeInput) : undefined;
                setSenses(prev => [...prev, { name: n, range }]);
                setSenseNameInput(''); setSenseRangeInput('');
              }}>+ Add</button>
            </div>
          </>
        )}

        {/* Ability Modifiers — creatures only */}
        {entityKind !== 'hazard' && (
          <>
            <div className={styles.sectionHead}>Ability Modifiers</div>
            {([
              { label: 'Str', val: strMod, setVal: setStrMod, tier: strTier, setTier: (t: AbilityTier) => { setStrTier(t); setStrMod(lookupAbility(level, t)); } },
              { label: 'Dex', val: dexMod, setVal: setDexMod, tier: dexTier, setTier: (t: AbilityTier) => { setDexTier(t); setDexMod(lookupAbility(level, t)); } },
              { label: 'Con', val: conMod, setVal: setConMod, tier: conTier, setTier: (t: AbilityTier) => { setConTier(t); setConMod(lookupAbility(level, t)); } },
              { label: 'Int', val: intMod, setVal: setIntMod, tier: intTier, setTier: (t: AbilityTier) => { setIntTier(t); setIntMod(lookupAbility(level, t)); } },
              { label: 'Wis', val: wisMod, setVal: setWisMod, tier: wisTier, setTier: (t: AbilityTier) => { setWisTier(t); setWisMod(lookupAbility(level, t)); } },
              { label: 'Cha', val: chaMod, setVal: setChaMod, tier: chaTier, setTier: (t: AbilityTier) => { setChaTier(t); setChaMod(lookupAbility(level, t)); } },
            ] as const).map(({ label, val, setVal, tier, setTier }) => (
              <div key={label} className={styles.statRow}>
                <span className={styles.statLabel}>{label}</span>
                <div className={styles.tierBtns}>
                  {ABILITY_TIERS.map(t => {
                    const isHidden = (level <= 0) && t === 'extreme';
                    return isHidden ? null : (
                      <button key={t} title={t}
                        className={`${styles.tierBtn} ${tier === t ? styles.tierBtnActive : ''}`}
                        style={{ gridColumn: TIER_COL[t] }}
                        onClick={() => (setTier as (t: AbilityTier) => void)(t)}
                      >{TIER_ABBREV[t]}</button>
                    );
                  })}
                </div>
                <input className={styles.statInput} type="number" min={-5} max={20}
                  value={val} onChange={e => (setVal as (n: number) => void)(Number(e.target.value))} />
              </div>
            ))}
          </>
        )}

        {/* Speed — creatures only */}
        {entityKind !== 'hazard' && (
          <>
            <div className={styles.sectionHead}>Speed</div>
            {(['land', 'climb', 'swim', 'burrow', 'fly'] as SpeedType[]).map(type => {
              const entry = speeds.find(s => s.type === type);
              const active = entry != null;
              return (
                <div key={type} className={styles.speedRow}>
                  <button
                    className={`${styles.speedToggle} ${active ? styles.speedToggleActive : ''}`}
                    onClick={() => {
                      if (active) {
                        setSpeeds(prev => prev.filter(s => s.type !== type));
                      } else {
                        setSpeeds(prev => [...prev, { type, value: 25 }]);
                      }
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                  {active && (
                    <>
                      <button className={styles.stepBtn}
                        onClick={() => setSpeeds(prev => prev.map(s => s.type === type ? { ...s, value: Math.max(0, s.value - 5) } : s))}>−</button>
                      <span className={styles.levelVal}>{entry!.value}</span>
                      <button className={styles.stepBtn}
                        onClick={() => setSpeeds(prev => prev.map(s => s.type === type ? { ...s, value: s.value + 5 } : s))}>+</button>
                      <span className={styles.subLabel}>ft</span>
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Immunities */}
        <div className={styles.sectionHead}>Immunities</div>
        <div className={styles.traitRow}>
          {immunities.map((im, i) => (
            <span key={i} className={styles.traitChipExtra}>
              {im.type}
              <button className={styles.traitRemove} onClick={() => setImmunities(prev => prev.filter((_, idx) => idx !== i))}>×</button>
            </span>
          ))}
        </div>
        <div className={styles.traitInputRow}>
          <div className={styles.traitInputWrap}>
            <input className={styles.traitInput} value={immunityInput}
              onChange={e => setImmunityInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const t = immunityInput.trim().toLowerCase();
                  if (t && !immunities.some(i => i.type === t)) setImmunities(prev => [...prev, { type: t }]);
                  setImmunityInput('');
                }
                if (e.key === 'Tab' && immunityInput.length > 0) {
                  const q = immunityInput.toLowerCase();
                  const sugg = rankSuggestions(DAMAGE_TYPES, q).filter(d => !immunities.some(i => i.type === d)).slice(0, 8);
                  if (sugg.length > 0) { e.preventDefault(); if (!immunities.some(i => i.type === sugg[0])) setImmunities(prev => [...prev, { type: sugg[0] }]); setImmunityInput(''); }
                }
              }}
              placeholder="Add immunity… (Enter to add)"
            />
            {immunityInput.length > 0 && (() => {
              const q = immunityInput.toLowerCase();
              const sugg = rankSuggestions(DAMAGE_TYPES, q).filter(d => !immunities.some(i => i.type === d)).slice(0, 8);
              return sugg.length > 0 ? (
                <ul className={styles.suggestions}>
                  {sugg.map(d => (
                    <li key={d} className={styles.suggestion} onMouseDown={e => {
                      e.preventDefault();
                      if (!immunities.some(i => i.type === d)) setImmunities(prev => [...prev, { type: d }]);
                      setImmunityInput('');
                    }}>{d}</li>
                  ))}
                </ul>
              ) : null;
            })()}
          </div>
          <button className={styles.addBtn} onClick={() => {
            const t = immunityInput.trim().toLowerCase();
            if (t && !immunities.some(i => i.type === t)) setImmunities(prev => [...prev, { type: t }]);
            setImmunityInput('');
          }}>+ Add</button>
        </div>

        {/* Resistances */}
        <div className={styles.sectionHead}>
          Resistances
          <button className={styles.addBtn} onClick={() => setResistances(prev => [...prev, { type: '', value: lookupResWeak(level, 'moderate') }])}>+ Add</button>
        </div>
        {resistances.map((r, i) => (
          <ResWeakRow key={i} entry={r} level={level}
            onChange={patch => setResistances(prev => prev.map((x, idx) => idx === i ? { ...x, ...patch } : x))}
            onRemove={() => setResistances(prev => prev.filter((_, idx) => idx !== i))}
          />
        ))}

        {/* Weaknesses */}
        <div className={styles.sectionHead}>
          Weaknesses
          <button className={styles.addBtn} onClick={() => setWeaknesses(prev => [...prev, { type: '', value: lookupResWeak(level, 'moderate') }])}>+ Add</button>
        </div>
        {weaknesses.map((w, i) => (
          <ResWeakRow key={i} entry={w} level={level}
            onChange={patch => setWeaknesses(prev => prev.map((x, idx) => idx === i ? { ...x, ...patch } : x))}
            onRemove={() => setWeaknesses(prev => prev.filter((_, idx) => idx !== i))}
          />
        ))}

        {/* Hazard Details — hazards only */}
        {entityKind === 'hazard' && (
          <>
            <div className={styles.sectionHead}>Hazard Details</div>
            <div className={styles.fieldLabel}>Disable</div>
            <textarea
              className={styles.descInput}
              value={hazardDisable}
              onChange={e => setHazardDisable(e.target.value)}
              placeholder="Disable description (HTML or plain text)…"
              rows={3}
            />
            <div className={styles.fieldLabel}>Reset</div>
            <textarea
              className={styles.descInput}
              value={hazardReset}
              onChange={e => setHazardReset(e.target.value)}
              placeholder="Reset description (HTML or plain text)…"
              rows={2}
            />
            {hazardIsComplex && (
              <>
                <div className={styles.fieldLabel}>Routine</div>
                <textarea
                  className={styles.descInput}
                  value={hazardRoutine}
                  onChange={e => setHazardRoutine(e.target.value)}
                  placeholder="Routine description (HTML or plain text)…"
                  rows={3}
                />
              </>
            )}
          </>
        )}

        {/* Attacks */}
        <div className={styles.sectionHead}>
          Attacks
          <button className={styles.addBtn} onClick={() => setAttacks(prev => [
            ...prev,
            entityKind === 'hazard' ? defaultHazardAttack(level, hazardIsComplex) : defaultAttack(level),
          ])}>+ Add</button>
        </div>
        {attacks.map((atk, i) => (
          <AttackCard
            key={i}
            atk={atk}
            attackIdx={i}
            level={level}
            entityKind={entityKind}
            hazardIsComplex={hazardIsComplex}
            focusedAttackIdx={focusedAttackIdx}
            setFocusedAttackIdx={setFocusedAttackIdx}
            updateAttack={updateAttack}
            onRemove={() => setAttacks(prev => prev.filter((_, idx) => idx !== i))}
          />
        ))}

        {/* Abilities */}
        <div className={styles.sectionHead}>
          Abilities
          <div className={styles.addBtnGroup}>
            <button className={styles.addBtn} onClick={() => { setGenericPickerOpen(false); setAbilities(prev => [...prev, { name: '', description: '' }]); }}>+ Custom</button>
            {entityKind !== 'hazard' && (
              <button
                className={styles.addBtn}
                onClick={() => setGenericPickerOpen(v => !v)}
              >
                {genericPickerOpen ? '− Generic' : '+ Generic'}
              </button>
            )}
          </div>
        </div>
        {genericPickerOpen && entityKind !== 'hazard' && (
          <GenericAbilityPicker
            level={level}
            strikeNames={attacks.filter(a => a.name.trim()).map(a => a.name.trim())}
            onInsert={ability => {
              setAbilities(prev => [...prev, ability]);
              setGenericPickerOpen(false);
            }}
            onClose={() => setGenericPickerOpen(false)}
          />
        )}
        {abilities.map((ab, i) => (
          <AbilityCard
            key={i}
            ability={ab}
            onChange={patch => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a))}
            onRemove={() => setAbilities(prev => prev.filter((_, idx) => idx !== i))}
            entityKind={entityKind}
            level={level}
            hazardIsComplex={hazardIsComplex}
            isGeneric={ab.genericAbilityName != null}
          />
        ))}
        {/* Spellcasting — creatures only */}
        {entityKind !== 'hazard' && (
          <>
          <div className={styles.sectionHead}>
            Spellcasting
            <button className={styles.addBtn} onClick={() => setSpellcasting(prev => [...prev, {
              id: `spell-${Date.now()}`,
              name: '',
              tradition: 'arcane',
              type: 'innate',
              dc: lookupSave(level, 'moderate'),
              attackMod: lookupAttack(level, 'moderate'),
              spells: [],
            }])}>+ Add Spellcasting Block</button>
          </div>
          {spellcasting.map((entry, ei) => {
          const hasFocusSpell = entry.spells.some(s => s.frequency === 'focus');
          function updateEntry(patch: Partial<CustomSpellcastingEntry>) {
            setSpellcasting(prev => prev.map((e, idx) => idx === ei ? { ...e, ...patch } : e));
          }
          function updateSpell(si: number, patch: Partial<CustomSpell>) {
            setSpellcasting(prev => prev.map((e, idx) => idx === ei
              ? { ...e, spells: e.spells.map((s, sidx) => sidx === si ? { ...s, ...patch } : s) }
              : e
            ));
          }
          function removeSpell(si: number) {
            setSpellcasting(prev => prev.map((e, idx) => idx === ei
              ? { ...e, spells: e.spells.filter((_, sidx) => sidx !== si) }
              : e
            ));
          }
          return (
            <div key={entry.id} className={styles.spellcastingBlock}>
              {/* Block Header */}
              <div className={styles.attackRow1}>
                <input
                  className={styles.attackNameInput}
                  value={entry.name}
                  onChange={e => updateEntry({ name: e.target.value })}
                  placeholder="e.g. Arcane Innate Spells"
                />
                <button className={styles.removeBtn} onClick={() => setSpellcasting(prev => prev.filter((_, idx) => idx !== ei))}>×</button>
              </div>
              {/* Tradition selector */}
              <div className={styles.spellSelectorRow}>
                <span className={styles.subLabel}>Tradition</span>
                <div className={styles.actionTypeRow}>
                  {(['arcane', 'divine', 'occult', 'primal'] as SpellTradition[]).map(t => (
                    <button key={t}
                      className={`${styles.actionTypeBtn} ${entry.tradition === t ? styles.actionTypeBtnActive : ''}`}
                      onClick={() => updateEntry({ tradition: t })}
                    >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                  ))}
                </div>
              </div>
              {/* Type selector */}
              <div className={styles.spellSelectorRow}>
                <span className={styles.subLabel}>Type</span>
                <div className={styles.actionTypeRow}>
                  {(['prepared', 'spontaneous', 'innate'] as SpellcastingType[]).map(t => (
                    <button key={t}
                      className={`${styles.actionTypeBtn} ${entry.type === t ? styles.actionTypeBtnActive : ''}`}
                      onClick={() => updateEntry({ type: t })}
                    >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                  ))}
                </div>
              </div>
              {/* DC field */}
              <div className={styles.attackRow2}>
                <span className={styles.subLabel}>DC</span>
                <div className={styles.tierBtns}>
                  {SAVE_TIERS.map(t => (
                    <button key={t} title={t}
                      className={`${styles.tierBtn}`}
                      style={{ gridColumn: TIER_COL[t] }}
                      onClick={() => updateEntry({ dc: lookupSave(level, t) })}
                    >{TIER_ABBREV[t]}</button>
                  ))}
                </div>
                <input className={styles.statInput} type="number" min={1} max={60}
                  value={entry.dc}
                  onChange={e => updateEntry({ dc: Number(e.target.value) })} />
                <span className={styles.subLabel}>Atk</span>
                <div className={styles.tierBtns}>
                  {AC_TIERS.map(t => (
                    <button key={t} title={t}
                      className={`${styles.tierBtn}`}
                      style={{ gridColumn: TIER_COL[t] }}
                      onClick={() => updateEntry({ attackMod: lookupAttack(level, t) })}
                    >{TIER_ABBREV[t]}</button>
                  ))}
                </div>
                <input className={styles.statInput} type="number" min={-10} max={70}
                  value={entry.attackMod}
                  onChange={e => updateEntry({ attackMod: Number(e.target.value) })} />
              </div>
              {/* Focus points stepper */}
              {hasFocusSpell && (
                <div className={styles.attackRow2}>
                  <span className={styles.subLabel}>Focus Pts</span>
                  <button className={styles.stepBtn}
                    onClick={() => updateEntry({ focusPoints: Math.max(1, (entry.focusPoints ?? 1) - 1) })}>−</button>
                  <span className={styles.levelVal}>{entry.focusPoints ?? 1}</span>
                  <button className={styles.stepBtn}
                    onClick={() => updateEntry({ focusPoints: Math.min(3, (entry.focusPoints ?? 1) + 1) })}>+</button>
                </div>
              )}
              {/* Spell list */}
              {entry.spells.map((sp, si) => (
                <div key={si} className={styles.spellRow}>
                  <div className={styles.attackRow1}>
                    <input className={styles.attackNameInput}
                      value={sp.name}
                      onChange={e => updateSpell(si, { name: e.target.value })}
                      placeholder="Spell name…" />
                    <button className={styles.removeBtn} onClick={() => removeSpell(si)}>×</button>
                  </div>
                  {/* Action cost */}
                  <div className={styles.actionTypeRow}>
                    {([
                      { value: 'single',   label: '◆'      },
                      { value: 'two',      label: '◆◆'     },
                      { value: 'three',    label: '◆◆◆'    },
                      { value: 'reaction', label: '↺'      },
                      { value: 'free',     label: '⟳'      },
                      { value: 'passive',  label: 'Passive' },
                    ] as { value: AbilityActionType; label: string }[]).map(opt => (
                      <button key={opt.value}
                        className={`${styles.actionTypeBtn} ${sp.actionCost === opt.value ? styles.actionTypeBtnActive : ''}`}
                        onClick={() => updateSpell(si, { actionCost: sp.actionCost === opt.value ? undefined : opt.value })}
                      >{opt.label}</button>
                    ))}
                  </div>
                  {/* Rank + frequency */}
                  <div className={styles.attackRow2}>
                    <span className={styles.subLabel}>{(sp.rank ?? 0) === 0 ? 'Cantrip' : `Rank`}</span>
                    <input className={styles.statInput} type="number" min={0} max={10}
                      value={sp.rank ?? 0}
                      onChange={e => updateSpell(si, { rank: Number(e.target.value) })}
                      style={{ width: 44 }} />
                    {entry.type === 'innate' && (
                      <>
                        <span className={styles.subLabel}>Freq</span>
                        <select className={styles.spellFreqSelect}
                          value={sp.frequency ?? ''}
                          onChange={e => updateSpell(si, { frequency: (e.target.value as SpellFrequency) || undefined })}>
                          <option value="">—</option>
                          <option value="at-will">At-Will</option>
                          <option value="cantrip">Cantrip</option>
                          <option value="1/day">1/day</option>
                          <option value="2/day">2/day</option>
                          <option value="3/day">3/day</option>
                          <option value="focus">Focus</option>
                          <option value="constant">Constant</option>
                        </select>
                      </>
                    )}
                  </div>
                  {/* Description */}
                  <textarea className={styles.descInput}
                    value={sp.description}
                    onChange={e => updateSpell(si, { description: e.target.value })}
                    placeholder="Description (raw HTML or plain text)…"
                    rows={2} />
                </div>
              ))}
              <button className={styles.addBtn} style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => setSpellcasting(prev => prev.map((e, idx) => idx === ei
                  ? { ...e, spells: [...e.spells, { name: '', description: '', rank: 0, frequency: entry.type === 'innate' ? 'cantrip' : undefined }] }
                  : e
                ))}>+ Add Spell</button>
            </div>
          );
        })}
          </>
        )}

        {/* Flavor Text */}
        <div className={styles.sectionHead}>Description</div>
        <textarea
          className={styles.descInput}
          value={flavorText}
          onChange={e => setFlavorText(e.target.value)}
          placeholder="Flavor text or GM notes (optional)…"
          rows={4}
        />
      </div>
      <div className={styles.wizardFooter}>
        <button className={styles.ghostBtn} onClick={() => setStep(0)}>← Back</button>
        <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : entityKind === 'hazard' ? 'Save Hazard' : 'Save Creature'}
        </button>
        <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
