import { useState, useRef, useEffect } from 'react';
import type { CreatureRecord } from '../../db/schema';
import type { CustomAttack, CustomAbility, AbilityActionType } from '../../types/encounter';
import { db } from '../../db/db';
import { getAllTraits } from '../../search/search';
import styles from './CustomCreatureWizard.module.css';

const CREATURE_TYPES = [
  'Aberration', 'Animal', 'Astral', 'Beast', 'Celestial', 'Construct',
  'Dragon', 'Dream', 'Elemental', 'Ethereal', 'Fey', 'Fiend', 'Fungus',
  'Humanoid', 'Monitor', 'Ooze', 'Plant', 'Shade', 'Spirit', 'Time', 'Undead',
];

const WEAPON_TRAITS = [
  'agile', 'backstabber', 'backswing', 'deadly', 'disarm',
  'fatal', 'finesse', 'forceful', 'free-hand', 'grapple', 'jousting',
  'modular', 'nonlethal', 'parry', 'precision', 'propulsive', 'ranged trip',
  'reach', 'shove', 'sweep', 'thrown', 'trip', 'twin', 'two-hand', 'unarmed',
  'versatile b', 'versatile p', 'versatile s', 'volley',
  'bludgeoning', 'piercing', 'slashing',
  'cold iron', 'silver', 'magical', 'adamantine', 'mithral',
];

const MONSTER_ATTACK_TRAITS = [
  'brutal',
  'grab', 'improved grab',
  'knockdown', 'improved knockdown',
  'push', 'improved push',
  'improved trip', 'improved disarm', 'improved shove',
  'acid', 'cold', 'electricity', 'fire', 'sonic', 'force',
  'negative', 'positive', 'mental', 'poison', 'bleed', 'void', 'spirit',
  'disease', 'curse', 'incapacitation',
];

const MONSTER_ABILITY_SUGGESTIONS = [
  'Constrict', 'Swallow Whole', 'Trample', 'Rend', 'Pounce', 'Attach',
];

// Source: GM Core Remaster Tables 9-2 through 9-10 via 2e.aonprd.com/Rules.aspx?ID=2874
// HP uses midpoints of per-level ranges; level 25 extrapolated.

type HpTier   = 'low' | 'moderate' | 'high';
type AcTier   = 'low' | 'moderate' | 'high' | 'extreme';
type SaveTier = 'terrible' | 'low' | 'moderate' | 'high' | 'extreme';

interface AttackDraft {
  name: string;
  type: 'melee' | 'ranged';
  bonus: number;
  bonusTier: AcTier;
  damage: string;
  damageTier: AcTier;
  range?: number;
  traits: string[];
  traitInput: string;
}

const HP_TIERS:   HpTier[]   = ['low', 'moderate', 'high'];
const AC_TIERS:   AcTier[]   = ['low', 'moderate', 'high', 'extreme'];
const SAVE_TIERS: SaveTier[] = ['terrible', 'low', 'moderate', 'high', 'extreme'];

const TIER_ABBREV: Record<HpTier | AcTier | SaveTier, string> = {
  terrible: 'T', low: 'L', moderate: 'M', high: 'H', extreme: 'E',
};

export const HP_TABLE: Record<number, Record<HpTier, number>> = {
  [-1]: { high: 9,   moderate: 8,   low: 6   },
  [0]:  { high: 19,  moderate: 15,  low: 12  },
  [1]:  { high: 25,  moderate: 20,  low: 15  },
  [2]:  { high: 38,  moderate: 30,  low: 23  },
  [3]:  { high: 56,  moderate: 45,  low: 34  },
  [4]:  { high: 75,  moderate: 60,  low: 45  },
  [5]:  { high: 94,  moderate: 75,  low: 56  },
  [6]:  { high: 119, moderate: 95,  low: 71  },
  [7]:  { high: 144, moderate: 115, low: 86  },
  [8]:  { high: 169, moderate: 135, low: 101 },
  [9]:  { high: 194, moderate: 155, low: 116 },
  [10]: { high: 219, moderate: 175, low: 131 },
  [11]: { high: 244, moderate: 195, low: 146 },
  [12]: { high: 269, moderate: 215, low: 161 },
  [13]: { high: 294, moderate: 235, low: 176 },
  [14]: { high: 319, moderate: 255, low: 191 },
  [15]: { high: 344, moderate: 275, low: 206 },
  [16]: { high: 369, moderate: 295, low: 221 },
  [17]: { high: 394, moderate: 315, low: 236 },
  [18]: { high: 419, moderate: 335, low: 251 },
  [19]: { high: 444, moderate: 355, low: 266 },
  [20]: { high: 469, moderate: 375, low: 281 },
  [21]: { high: 500, moderate: 400, low: 300 },
  [22]: { high: 538, moderate: 430, low: 323 },
  [23]: { high: 575, moderate: 460, low: 345 },
  [24]: { high: 625, moderate: 500, low: 375 },
  [25]: { high: 660, moderate: 540, low: 405 },
};

export const AC_TABLE: Record<number, Record<AcTier, number>> = {
  [-1]: { extreme: 18, high: 15, moderate: 14, low: 12 },
  [0]:  { extreme: 19, high: 16, moderate: 15, low: 13 },
  [1]:  { extreme: 19, high: 16, moderate: 15, low: 13 },
  [2]:  { extreme: 21, high: 18, moderate: 17, low: 15 },
  [3]:  { extreme: 22, high: 19, moderate: 18, low: 16 },
  [4]:  { extreme: 24, high: 21, moderate: 20, low: 18 },
  [5]:  { extreme: 25, high: 22, moderate: 21, low: 19 },
  [6]:  { extreme: 27, high: 24, moderate: 23, low: 21 },
  [7]:  { extreme: 28, high: 25, moderate: 24, low: 22 },
  [8]:  { extreme: 30, high: 27, moderate: 26, low: 24 },
  [9]:  { extreme: 31, high: 28, moderate: 27, low: 25 },
  [10]: { extreme: 33, high: 30, moderate: 29, low: 27 },
  [11]: { extreme: 34, high: 31, moderate: 30, low: 28 },
  [12]: { extreme: 36, high: 33, moderate: 32, low: 30 },
  [13]: { extreme: 37, high: 34, moderate: 33, low: 31 },
  [14]: { extreme: 39, high: 36, moderate: 35, low: 33 },
  [15]: { extreme: 40, high: 37, moderate: 36, low: 34 },
  [16]: { extreme: 42, high: 39, moderate: 38, low: 36 },
  [17]: { extreme: 43, high: 40, moderate: 39, low: 37 },
  [18]: { extreme: 45, high: 42, moderate: 41, low: 39 },
  [19]: { extreme: 46, high: 43, moderate: 42, low: 40 },
  [20]: { extreme: 48, high: 45, moderate: 44, low: 42 },
  [21]: { extreme: 49, high: 46, moderate: 45, low: 43 },
  [22]: { extreme: 51, high: 48, moderate: 47, low: 45 },
  [23]: { extreme: 52, high: 49, moderate: 48, low: 46 },
  [24]: { extreme: 54, high: 51, moderate: 50, low: 48 },
  [25]: { extreme: 55, high: 52, moderate: 51, low: 49 },
};

export const SAVE_TABLE: Record<number, Record<SaveTier, number>> = {
  [-1]: { extreme: 9,  high: 8,  moderate: 5,  low: 2,  terrible: 0  },
  [0]:  { extreme: 10, high: 9,  moderate: 6,  low: 3,  terrible: 1  },
  [1]:  { extreme: 11, high: 10, moderate: 7,  low: 4,  terrible: 2  },
  [2]:  { extreme: 12, high: 11, moderate: 8,  low: 5,  terrible: 3  },
  [3]:  { extreme: 14, high: 12, moderate: 9,  low: 6,  terrible: 4  },
  [4]:  { extreme: 15, high: 14, moderate: 11, low: 8,  terrible: 6  },
  [5]:  { extreme: 17, high: 15, moderate: 12, low: 9,  terrible: 7  },
  [6]:  { extreme: 18, high: 17, moderate: 14, low: 11, terrible: 8  },
  [7]:  { extreme: 20, high: 18, moderate: 15, low: 12, terrible: 10 },
  [8]:  { extreme: 21, high: 19, moderate: 16, low: 13, terrible: 11 },
  [9]:  { extreme: 23, high: 21, moderate: 18, low: 15, terrible: 12 },
  [10]: { extreme: 24, high: 22, moderate: 19, low: 16, terrible: 14 },
  [11]: { extreme: 26, high: 24, moderate: 21, low: 18, terrible: 15 },
  [12]: { extreme: 27, high: 25, moderate: 22, low: 19, terrible: 16 },
  [13]: { extreme: 29, high: 26, moderate: 23, low: 20, terrible: 18 },
  [14]: { extreme: 30, high: 28, moderate: 25, low: 22, terrible: 19 },
  [15]: { extreme: 32, high: 29, moderate: 26, low: 23, terrible: 20 },
  [16]: { extreme: 33, high: 30, moderate: 28, low: 25, terrible: 22 },
  [17]: { extreme: 35, high: 32, moderate: 29, low: 26, terrible: 23 },
  [18]: { extreme: 36, high: 33, moderate: 30, low: 27, terrible: 24 },
  [19]: { extreme: 38, high: 35, moderate: 32, low: 29, terrible: 26 },
  [20]: { extreme: 39, high: 36, moderate: 33, low: 30, terrible: 27 },
  [21]: { extreme: 41, high: 38, moderate: 35, low: 32, terrible: 28 },
  [22]: { extreme: 43, high: 39, moderate: 36, low: 33, terrible: 30 },
  [23]: { extreme: 44, high: 40, moderate: 37, low: 34, terrible: 31 },
  [24]: { extreme: 46, high: 42, moderate: 38, low: 36, terrible: 32 },
  [25]: { extreme: 47, high: 43, moderate: 39, low: 37, terrible: 33 },
};

export const ATTACK_TABLE: Record<number, Record<AcTier, number>> = {
  [-1]: { extreme: 10, high: 8,  moderate: 6,  low: 4  },
  [0]:  { extreme: 10, high: 8,  moderate: 6,  low: 4  },
  [1]:  { extreme: 11, high: 9,  moderate: 7,  low: 5  },
  [2]:  { extreme: 13, high: 11, moderate: 9,  low: 7  },
  [3]:  { extreme: 14, high: 12, moderate: 10, low: 8  },
  [4]:  { extreme: 16, high: 14, moderate: 12, low: 9  },
  [5]:  { extreme: 17, high: 15, moderate: 13, low: 11 },
  [6]:  { extreme: 19, high: 17, moderate: 15, low: 12 },
  [7]:  { extreme: 20, high: 18, moderate: 16, low: 13 },
  [8]:  { extreme: 22, high: 20, moderate: 18, low: 15 },
  [9]:  { extreme: 23, high: 21, moderate: 19, low: 16 },
  [10]: { extreme: 25, high: 23, moderate: 21, low: 17 },
  [11]: { extreme: 27, high: 24, moderate: 22, low: 19 },
  [12]: { extreme: 28, high: 26, moderate: 24, low: 20 },
  [13]: { extreme: 29, high: 27, moderate: 25, low: 21 },
  [14]: { extreme: 31, high: 29, moderate: 27, low: 23 },
  [15]: { extreme: 32, high: 30, moderate: 28, low: 24 },
  [16]: { extreme: 34, high: 32, moderate: 30, low: 25 },
  [17]: { extreme: 35, high: 33, moderate: 31, low: 27 },
  [18]: { extreme: 37, high: 35, moderate: 33, low: 28 },
  [19]: { extreme: 38, high: 36, moderate: 34, low: 29 },
  [20]: { extreme: 40, high: 38, moderate: 36, low: 31 },
  [21]: { extreme: 41, high: 39, moderate: 37, low: 32 },
  [22]: { extreme: 43, high: 41, moderate: 39, low: 33 },
  [23]: { extreme: 44, high: 42, moderate: 40, low: 35 },
  [24]: { extreme: 46, high: 44, moderate: 42, low: 36 },
  [25]: { extreme: 47, high: 45, moderate: 43, low: 37 },
};

export const DAMAGE_TABLE: Record<number, Record<AcTier, string>> = {
  [-1]: { extreme: '1d6+1',   high: '1d4+1',   moderate: '1d4',     low: '1d4'    },
  [0]:  { extreme: '1d6+3',   high: '1d6+2',   moderate: '1d4+2',   low: '1d4+1'  },
  [1]:  { extreme: '1d8+4',   high: '1d6+3',   moderate: '1d6+2',   low: '1d4+2'  },
  [2]:  { extreme: '1d12+4',  high: '1d10+4',  moderate: '1d8+4',   low: '1d6+3'  },
  [3]:  { extreme: '1d12+8',  high: '1d10+6',  moderate: '1d8+6',   low: '1d6+5'  },
  [4]:  { extreme: '2d10+7',  high: '2d8+5',   moderate: '2d6+5',   low: '2d4+4'  },
  [5]:  { extreme: '2d12+7',  high: '2d8+7',   moderate: '2d6+6',   low: '2d4+6'  },
  [6]:  { extreme: '2d12+10', high: '2d8+9',   moderate: '2d6+8',   low: '2d4+7'  },
  [7]:  { extreme: '2d12+12', high: '2d10+9',  moderate: '2d8+8',   low: '2d6+6'  },
  [8]:  { extreme: '2d12+15', high: '2d10+11', moderate: '2d8+9',   low: '2d6+8'  },
  [9]:  { extreme: '2d12+17', high: '2d10+13', moderate: '2d8+11',  low: '2d6+9'  },
  [10]: { extreme: '2d12+20', high: '2d12+13', moderate: '2d10+11', low: '2d6+10' },
  [11]: { extreme: '2d12+22', high: '2d12+15', moderate: '2d10+12', low: '2d8+10' },
  [12]: { extreme: '3d12+19', high: '3d10+14', moderate: '3d8+12',  low: '3d6+10' },
  [13]: { extreme: '3d12+21', high: '3d10+16', moderate: '3d8+14',  low: '3d6+11' },
  [14]: { extreme: '3d12+24', high: '3d10+18', moderate: '3d8+15',  low: '3d6+13' },
  [15]: { extreme: '3d12+26', high: '3d12+17', moderate: '3d10+14', low: '3d6+14' },
  [16]: { extreme: '3d12+29', high: '3d12+18', moderate: '3d10+15', low: '3d6+15' },
  [17]: { extreme: '3d12+31', high: '3d12+19', moderate: '3d10+16', low: '3d6+16' },
  [18]: { extreme: '3d12+34', high: '3d12+20', moderate: '3d10+17', low: '3d6+17' },
  [19]: { extreme: '4d12+29', high: '4d10+20', moderate: '4d8+17',  low: '4d6+14' },
  [20]: { extreme: '4d12+32', high: '4d10+22', moderate: '4d8+19',  low: '4d6+15' },
  [21]: { extreme: '4d12+34', high: '4d10+24', moderate: '4d8+20',  low: '4d6+17' },
  [22]: { extreme: '4d12+37', high: '4d10+26', moderate: '4d8+22',  low: '4d6+18' },
  [23]: { extreme: '4d12+39', high: '4d12+24', moderate: '4d10+20', low: '4d6+19' },
  [24]: { extreme: '4d12+42', high: '4d12+26', moderate: '4d10+22', low: '4d6+21' },
  [25]: { extreme: '4d12+45', high: '4d12+28', moderate: '4d10+24', low: '4d6+22' },
};

function lookupHp(level: number, tier: HpTier): number {
  const l = Math.max(-1, Math.min(25, level));
  return (HP_TABLE[l] ?? HP_TABLE[0])[tier];
}
function lookupAc(level: number, tier: AcTier): number {
  const l = Math.max(-1, Math.min(25, level));
  return (AC_TABLE[l] ?? AC_TABLE[0])[tier];
}
function lookupSave(level: number, tier: SaveTier): number {
  const l = Math.max(-1, Math.min(25, level));
  return (SAVE_TABLE[l] ?? SAVE_TABLE[0])[tier];
}
function lookupAttack(level: number, tier: AcTier): number {
  const l = Math.max(-1, Math.min(25, level));
  return (ATTACK_TABLE[l] ?? ATTACK_TABLE[0])[tier];
}
function lookupDamage(level: number, tier: AcTier): string {
  const l = Math.max(-1, Math.min(25, level));
  return (DAMAGE_TABLE[l] ?? DAMAGE_TABLE[0])[tier];
}

function defaultAttack(level: number): AttackDraft {
  return {
    name: 'Strike',
    type: 'melee',
    bonus: lookupAttack(level, 'moderate'),
    bonusTier: 'moderate',
    damage: lookupDamage(level, 'moderate'),
    damageTier: 'moderate',
    traits: [],
    traitInput: '',
  };
}

interface WizardProps {
  partyLevel: number;
  onSave: (creature: CreatureRecord) => void;
  onCancel: () => void;
}

export function CustomCreatureWizard({ partyLevel, onSave, onCancel }: WizardProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(partyLevel);
  const [creatureType, setCreatureType] = useState('');
  const [hp, setHp] = useState(() => lookupHp(partyLevel, 'moderate'));
  const [ac, setAc] = useState(() => lookupAc(partyLevel, 'moderate'));
  const [fort, setFort] = useState(() => lookupSave(partyLevel, 'moderate'));
  const [ref, setRef] = useState(() => lookupSave(partyLevel, 'moderate'));
  const [will, setWill] = useState(() => lookupSave(partyLevel, 'moderate'));
  const [hpTier, setHpTier] = useState<HpTier>('moderate');
  const [acTier, setAcTier] = useState<AcTier>('moderate');
  const [fortTier, setFortTier] = useState<SaveTier>('moderate');
  const [refTier, setRefTier] = useState<SaveTier>('moderate');
  const [willTier, setWillTier] = useState<SaveTier>('moderate');
  const [attacks, setAttacks] = useState<AttackDraft[]>(() => [defaultAttack(partyLevel)]);
  const [abilities, setAbilities] = useState<CustomAbility[]>([]);
  const [extraTraits, setExtraTraits] = useState<string[]>([]);
  const [traitInput, setTraitInput] = useState('');
  const traitInputRef = useRef<HTMLInputElement>(null);
  const [allTraits, setAllTraits] = useState<string[]>([]);
  const [focusedAttackIdx, setFocusedAttackIdx] = useState<number | null>(null);
  const [focusedAbilityIdx, setFocusedAbilityIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getAllTraits().then(setAllTraits).catch(() => {}); }, []);

  function applyTiers(lv: number) {
    setHp(lookupHp(lv, 'moderate'));
    setAc(lookupAc(lv, 'moderate'));
    setFort(lookupSave(lv, 'moderate'));
    setRef(lookupSave(lv, 'moderate'));
    setWill(lookupSave(lv, 'moderate'));
    setHpTier('moderate'); setAcTier('moderate');
    setFortTier('moderate'); setRefTier('moderate'); setWillTier('moderate');
    setAttacks([defaultAttack(lv)]);
    setAbilities([]);
  }

  function goNext() {
    if (!name.trim() || !creatureType) return;
    applyTiers(level);
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
      .map(({ name: n, type, bonus, damage, range, traits }) => ({
        name: n.trim(), type, bonus, damage, range,
        traits: traits.length ? traits : undefined,
      }));
    const cleanAbilities: CustomAbility[] = abilities
      .filter(a => a.name.trim())
      .map(({ name: n, description }) => ({ name: n.trim(), description }));
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const trimmedName = name.trim();
    const allTraits = [creatureType.toLowerCase(), ...extraTraits];
    const record: CreatureRecord = {
      id,
      entityType: 'npc',
      name: trimmedName,
      nameLower: trimmedName.toLowerCase(),
      level,
      traits: allTraits,
      size: 'med',
      rarity: 'common',
      packSource: 'custom',
      blobSha: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        _id: id,
        name: trimmedName,
        type: 'npc',
        items: [],
        system: {
          details: { level: { value: level }, publication: { title: 'Custom' } },
          attributes: { hp: { value: hp, max: hp }, ac: { value: ac } },
          saves: { fortitude: { value: fort }, reflex: { value: ref }, will: { value: will } },
          traits: { value: allTraits, rarity: 'common', size: { value: 'med' } },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      customData: {
        attacks: cleanAttacks.length ? cleanAttacks : undefined,
        abilities: cleanAbilities.length ? cleanAbilities : undefined,
      },
    };
    await db.creatures.put(record);
    onSave(record);
  }

  function updateAttack(i: number, patch: Partial<AttackDraft>) {
    setAttacks(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }

  if (step === 0) {
    return (
      <div className={styles.wizard}>
        <div className={styles.wizardHeader}>
          <span className={styles.wizardTitle}>New Custom Creature</span>
          <button className={styles.cancelBtn} onClick={onCancel}>✕</button>
        </div>
        <div className={styles.wizardBody}>
          <div className={styles.fieldLabel}>Name</div>
          <input
            className={styles.nameInput}
            value={name}
            autoFocus
            onChange={e => setName(e.target.value)}
            placeholder="Creature name…"
            onKeyDown={e => e.key === 'Enter' && name.trim() && goNext()}
          />
          <div className={styles.fieldLabel}>Level</div>
          <div className={styles.levelRow}>
            <button className={styles.stepBtn} onClick={() => setLevel(l => Math.max(-1, l - 1))}>−</button>
            <span className={styles.levelVal}>{level}</span>
            <button className={styles.stepBtn} onClick={() => setLevel(l => Math.min(25, l + 1))}>+</button>
          </div>
          <div className={styles.fieldLabel}>Creature Type <span className={styles.required}>*</span></div>
          <div className={styles.typeGrid}>
            {CREATURE_TYPES.map(t => (
              <button
                key={t}
                className={`${styles.typeChip} ${creatureType === t ? styles.typeChipActive : ''}`}
                onClick={() => setCreatureType(t)}
              >{t}</button>
            ))}
          </div>
        </div>
        <div className={styles.wizardFooter}>
          <button className={styles.primaryBtn} onClick={goNext} disabled={!name.trim() || !creatureType}>
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
      <div className={styles.wizardHint}>Click a tier to prefill · T=Terrible L=Low M=Moderate H=High E=Extreme</div>
      <div className={styles.wizardBody}>
        {/* Traits */}
        <div className={styles.sectionHead}>Traits</div>
        <div className={styles.traitRow}>
          <span className={styles.traitChipFixed}>{creatureType}</span>
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
              }}
              placeholder="Add trait… (Enter to add)"
            />
            {traitInput.length > 0 && (() => {
              const suggestions = allTraits
                .filter(t => t.includes(traitInput.toLowerCase()) && !extraTraits.includes(t) && t !== creatureType.toLowerCase())
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

        {/* Defenses */}
        <div className={styles.sectionHead}>Defenses</div>
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

        {/* Attacks */}
        <div className={styles.sectionHead}>
          Attacks
          <button className={styles.addBtn} onClick={() => setAttacks(prev => [...prev, defaultAttack(level)])}>+ Add</button>
        </div>
        {attacks.map((atk, i) => (
          <div key={i} className={styles.attackCard}>
            <div className={styles.attackRow1}>
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
              <button className={styles.removeBtn} onClick={() => setAttacks(prev => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
            <div className={styles.attackRow2}>
              <span className={styles.subLabel}>Atk</span>
              <div className={styles.tierBtns}>
                {AC_TIERS.map(t => (
                  <button key={t} title={t} className={`${styles.tierBtn} ${atk.bonusTier === t ? styles.tierBtnActive : ''}`}
                    onClick={() => updateAttack(i, { bonusTier: t, bonus: lookupAttack(level, t) })}
                  >{TIER_ABBREV[t]}</button>
                ))}
              </div>
              <input className={styles.statInput} type="number" min={-10} max={70}
                value={atk.bonus} onChange={e => updateAttack(i, { bonus: Number(e.target.value) })} />
              <span className={styles.subLabel}>Dmg</span>
              <div className={styles.tierBtns}>
                {AC_TIERS.map(t => (
                  <button key={t} title={t} className={`${styles.tierBtn} ${atk.damageTier === t ? styles.tierBtnActive : ''}`}
                    onClick={() => updateAttack(i, { damageTier: t, damage: lookupDamage(level, t) })}
                  >{TIER_ABBREV[t]}</button>
                ))}
              </div>
              <input className={styles.dmgInput} type="text"
                value={atk.damage} onChange={e => updateAttack(i, { damage: e.target.value })}
                placeholder="2d8+9" />
            </div>
            {atk.type === 'ranged' && (
              <div className={styles.attackRow3}>
                <span className={styles.subLabel}>Range</span>
                <input className={styles.statInput} type="number" min={5} max={500} step={5}
                  value={atk.range ?? 30}
                  onChange={e => updateAttack(i, { range: Number(e.target.value) })} />
                <span className={styles.subLabel}>ft</span>
              </div>
            )}
            <div className={styles.attackTraitRow}>
              {atk.traits.map(t => (
                <span key={t} className={styles.attackTraitChip}>
                  {t}
                  <button className={styles.traitRemove} onClick={() => updateAttack(i, { traits: atk.traits.filter(x => x !== t) })}>×</button>
                </span>
              ))}
              <div className={styles.attackTraitInputWrap}>
                <input
                  className={styles.attackTraitInput}
                  value={atk.traitInput}
                  onChange={e => updateAttack(i, { traitInput: e.target.value })}
                  onFocus={() => setFocusedAttackIdx(i)}
                  onBlur={() => setFocusedAttackIdx(null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const t = atk.traitInput.trim().toLowerCase();
                      if (t && !atk.traits.includes(t)) updateAttack(i, { traits: [...atk.traits, t], traitInput: '' });
                      else if (t) updateAttack(i, { traitInput: '' });
                    }
                  }}
                  placeholder="Add trait…"
                />
                {focusedAttackIdx === i && atk.traitInput.length > 0 && (() => {
                  const q = atk.traitInput.toLowerCase();
                  const weapon = WEAPON_TRAITS.filter(t => t.includes(q) && !atk.traits.includes(t));
                  const monster = MONSTER_ATTACK_TRAITS.filter(t => t.includes(q) && !atk.traits.includes(t));
                  if (!weapon.length && !monster.length) return null;
                  const addTrait = (t: string) => updateAttack(i, { traits: [...atk.traits, t], traitInput: '' });
                  return (
                    <ul className={styles.suggestions}>
                      {weapon.length > 0 && <li className={styles.suggestionGroup}>Weapon</li>}
                      {weapon.map(t => (
                        <li key={t} className={styles.suggestion} onMouseDown={e => { e.preventDefault(); addTrait(t); }}>{t}</li>
                      ))}
                      {monster.length > 0 && <li className={styles.suggestionGroup}>Monster</li>}
                      {monster.map(t => (
                        <li key={t} className={styles.suggestion} onMouseDown={e => { e.preventDefault(); addTrait(t); }}>{t}</li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}

        {/* Abilities */}
        <div className={styles.sectionHead}>
          Abilities
          <button className={styles.addBtn} onClick={() => setAbilities(prev => [...prev, { name: '', description: '' }])}>+ Add</button>
        </div>
        {abilities.map((ab, i) => (
          <div key={i} className={styles.abilityCard}>
            <div className={styles.abilityRow1}>
              <div className={styles.abilityNameWrap}>
                <input
                  className={styles.attackNameInput}
                  value={ab.name}
                  onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a))}
                  onFocus={() => setFocusedAbilityIdx(i)}
                  onBlur={() => setFocusedAbilityIdx(null)}
                  placeholder="Ability name…"
                />
                {focusedAbilityIdx === i && ab.name.length > 0 && (() => {
                  const q = ab.name.toLowerCase();
                  const suggestions = MONSTER_ABILITY_SUGGESTIONS.filter(s => s.toLowerCase().includes(q) && s.toLowerCase() !== ab.name.toLowerCase());
                  return suggestions.length > 0 ? (
                    <ul className={styles.suggestions}>
                      {suggestions.map(s => (
                        <li key={s} className={styles.suggestion} onMouseDown={e => {
                          e.preventDefault();
                          setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, name: s } : a));
                        }}>{s}</li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </div>
              <button className={styles.removeBtn} onClick={() => setAbilities(prev => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
            <div className={styles.actionTypeRow}>
              {([
                { value: 'single',   label: '◆',      title: 'Single Action'         },
                { value: 'two',      label: '◆◆',     title: 'Two-Action Activity'   },
                { value: 'three',    label: '◆◆◆',    title: 'Three-Action Activity' },
                { value: 'reaction', label: '↺',      title: 'Reaction'              },
                { value: 'free',     label: '⟳',      title: 'Free Action'           },
                { value: 'passive',  label: 'Passive', title: 'Passive'               },
              ] as { value: AbilityActionType; label: string; title: string }[]).map(opt => (
                <button
                  key={opt.value}
                  title={opt.title}
                  className={`${styles.actionTypeBtn} ${ab.actionType === opt.value ? styles.actionTypeBtnActive : ''}`}
                  onClick={() => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, actionType: opt.value } : a))}
                >{opt.label}</button>
              ))}
            </div>
            <textarea
              className={styles.descInput}
              value={ab.description}
              onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, description: e.target.value } : a))}
              placeholder="Description (optional)…"
              rows={2}
            />
          </div>
        ))}
      </div>
      <div className={styles.wizardFooter}>
        <button className={styles.ghostBtn} onClick={() => setStep(0)}>← Back</button>
        <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Creature'}
        </button>
        <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
