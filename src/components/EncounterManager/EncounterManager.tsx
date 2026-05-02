import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Encounter, EncounterCreature, Condition, CustomAttack, CustomAbility } from '../../types/encounter';
import type { RollHistoryEntry } from '../../types/diceHistory';
import { computePenalties, computeAttackPenalty, computeDamagePenalty } from '../../types/conditionEffects';
import { DiceRoller } from '../DiceRoller/DiceRoller';
import styles from './EncounterManager.module.css';

interface ConditionCategory {
  label: string;
  conditions: string[];
}

const CONDITION_CATEGORIES: ConditionCategory[] = [
  { label: 'Circumstantial', conditions: ['Grabbed', 'Prone', 'Off-Guard', 'Immobilized', 'Restrained', 'Persistent Damage'] },
  { label: 'Status',         conditions: ['Frightened', 'Sickened', 'Fatigued', 'Encumbered'] },
  { label: 'Ability Scores', conditions: ['Clumsy', 'Enfeebled', 'Drained', 'Stupefied'] },
  { label: 'Action Economy', conditions: ['Stunned', 'Slowed', 'Quickened'] },
  { label: 'Death / Dying',  conditions: ['Dying', 'Wounded', 'Doomed', 'Unconscious'] },
  { label: 'Detection',      conditions: ['Concealed', 'Hidden', 'Undetected', 'Invisible'] },
  { label: 'Senses',         conditions: ['Blinded', 'Dazzled', 'Deafened', 'Fascinated'] },
  { label: 'Disabled',       conditions: ['Controlled', 'Confused', 'Fleeing', 'Paralyzed', 'Petrified'] },
];

// Conditions that take a numeric value
const VALUED_CONDITIONS = new Set([
  'clumsy', 'doomed', 'drained', 'dying', 'enfeebled', 'frightened',
  'quickened', 'sickened', 'slowed', 'stunned', 'stupefied', 'persistent damage', 'wounded',
]);

// Source: GM Core Remaster Tables 9-2 through 9-4 via 2e.aonprd.com/Rules.aspx?ID=2874
// HP uses midpoints of the per-level ranges; level 25 is extrapolated.

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
}

const HP_TIERS:   HpTier[]   = ['low', 'moderate', 'high'];
const AC_TIERS:   AcTier[]   = ['low', 'moderate', 'high', 'extreme'];
const SAVE_TIERS: SaveTier[] = ['terrible', 'low', 'moderate', 'high', 'extreme'];

const TIER_ABBREV: Record<HpTier | AcTier | SaveTier, string> = {
  terrible: 'T', low: 'L', moderate: 'M', high: 'H', extreme: 'E',
};

const HP_TABLE: Record<number, Record<HpTier, number>> = {
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

const AC_TABLE: Record<number, Record<AcTier, number>> = {
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

const SAVE_TABLE: Record<number, Record<SaveTier, number>> = {
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

const ATTACK_TABLE: Record<number, Record<AcTier, number>> = {
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

const DAMAGE_TABLE: Record<number, Record<AcTier, string>> = {
  [-1]: { extreme: '1d6+1', high: '1d4+1', moderate: '1d4',   low: '1d4'   },
  [0]:  { extreme: '1d6+3', high: '1d6+2', moderate: '1d4+2', low: '1d4+1' },
  [1]:  { extreme: '1d8+4', high: '1d6+3', moderate: '1d6+2', low: '1d4+2' },
  [2]:  { extreme: '1d12+4',  high: '1d10+4',  moderate: '1d8+4',  low: '1d6+3'  },
  [3]:  { extreme: '1d12+8',  high: '1d10+6',  moderate: '1d8+6',  low: '1d6+5'  },
  [4]:  { extreme: '2d10+7',  high: '2d8+5',   moderate: '2d6+5',  low: '2d4+4'  },
  [5]:  { extreme: '2d12+7',  high: '2d8+7',   moderate: '2d6+6',  low: '2d4+6'  },
  [6]:  { extreme: '2d12+10', high: '2d8+9',   moderate: '2d6+8',  low: '2d4+7'  },
  [7]:  { extreme: '2d12+12', high: '2d10+9',  moderate: '2d8+8',  low: '2d6+6'  },
  [8]:  { extreme: '2d12+15', high: '2d10+11', moderate: '2d8+9',  low: '2d6+8'  },
  [9]:  { extreme: '2d12+17', high: '2d10+13', moderate: '2d8+11', low: '2d6+9'  },
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

// Only Frightened auto-reduces by 1 at end of each creature's turn per PF2e rules.
const AUTO_REDUCE_CONDITIONS = new Set(['frightened']);

interface CombatCreature extends EncounterCreature {
  init: number;
}

// ── Recall Knowledge ─────────────────────────────────────────────────────────
// Base DCs for recalling knowledge, indexed by creature level (−1 through 25).
// From PF2E Remaster GM Core Table 5-6.
const RK_DC_TABLE: Record<number, number> = {
  [-1]: 13, [0]: 14, [1]: 15, [2]: 16, [3]: 18, [4]: 19, [5]: 20, [6]: 22,
  [7]: 23, [8]: 24, [9]: 26, [10]: 27, [11]: 28, [12]: 30, [13]: 31, [14]: 32,
  [15]: 34, [16]: 35, [17]: 36, [18]: 38, [19]: 39, [20]: 40, [21]: 42, [22]: 44,
  [23]: 46, [24]: 48, [25]: 50,
};

// Per-creature-type recall knowledge skills
const RK_SKILLS: Record<string, string[]> = {
  aberration:  ['Occultism'],
  animal:      ['Nature'],
  astral:      ['Occultism'],
  beast:       ['Arcana', 'Nature'],
  celestial:   ['Religion'],
  construct:   ['Arcana', 'Crafting'],
  dragon:      ['Arcana'],
  elemental:   ['Arcana', 'Nature'],
  fey:         ['Nature'],
  fiend:       ['Religion'],
  fungus:      ['Nature'],
  humanoid:    ['Society'],
  monitor:     ['Religion'],
  ooze:        ['Occultism'],
  plant:       ['Nature'],
  spirit:      ['Occultism'],
  undead:      ['Religion'],
};

function getRecallKnowledge(level: number, traits: string[]): { dc: number; skills: string[] } | null {
  const l = Math.max(-1, Math.min(25, level));
  const dc = RK_DC_TABLE[l] ?? 14;
  const skills = new Set<string>();
  for (const t of traits) {
    const tLower = t.toLowerCase();
    const s = RK_SKILLS[tLower];
    if (s) s.forEach(sk => skills.add(sk));
  }
  // Default to Recall Knowledge skill (no type match)
  if (skills.size === 0) return null;
  return { dc, skills: [...skills].sort() };
}

interface EncounterManagerProps {
  encounters: Encounter[];
  activeEnc: number;
  partySize: number;
  partyLevel: number;
  onActiveEncChange: (idx: number) => void;
  onPartySizeChange: (size: number) => void;
  onPartyLevelChange: (level: number) => void;
  onAddEncounter: () => void;
  onRenameEncounter: (idx: number, name: string) => void;
  onDeleteEncounter: (idx: number) => void;
  onReorderEncounters: (fromIdx: number, toIdx: number) => void;
  onRemoveCreature: (uid: string) => void;
  onUpdateHP: (uid: string, delta: number) => void;
  onSetHP: (uid: string, newHp: number) => void;
  onAddCustomCreature: (name: string, level: number, hp?: number, ac?: number, fort?: number, ref?: number, will?: number, attacks?: CustomAttack[], abilities?: CustomAbility[], isEnemy?: boolean) => void;
  onSelectCreature: (id: string, encounterUid: string) => void;
  onUpdateConditions: (uid: string, conditions: Condition[]) => void;
  onRoll?: (entry: Omit<RollHistoryEntry, 'id'>) => void;
}

const ALL_CONDITIONS_ALPHA = [...new Set(CONDITION_CATEGORIES.flatMap(c => c.conditions))].sort((a, b) => a.localeCompare(b));

const POPUP_MIN_HEIGHT = 260;
const POPUP_MARGIN = 8;

function popupStyle(anchor: { x: number; y: number; top: number; spaceBelow: number; spaceAbove: number }): React.CSSProperties {
  const flipUp = anchor.spaceBelow < POPUP_MIN_HEIGHT && anchor.spaceAbove > anchor.spaceBelow;
  if (flipUp) {
    const availableHeight = Math.max(POPUP_MIN_HEIGHT, anchor.spaceAbove);
    return {
      left: anchor.x,
      bottom: window.innerHeight - anchor.top + POPUP_MARGIN,
      maxHeight: availableHeight,
    };
  }
  const availableHeight = Math.max(POPUP_MIN_HEIGHT, anchor.spaceBelow);
  return {
    left: anchor.x,
    top: anchor.y,
    maxHeight: availableHeight,
  };
}

function xpFor(monsterLevel: number, partyLevel: number): number {
  const d = monsterLevel - partyLevel;
  if (d >= 4) return 160;
  if (d === 3) return 120;
  if (d === 2) return 80;
  if (d === 1) return 60;
  if (d === 0) return 40;
  if (d === -1) return 30;
  if (d === -2) return 20;
  if (d === -3) return 15;
  if (d === -4) return 10;
  return 0;
}

function getDifficulty(totalXP: number, partySize: number) {
  const adj = partySize - 4;
  const low      = 60  + 20 * adj;
  const moderate = 80  + 20 * adj;
  const severe   = 120 + 30 * adj;
  const extreme  = 160 + 40 * adj;
  if (totalXP >= extreme)  return { label: 'Extreme',  color: '#8a2a18', pct: 100 };
  if (totalXP >= severe)   return { label: 'Severe',   color: '#8a5a18', pct: (totalXP / extreme) * 100 };
  if (totalXP >= moderate) return { label: 'Moderate', color: '#6a7a18', pct: (totalXP / extreme) * 100 };
  if (totalXP >= low)      return { label: 'Low',      color: '#3a6a5a', pct: (totalXP / extreme) * 100 };
  return                          { label: 'Trivial',  color: '#5a7a3a', pct: (totalXP / extreme) * 100 };
}

export function EncounterManager({
  encounters,
  activeEnc,
  partySize,
  partyLevel,
  onActiveEncChange,
  onPartySizeChange,
  onPartyLevelChange,
  onAddEncounter,
  onRenameEncounter,
  onDeleteEncounter,
  onReorderEncounters,
  onRemoveCreature,
  onUpdateHP,
  onSetHP,
  onAddCustomCreature,
  onSelectCreature,
  onUpdateConditions,
  onRoll,
}: EncounterManagerProps) {
  const [combatMode, setCombatMode] = useState(false);
  const [round, setRound] = useState(1);
  const [activeTurn, setActiveTurn] = useState(0);
  const [combatCreatures, setCombatCreatures] = useState<CombatCreature[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(0); // 0=name/level, 1=stats
  const [useQuickWizard, setUseQuickWizard] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customLevel, setCustomLevel] = useState(1);
  const [customHp, setCustomHp] = useState(20);
  const [customAc, setCustomAc] = useState(15);
  const [customFort, setCustomFort] = useState(7);
  const [customRef, setCustomRef] = useState(7);
  const [customWill, setCustomWill] = useState(7);
  const [hpTier, setHpTier] = useState<HpTier>('moderate');
  const [acTier, setAcTier] = useState<AcTier>('moderate');
  const [fortTier, setFortTier] = useState<SaveTier>('moderate');
  const [refTier, setRefTier] = useState<SaveTier>('moderate');
  const [willTier, setWillTier] = useState<SaveTier>('moderate');
  const [customAttacks, setCustomAttacks] = useState<AttackDraft[]>([]);
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>([]);
  const [conditionPickerUid, setConditionPickerUid] = useState<string | null>(null);
  const [conditionPickerSort, setConditionPickerSort] = useState<'category' | 'alpha'>('category');
  const [conditionPickerAnchor, setConditionPickerAnchor] = useState<{ x: number; y: number; top: number; spaceBelow: number; spaceAbove: number } | null>(null);
  const [conditionValueUid, setConditionValueUid] = useState<string | null>(null);
  const [conditionValueAnchor, setConditionValueAnchor] = useState<{ x: number; y: number; top: number; spaceBelow: number; spaceAbove: number } | null>(null);
  const [pendingConditionName, setPendingConditionName] = useState('');
  const [pendingConditionValue, setPendingConditionValue] = useState(1);

  // Dice roller
  const [diceRoll, setDiceRoll] = useState<{ expr: string; label?: string; x: number; y: number } | null>(null);

  // Encounter tab rename/delete/drag
  const [renamingTab, setRenamingTab] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [confirmDeleteTab, setConfirmDeleteTab] = useState<number | null>(null);
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Condition picker drag state
  const [condPickerPos, setCondPickerPos] = useState<{ x: number; y: number } | null>(null);
  const condPickerDragRef = useRef<{ startMouseX: number; startMouseY: number; startX: number; startY: number } | null>(null);

  // isEnemy checkbox in wizard
  const [wizardIsEnemy, setWizardIsEnemy] = useState(true);

  // Click-outside to cancel delete confirmation
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (confirmDeleteTab === null) return;
    function onPointerDown(e: PointerEvent) {
      if (tabsRef.current && !tabsRef.current.contains(e.target as Node)) {
        setConfirmDeleteTab(null);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [confirmDeleteTab]);

  // Inline editing
  const [editingInit, setEditingInit] = useState<string | null>(null);
  const [editInitVal, setEditInitVal] = useState('');
  const [editingHp, setEditingHp] = useState<string | null>(null);
  const [editHpVal, setEditHpVal] = useState('');

  const enc = encounters[activeEnc] ?? encounters[0];

  // Reset combat when switching encounters
  useEffect(() => {
    setCombatMode(false);
    setRound(1);
    setActiveTurn(0);
    setCombatCreatures([]);
  }, [activeEnc]);

  // Pick up creatures added (or removed) while combat is running
  const combatCreaturesRef = useRef(combatCreatures);
  combatCreaturesRef.current = combatCreatures;
  const activeTurnRef = useRef(activeTurn);
  activeTurnRef.current = activeTurn;

  useEffect(() => {
    if (!combatMode) return;
    const prev = combatCreaturesRef.current;
    const encUids = new Set(enc.creatures.map(c => c.uid));
    const prevUids = new Set(prev.map(c => c.uid));

    const newOnes = enc.creatures
      .filter(c => !prevUids.has(c.uid))
      .map(c => ({ ...c, init: Math.floor(Math.random() * 20) + 1 }));
    const kept = prev.filter(c => encUids.has(c.uid));

    if (newOnes.length === 0 && kept.length === prev.length) return;

    const activeUid = prev[activeTurnRef.current]?.uid;
    const next = [...kept, ...newOnes].sort((a, b) => b.init - a.init);
    setCombatCreatures(next);
    if (activeUid) {
      const newIdx = next.findIndex(c => c.uid === activeUid);
      if (newIdx !== -1) setActiveTurn(newIdx);
    }
  }, [combatMode, enc.creatures]);

  // Custom creatures with isEnemy=false don't count toward XP budget
  const totalXP = enc.creatures.reduce((s, c) => {
    if (c.custom && c.isEnemy === false) return s;
    return s + xpFor(c.level, partyLevel);
  }, 0);
  const diff = getDifficulty(totalXP, partySize);

  // During combat, look up live HP/maxHp/conditions from encounter state
  const liveCombatCreatures: CombatCreature[] = combatCreatures.map(cc => {
    const live = enc.creatures.find(c => c.uid === cc.uid);
    return live ? { ...cc, hp: live.hp, maxHp: live.maxHp, conditions: live.conditions } : cc;
  });

  function startCombat() {
    const rolled: CombatCreature[] = enc.creatures
      .map(c => ({ ...c, init: Math.floor(Math.random() * 20) + 1 }))
      .sort((a, b) => b.init - a.init);
    setCombatCreatures(rolled);
    setCombatMode(true);
    setRound(1);
    setActiveTurn(0);
  }

  function endCombat() {
    setCombatMode(false);
    setRound(1);
    setActiveTurn(0);
    setCombatCreatures([]);
  }

  function nextTurn() {
    // Auto-reduce valued conditions on the creature ending their turn
    const ending = liveCombatCreatures[activeTurn];
    if (ending) {
      const updated = ending.conditions
        .map(cond => {
          if (cond.value != null && AUTO_REDUCE_CONDITIONS.has(cond.name.toLowerCase())) {
            return { ...cond, value: cond.value - 1 };
          }
          return cond;
        })
        .filter(cond => cond.value == null || cond.value > 0);
      if (updated.length !== ending.conditions.length || updated.some((c, i) => c.value !== ending.conditions[i]?.value)) {
        onUpdateConditions(ending.uid, updated);
      }
    }
    const next = (activeTurn + 1) % liveCombatCreatures.length;
    if (next === 0) setRound(r => r + 1);
    setActiveTurn(next);
  }

  function addCondition(uid: string, name: string, value?: number) {
    const creature = enc.creatures.find(c => c.uid === uid);
    if (!creature) return;
    const existing = creature.conditions.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    let next: Condition[];
    if (existing >= 0) {
      next = creature.conditions.map((c, i) => i === existing ? { ...c, value } : c);
    } else {
      next = [...creature.conditions, { name, value }];
    }
    onUpdateConditions(uid, next);
    setConditionPickerUid(null);
    setConditionPickerAnchor(null);
    setConditionValueUid(null);
    setConditionValueAnchor(null);
    setPendingConditionName('');
  }

  function handleConditionPick(uid: string, condName: string) {
    if (VALUED_CONDITIONS.has(condName.toLowerCase())) {
      setPendingConditionName(condName);
      setPendingConditionValue(1);
      setConditionValueUid(uid);
      setConditionValueAnchor(conditionPickerAnchor ? { ...conditionPickerAnchor } : null);
      setConditionPickerUid(null);
      setConditionPickerAnchor(null);
    } else {
      addCondition(uid, condName);
    }
  }

  function removeCondition(uid: string, condName: string) {
    const creature = enc.creatures.find(c => c.uid === uid);
    if (!creature) return;
    onUpdateConditions(uid, creature.conditions.filter(c => c.name !== condName));
  }

  // Condition picker drag
  const onCondPickerDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const currentX = condPickerPos?.x ?? conditionPickerAnchor?.x ?? 0;
    const currentY = condPickerPos?.y ?? conditionPickerAnchor?.y ?? 0;
    condPickerDragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startX: currentX, startY: currentY };
  }, [condPickerPos, conditionPickerAnchor]);

  const onCondPickerDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!condPickerDragRef.current) return;
    setCondPickerPos({
      x: condPickerDragRef.current.startX + (e.clientX - condPickerDragRef.current.startMouseX),
      y: condPickerDragRef.current.startY + (e.clientY - condPickerDragRef.current.startMouseY),
    });
  }, []);

  const onCondPickerDragEnd = useCallback(() => { condPickerDragRef.current = null; }, []);

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

  function applyTiers(level: number) {
    setCustomHp(lookupHp(level, 'moderate'));
    setCustomAc(lookupAc(level, 'moderate'));
    setCustomFort(lookupSave(level, 'moderate'));
    setCustomRef(lookupSave(level, 'moderate'));
    setCustomWill(lookupSave(level, 'moderate'));
    setHpTier('moderate');
    setAcTier('moderate');
    setFortTier('moderate');
    setRefTier('moderate');
    setWillTier('moderate');
    setCustomAttacks([defaultAttack(level)]);
    setCustomAbilities([]);
  }

  function openWizard() {
    setCustomName('');
    setCustomLevel(partyLevel);
    setUseQuickWizard(false);
    setWizardIsEnemy(false);
    applyTiers(partyLevel);
    setWizardStep(0);
    setShowCustomForm(true);
  }

  function wizardNext() {
    if (wizardStep === 0) {
      if (!customName.trim()) return;
      if (!useQuickWizard) {
        onAddCustomCreature(customName.trim(), customLevel, undefined, undefined, undefined, undefined, undefined, undefined, undefined, wizardIsEnemy);
        setShowCustomForm(false);
        return;
      }
      applyTiers(customLevel);
      setWizardStep(1);
    } else {
      const attacks: CustomAttack[] = customAttacks
        .filter(a => a.name.trim())
        .map(({ name, type, bonus, damage, range }) => ({ name: name.trim(), type, bonus, damage, range }));
      const abilities: CustomAbility[] = customAbilities
        .filter(a => a.name.trim())
        .map(({ name, description }) => ({ name: name.trim(), description }));
      onAddCustomCreature(customName.trim(), customLevel, customHp, customAc, customFort, customRef, customWill,
        attacks.length ? attacks : undefined,
        abilities.length ? abilities : undefined,
        wizardIsEnemy,
      );
      setShowCustomForm(false);
    }
  }

  function closeWizard() {
    setShowCustomForm(false);
    setWizardStep(0);
  }

  function commitInit(uid: string) {
    const val = parseInt(editInitVal, 10);
    if (!isNaN(val)) {
      const activeUid = liveCombatCreatures[activeTurn]?.uid;
      setCombatCreatures(prev => {
        const updated = prev
          .map(c => (c.uid === uid ? { ...c, init: val } : c))
          .sort((a, b) => b.init - a.init);
        if (activeUid) {
          const newIdx = updated.findIndex(c => c.uid === activeUid);
          if (newIdx !== -1) setActiveTurn(newIdx);
        }
        return updated;
      });
    }
    setEditingInit(null);
  }

  function commitHp(uid: string) {
    const raw = editHpVal.trim();
    if (raw === '') { setEditingHp(null); return; }
    const relMatch = raw.match(/^([+-])(\d+)$/);
    if (relMatch) {
      // Relative: +4 or -14 → delta from current HP
      const delta = parseInt(relMatch[1] + relMatch[2], 10);
      onUpdateHP(uid, delta);
    } else {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) onSetHP(uid, val);
    }
    setEditingHp(null);
  }

  function updateAttack(i: number, patch: Partial<AttackDraft>) {
    setCustomAttacks(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }

  function renderWizardStats() {
    return (
      <div className={styles.wizardStatList}>
        {/* ── Defenses ── */}
        <div className={styles.wizardSectionHead}>Defenses</div>
        {([
          { label: 'HP',   tiers: HP_TIERS,   tier: hpTier,   setTier: (t: HpTier)   => { setHpTier(t);   setCustomHp(lookupHp(customLevel, t));   }, val: customHp,   setVal: setCustomHp,   min: 1,   max: 9999, type: 'number' as const },
          { label: 'AC',   tiers: AC_TIERS,   tier: acTier,   setTier: (t: AcTier)   => { setAcTier(t);   setCustomAc(lookupAc(customLevel, t));   }, val: customAc,   setVal: setCustomAc,   min: 1,   max: 99,   type: 'number' as const },
          { label: 'Fort', tiers: SAVE_TIERS, tier: fortTier, setTier: (t: SaveTier) => { setFortTier(t); setCustomFort(lookupSave(customLevel, t)); }, val: customFort, setVal: setCustomFort, min: -10, max: 60,   type: 'number' as const },
          { label: 'Ref',  tiers: SAVE_TIERS, tier: refTier,  setTier: (t: SaveTier) => { setRefTier(t);  setCustomRef(lookupSave(customLevel, t));  }, val: customRef,  setVal: setCustomRef,  min: -10, max: 60,   type: 'number' as const },
          { label: 'Will', tiers: SAVE_TIERS, tier: willTier, setTier: (t: SaveTier) => { setWillTier(t); setCustomWill(lookupSave(customLevel, t)); }, val: customWill, setVal: setCustomWill, min: -10, max: 60,   type: 'number' as const },
        ] as const).map(({ label, tiers, tier, setTier, val, setVal, min, max }) => (
          <div key={label} className={styles.wizardStatRow}>
            <span className={styles.wizardStatLabel}>{label}</span>
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
            onClick={() => setCustomAttacks(prev => [...prev, defaultAttack(customLevel)])}
          >+ Add</button>
        </div>
        {customAttacks.map((atk, i) => (
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
              <button className={styles.removeAttackBtn} onClick={() => setCustomAttacks(prev => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
            <div className={styles.attackDraftRow2}>
              <span className={styles.attackSubLabel}>Atk</span>
              <div className={styles.tierBtns}>
                {AC_TIERS.map(t => (
                  <button key={t} title={t} className={`${styles.tierBtn} ${atk.bonusTier === t ? styles.tierBtnActive : ''}`}
                    onClick={() => updateAttack(i, { bonusTier: t, bonus: lookupAttack(customLevel, t) })}
                  >{TIER_ABBREV[t]}</button>
                ))}
              </div>
              <input className={styles.wizardStatInput} type="number" min={-10} max={70}
                value={atk.bonus} onChange={e => updateAttack(i, { bonus: Number(e.target.value) })} />
              <span className={styles.attackSubLabel}>Dmg</span>
              <div className={styles.tierBtns}>
                {AC_TIERS.map(t => (
                  <button key={t} title={t} className={`${styles.tierBtn} ${atk.damageTier === t ? styles.tierBtnActive : ''}`}
                    onClick={() => updateAttack(i, { damageTier: t, damage: lookupDamage(customLevel, t) })}
                  >{TIER_ABBREV[t]}</button>
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
            onClick={() => setCustomAbilities(prev => [...prev, { name: '', description: '' }])}
          >+ Add</button>
        </div>
        {customAbilities.map((ab, i) => (
          <div key={i} className={styles.abilityDraft}>
            <div className={styles.abilityDraftRow1}>
              <input
                className={styles.abilityNameInput}
                value={ab.name}
                onChange={e => setCustomAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a))}
                placeholder="Ability name…"
              />
              <button className={styles.removeAttackBtn} onClick={() => setCustomAbilities(prev => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
            <textarea
              className={styles.abilityDescInput}
              value={ab.description}
              onChange={e => setCustomAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, description: e.target.value } : a))}
              placeholder="Description (optional)…"
              rows={2}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.manager}>
      {/* Encounter tabs */}
      <div className={styles.tabs} ref={tabsRef}>
        {encounters.map((en, i) => (
          <div
            key={en.id}
            className={`${styles.tabWrapper} ${i === activeEnc ? styles.tabWrapperActive : ''} ${dragOverIdx === i ? styles.tabWrapperDragOver : ''}`}
            draggable={renamingTab !== i}
            onDragStart={() => setDragTabIdx(i)}
            onDragEnd={() => { setDragTabIdx(null); setDragOverIdx(null); }}
            onDragOver={e => { e.preventDefault(); setDragOverIdx(i); }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={() => {
              if (dragTabIdx !== null && dragTabIdx !== i) {
                onReorderEncounters(dragTabIdx, i);
              }
              setDragTabIdx(null);
              setDragOverIdx(null);
            }}
          >
            {renamingTab === i ? (
              <input
                className={styles.tabRenameInput}
                value={renameVal}
                autoFocus
                onChange={e => setRenameVal(e.target.value)}
                onBlur={() => {
                  if (renameVal.trim()) onRenameEncounter(i, renameVal.trim());
                  setRenamingTab(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (renameVal.trim()) onRenameEncounter(i, renameVal.trim());
                    setRenamingTab(null);
                  }
                  if (e.key === 'Escape') setRenamingTab(null);
                }}
              />
            ) : (
              <button
                className={`${styles.tab} ${i === activeEnc ? styles.tabActive : ''}`}
                onClick={() => onActiveEncChange(i)}
                onDoubleClick={() => { setRenamingTab(i); setRenameVal(en.name); }}
                title="Double-click to rename"
              >
                {en.name}
              </button>
            )}
            {confirmDeleteTab === i ? (
              <span className={styles.tabDeleteConfirm}>
                <button className={styles.tabDeleteYes} onClick={() => { onDeleteEncounter(i); setConfirmDeleteTab(null); }}>✓</button>
                <button className={styles.tabDeleteNo} onClick={() => setConfirmDeleteTab(null)}>✕</button>
              </span>
            ) : (
              i === activeEnc && encounters.length > 1 && (
                <button
                  className={styles.tabDeleteBtn}
                  onClick={() => setConfirmDeleteTab(i)}
                  title="Delete encounter"
                >
                  ×
                </button>
              )
            )}
          </div>
        ))}
        <button className={styles.addTabBtn} onClick={onAddEncounter} title="New encounter">
          ＋
        </button>
      </div>

      {!combatMode ? (
        <>
          {/* XP Budget */}
          <div className={styles.budget}>
            <div className={styles.budgetHeader}>
              <span className={styles.sectionLabel}>Budget</span>
              <span className={styles.diffLabel} style={{ color: diff.color }}>
                {diff.label}
              </span>
            </div>
            <div className={styles.budgetBar}>
              <div
                className={styles.budgetFill}
                style={{ width: `${Math.min(100, diff.pct)}%`, background: diff.color }}
              />
            </div>
            <div className={styles.partyRow}>
              <div className={styles.partyControls}>
                <span className={styles.partyLabel}>Party</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => onPartySizeChange(Math.max(1, partySize - 1))}
                >
                  −
                </button>
                <span className={styles.partyVal}>{partySize}</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => onPartySizeChange(Math.min(8, partySize + 1))}
                >
                  +
                </button>
                <span className={styles.partyLabel}>× Lvl</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => onPartyLevelChange(Math.max(1, partyLevel - 1))}
                >
                  −
                </button>
                <span className={styles.partyVal}>{partyLevel}</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => onPartyLevelChange(Math.min(20, partyLevel + 1))}
                >
                  +
                </button>
              </div>
              <span className={styles.xpTotal}>{totalXP} XP</span>
            </div>
          </div>

          {/* Creature list */}
          <div className={styles.creatureList}>
            <div className={styles.sectionLabel}>Creatures ({enc.creatures.length})</div>
            {enc.creatures.length === 0 && (
              <div className={styles.emptyHint}>
                Click <strong>+</strong> on any creature to add it
              </div>
            )}
            {enc.creatures.map(c => {
              const xp = (c.custom && c.isEnemy === false) ? 0 : xpFor(c.level, partyLevel);
              return (
                <div key={c.uid} className={styles.creatureCard}>
                  <div className={styles.creatureInfo}>
                    <span
                      className={`${styles.creatureName} ${c.creatureId ? styles.creatureNameClickable : ''}`}
                      onClick={() => c.creatureId && onSelectCreature(c.creatureId, c.uid)}
                      title={c.creatureId ? 'View statblock' : undefined}
                    >
                      {c.name}
                    </span>
                    <span className={styles.creatureMeta}>
                      Lvl {c.level}{xp > 0 ? ` · ${xp} XP` : ''}
                    </span>
                  </div>
                  <button className={styles.removeBtn} onClick={() => onRemoveCreature(c.uid)}>
                    ✕
                  </button>
                </div>
              );
            })}

            {showCustomForm ? (
              <div className={styles.customForm}>
                {wizardStep === 0 ? (
                  <>
                    <div className={styles.wizardTitle}>Placeholder Creature — Name & Level</div>
                    <input
                      className={styles.customInput}
                      value={customName}
                      autoFocus
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="Name…"
                      onKeyDown={e => e.key === 'Enter' && wizardNext()}
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
                          checked={wizardIsEnemy}
                          onChange={e => setWizardIsEnemy(e.target.checked)}
                        />
                        Enemy?
                      </label>
                    </div>
                    <div className={styles.customLevelRow}>
                      <span className={styles.partyLabel}>Level</span>
                      <button className={styles.stepBtn} onClick={() => setCustomLevel(l => Math.max(-1, l - 1))}>−</button>
                      <span className={styles.partyVal}>{customLevel}</span>
                      <button className={styles.stepBtn} onClick={() => setCustomLevel(l => Math.min(25, l + 1))}>+</button>
                    </div>
                    <div className={styles.customActions}>
                      <button className={styles.addCustomBtn} onClick={wizardNext} disabled={!customName.trim()}>
                        {useQuickWizard ? 'Next →' : 'Add'}
                      </button>
                      <button className={styles.cancelBtn} onClick={closeWizard}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.wizardTitle}>
                      {customName} (Lvl {customLevel}) — Stats
                    </div>
                    <div className={styles.wizardHint}>Click a tier to prefill · T=Terrible L=Low M=Moderate H=High E=Extreme</div>
                    {renderWizardStats()}
                    <div className={styles.customActions}>
                      <button className={styles.cancelBtn} onClick={() => setWizardStep(0)}>← Back</button>
                      <button className={styles.addCustomBtn} onClick={wizardNext}>Add</button>
                      <button className={styles.cancelBtn} onClick={closeWizard}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                className={styles.addPlaceholderBtn}
                onClick={openWizard}
              >
                ＋ Add Placeholder Creature
              </button>
            )}
          </div>

          {enc.creatures.length > 0 && (
            <div className={styles.startCombatRow}>
              <button className={styles.startCombatBtn} onClick={startCombat}>
                ▶ Start Combat
              </button>
            </div>
          )}
        </>
      ) : (
        /* Combat tracker */
        <div className={styles.combat}>
          <div className={styles.combatHeader}>
            <span className={styles.roundLabel}>Round {round}</span>
            <button className={styles.nextTurnBtn} onClick={nextTurn}>
              Next Turn
            </button>
            <button className={styles.endCombatBtn} onClick={endCombat}>
              ✕ End
            </button>
          </div>
          <div className={styles.combatList}>
            {liveCombatCreatures.map((c, i) => {
              const isActive = i === activeTurn;
              const hpPct = c.maxHp > 0 ? c.hp / c.maxHp : 0;
              const hpColor =
                hpPct > 0.5 ? '#3a7a3a' : hpPct > 0.25 ? '#8a6a18' : '#8a2a18';
              return (
                <div
                  key={c.uid}
                  className={`${styles.combatCard} ${isActive ? styles.combatCardActive : ''}`}
                >
                  <div className={styles.combatCardTop}>
                    {/* Initiative badge */}
                    {editingInit === c.uid ? (
                      <input
                        className={styles.initInput}
                        type="number"
                        value={editInitVal}
                        autoFocus
                        onChange={e => setEditInitVal(e.target.value)}
                        onBlur={() => commitInit(c.uid)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitInit(c.uid);
                          if (e.key === 'Escape') setEditingInit(null);
                        }}
                      />
                    ) : (
                      <div
                        className={`${styles.initBadge} ${isActive ? styles.initBadgeActive : ''} ${styles.initBadgeClickable}`}
                        title="Click to edit initiative"
                        onClick={() => { setEditingInit(c.uid); setEditInitVal(String(c.init)); }}
                      >
                        {c.init}
                      </div>
                    )}

                    {/* Name + defenses block */}
                    <div className={styles.combatCreatureInfo}>
                      <span
                        className={`${styles.combatName} ${isActive ? styles.combatNameActive : ''} ${c.creatureId ? styles.creatureNameClickable : ''}`}
                        onClick={() => c.creatureId && onSelectCreature(c.creatureId, c.uid)}
                        title={c.creatureId ? 'View statblock' : undefined}
                      >
                        {c.name}
                        {isActive && <span className={styles.activePill}>ACTIVE</span>}
                      </span>
                      {(() => {
                        const pen = computePenalties(c.conditions);
                        const effAc   = c.ac > 0 ? c.ac + pen.ac : c.ac;
                        const effFort = c.fort != null ? c.fort + pen.fort : c.fort;
                        const effRef  = c.ref  != null ? c.ref  + pen.ref  : c.ref;
                        const effWill = c.will != null ? c.will + pen.will : c.will;
                        const debuffStyle = { color: '#c0392b', fontWeight: 700 } as const;
                        return (
                          <div className={styles.combatDefenseRow}>
                            {c.ac > 0 && (
                            <span
                              className={styles.combatDefStat}
                              title="Armor Class"
                              onClick={e => setDiceRoll({ expr: `1d20`, label: 'Armor Class', x: e.clientX, y: e.clientY - 160 })}
                            >
                              <span className={styles.combatDefLabel}>AC</span>
                              <span className={styles.combatDefVal} style={pen.ac !== 0 ? debuffStyle : undefined}>{effAc}</span>
                            </span>
                            )}
                            {c.fort != null && effFort != null && (
                              <span
                                className={styles.combatDefStat}
                                title="Fortitude"
                                onClick={e => setDiceRoll({ expr: `1d20${effFort >= 0 ? `+${effFort}` : effFort}`, label: `${c.name} · Fortitude`, x: e.clientX, y: e.clientY - 160 })}
                              >
                                <span className={styles.combatDefLabel}>F</span>
                                <span className={styles.combatDefVal} style={pen.fort !== 0 ? debuffStyle : undefined}>{effFort >= 0 ? `+${effFort}` : effFort}</span>
                              </span>
                            )}
                            {c.ref != null && effRef != null && (
                              <span
                                className={styles.combatDefStat}
                                title="Reflex"
                                onClick={e => setDiceRoll({ expr: `1d20${effRef >= 0 ? `+${effRef}` : effRef}`, label: `${c.name} · Reflex`, x: e.clientX, y: e.clientY - 160 })}
                              >
                                <span className={styles.combatDefLabel}>R</span>
                                <span className={styles.combatDefVal} style={pen.ref !== 0 ? debuffStyle : undefined}>{effRef >= 0 ? `+${effRef}` : effRef}</span>
                              </span>
                            )}
                            {c.will != null && effWill != null && (
                              <span
                                className={styles.combatDefStat}
                                title="Will"
                                onClick={e => setDiceRoll({ expr: `1d20${effWill >= 0 ? `+${effWill}` : effWill}`, label: `${c.name} · Will`, x: e.clientX, y: e.clientY - 160 })}
                              >
                                <span className={styles.combatDefLabel}>W</span>
                                <span className={styles.combatDefVal} style={pen.will !== 0 ? debuffStyle : undefined}>{effWill >= 0 ? `+${effWill}` : effWill}</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Recall Knowledge */}
                    {(() => {
                      const rk = c.traits && c.traits.length > 0 ? getRecallKnowledge(c.level, c.traits) : null;
                      if (!rk) return null;
                      return (
                        <div className={styles.rkRow} title="Recall Knowledge DC">
                          <span className={styles.rkLabel}>RK</span>
                          <span className={styles.rkVal}>DC {rk.dc}</span>
                          <span className={styles.rkSkills}>{rk.skills.join(' / ')}</span>
                        </div>
                      );
                    })()}

                    {/* HP display */}
                    {editingHp === c.uid ? (
                      <input
                        className={styles.hpInput}
                        type="text"
                        value={editHpVal}
                        autoFocus
                        placeholder={String(c.hp)}
                        onChange={e => setEditHpVal(e.target.value)}
                        onFocus={e => e.target.select()}
                        onBlur={() => commitHp(c.uid)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitHp(c.uid);
                          if (e.key === 'Escape') setEditingHp(null);
                        }}
                      />
                    ) : (
                      <span
                        className={`${styles.hpDisplay} ${styles.hpDisplayClickable}`}
                        style={{ color: hpColor }}
                        title="Click to set HP; type +4 or -14 for relative change"
                        onClick={() => { setEditingHp(c.uid); setEditHpVal(''); }}
                      >
                        {c.hp}/{c.maxHp}
                      </span>
                    )}
                  </div>

                  {/* Attacks */}
                  {c.attacks && c.attacks.length > 0 && (
                    <div className={styles.combatAttacks}>
                      {c.attacks.map((atk, ai) => {
                        const traits = atk.traits ?? [];
                        const atkRollPen = computeAttackPenalty(c.conditions, atk.type, traits, c.strMod, c.dexMod);
                        const dmgPen = computeDamagePenalty(c.conditions, atk.type, traits);
                        const effBonus = atk.bonus + atkRollPen;
                        // Build a damage expression adjusted by flat enfeebled penalty
                        const dmgExpr = dmgPen !== 0
                          ? `${atk.damage}${dmgPen >= 0 ? `+${dmgPen}` : dmgPen}`
                          : atk.damage;
                        return (
                          <div key={ai} className={styles.combatAtkRow}>
                            <span className={styles.combatAtkIcon}>{atk.type === 'melee' ? '⚔' : '🏹'}</span>
                            <span
                              className={`${styles.combatAtkName} ${styles.rollable}`}
                              title="Click to roll attack"
                              onClick={e => setDiceRoll({ expr: `1d20${effBonus >= 0 ? `+${effBonus}` : effBonus}`, label: `${c.name} · ${atk.name}`, x: e.clientX, y: e.clientY - 160 })}
                              style={atkRollPen !== 0 ? { color: '#c0392b' } : undefined}
                            >
                              {atk.name} {effBonus >= 0 ? `+${effBonus}` : effBonus}
                            </span>
                            <span
                              className={`${styles.combatAtkDmg} ${styles.rollable}`}
                              title="Click to roll damage"
                              onClick={e => setDiceRoll({ expr: dmgExpr, label: `${c.name} · ${atk.name} dmg`, x: e.clientX, y: e.clientY - 160 })}
                              style={dmgPen !== 0 ? { color: '#c0392b' } : undefined}
                            >
                              {dmgExpr}
                            </span>
                            {atk.range != null && <span className={styles.combatAtkRange}>{atk.range}ft</span>}
                            {traits.length > 0 && (
                              <span className={styles.combatAtkTraits}>{traits.join(', ')}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Abilities */}
                  {c.abilities && c.abilities.length > 0 && (
                    <div className={styles.combatAbilities}>
                      {c.abilities.map((ab, ai) => (
                        <span key={ai} className={styles.combatAbilityChip} title={ab.description || undefined}>
                          {ab.actionType === 'single' && <span className={styles.actionIcon}>◆</span>}
                          {ab.actionType === 'two' && <span className={styles.actionIcon}>◆◆</span>}
                          {ab.actionType === 'three' && <span className={styles.actionIcon}>◆◆◆</span>}
                          {ab.actionType === 'reaction' && <span className={styles.actionIcon}>↺</span>}
                          {ab.actionType === 'free' && <span className={styles.actionIcon}>⟳</span>}
                          {ab.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Conditions */}
                  <div className={styles.conditionRow}>
                    {c.conditions.map(cond => {
                      const isValued = cond.value != null;
                      return (
                        <span
                          key={cond.name}
                          className={styles.conditionChip}
                          title={isValued ? `Left-click to edit · Right-click to remove` : `Click to remove`}
                          onClick={e => {
                            if (isValued) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom - 4;
                              const spaceAbove = rect.top - 4;
                              setPendingConditionName(cond.name);
                              setPendingConditionValue(cond.value!);
                              setConditionValueAnchor({ x: rect.left, y: rect.bottom + 4, top: rect.top, spaceBelow, spaceAbove });
                              setConditionValueUid(c.uid);
                              setConditionPickerUid(null);
                              setConditionPickerAnchor(null);
                            } else {
                              removeCondition(c.uid, cond.name);
                            }
                          }}
                          onContextMenu={e => {
                            e.preventDefault();
                            removeCondition(c.uid, cond.name);
                          }}
                        >
                          {cond.name}{cond.value != null ? ` ${cond.value}` : ''}
                          {isValued ? ' ✎' : ' ×'}
                        </span>
                      );
                    })}
                    <button
                      className={styles.addConditionBtn}
                      onClick={e => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom - 4;
                        const spaceAbove = rect.top - 4;
                        setConditionPickerUid(c.uid);
                        setConditionPickerAnchor({ x: rect.left, y: rect.bottom + 4, top: rect.top, spaceBelow, spaceAbove });
                        setConditionValueUid(null);
                        setConditionValueAnchor(null);
                      }}
                      title="Add condition"
                    >
                      + cond
                    </button>
                  </div>
                  <div className={styles.hpBar}>
                    <div
                      className={styles.hpFill}
                      style={{ width: `${hpPct * 100}%`, background: hpColor }}
                    />
                  </div>
                  <div className={styles.hpBtns}>
                    {([-10, -5, -1, 1, 5, 10] as const).map(v => (
                      <button
                        key={v}
                        className={`${styles.hpBtn} ${v > 0 ? styles.hpBtnHeal : styles.hpBtnDmg}`}
                        onClick={() => onUpdateHP(c.uid, v)}
                      >
                        {v > 0 ? `+${v}` : v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Add creatures during combat */}
            {showCustomForm ? (
              <div className={styles.customForm}>
                {wizardStep === 0 ? (
                  <>
                    <div className={styles.wizardTitle}>Add to Combat — Name & Level</div>
                    <input
                      className={styles.customInput}
                      value={customName}
                      autoFocus
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="Name…"
                      onKeyDown={e => e.key === 'Enter' && wizardNext()}
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
                          checked={wizardIsEnemy}
                          onChange={e => setWizardIsEnemy(e.target.checked)}
                        />
                        Enemy?
                      </label>
                    </div>
                    <div className={styles.customLevelRow}>
                      <span className={styles.partyLabel}>Level</span>
                      <button className={styles.stepBtn} onClick={() => setCustomLevel(l => Math.max(-1, l - 1))}>−</button>
                      <span className={styles.partyVal}>{customLevel}</span>
                      <button className={styles.stepBtn} onClick={() => setCustomLevel(l => Math.min(25, l + 1))}>+</button>
                    </div>
                    <div className={styles.customActions}>
                      <button className={styles.addCustomBtn} onClick={wizardNext} disabled={!customName.trim()}>
                        {useQuickWizard ? 'Next →' : 'Add'}
                      </button>
                      <button className={styles.cancelBtn} onClick={closeWizard}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.wizardTitle}>{customName} (Lvl {customLevel})</div>
                    <div className={styles.wizardHint}>Click a tier to prefill · T=Terrible L=Low M=Moderate H=High E=Extreme</div>
                    {renderWizardStats()}
                    <div className={styles.customActions}>
                      <button className={styles.cancelBtn} onClick={() => setWizardStep(0)}>← Back</button>
                      <button className={styles.addCustomBtn} onClick={wizardNext}>Add</button>
                      <button className={styles.cancelBtn} onClick={closeWizard}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                className={styles.addPlaceholderBtn}
                onClick={openWizard}
              >
                ＋ Add Placeholder Creature
              </button>
            )}
          </div>
        </div>
      )}

      {diceRoll && (
        <DiceRoller
          expression={diceRoll.expr}
          label={diceRoll.label}
          anchorX={diceRoll.x}
          anchorY={diceRoll.y}
          onClose={() => setDiceRoll(null)}
          onRoll={onRoll}
        />
      )}

      {/* ── Condition picker popup ── */}
      {conditionPickerUid && conditionPickerAnchor && createPortal(
        <>
          {/* Backdrop to close on outside click */}
          <div
            className={styles.conditionPopupBackdrop}
            onClick={() => { setConditionPickerUid(null); setConditionPickerAnchor(null); setCondPickerPos(null); }}
          />
          <div
            className={styles.conditionPopup}
            style={condPickerPos
              ? { left: condPickerPos.x, top: condPickerPos.y, maxHeight: 400 }
              : popupStyle(conditionPickerAnchor)}
            onPointerMove={onCondPickerDragMove}
            onPointerUp={onCondPickerDragEnd}
          >
            <div
              className={`${styles.conditionPopupHeader} ${styles.conditionPopupDragHandle}`}
              onPointerDown={onCondPickerDragStart}
            >
              <span className={styles.conditionPopupTitle}>Add Condition</span>
              <div className={styles.conditionSortToggle}>
                <button
                  className={`${styles.conditionSortBtn} ${conditionPickerSort === 'category' ? styles.conditionSortBtnActive : ''}`}
                  onClick={() => setConditionPickerSort('category')}
                >Category</button>
                <button
                  className={`${styles.conditionSortBtn} ${conditionPickerSort === 'alpha' ? styles.conditionSortBtnActive : ''}`}
                  onClick={() => setConditionPickerSort('alpha')}
                >A–Z</button>
              </div>
              <button
                className={styles.conditionPickerClose}
                onClick={() => { setConditionPickerUid(null); setConditionPickerAnchor(null); }}
              >✕</button>
            </div>
            <div className={styles.conditionPopupBody}>
              {conditionPickerSort === 'category' ? (
                CONDITION_CATEGORIES.map(cat => (
                  <div key={cat.label} className={styles.conditionCategory}>
                    <span className={styles.conditionCategoryLabel}>{cat.label}</span>
                    <div className={styles.conditionCategoryBtns}>
                      {cat.conditions.map(condName => (
                        <button
                          key={condName}
                          className={styles.conditionPickerBtn}
                          onClick={() => handleConditionPick(conditionPickerUid, condName)}
                        >
                          {condName}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.conditionAlphaGrid}>
                  {ALL_CONDITIONS_ALPHA.map(condName => (
                    <button
                      key={condName}
                      className={styles.conditionPickerBtn}
                      onClick={() => handleConditionPick(conditionPickerUid, condName)}
                    >
                      {condName === 'Persistent Damage' ? 'Prsnt Damage' : condName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}

      {/* ── Condition value stepper popup ── */}
      {conditionValueUid && conditionValueAnchor && createPortal(
        <>
          <div
            className={styles.conditionPopupBackdrop}
            onClick={() => addCondition(conditionValueUid, pendingConditionName, pendingConditionValue)}
          />
          <div
            className={styles.conditionPopup}
            style={popupStyle(conditionValueAnchor)}
          >
            <div className={styles.conditionPopupHeader}>
              <span className={styles.conditionPopupTitle}>{pendingConditionName}</span>
              <button
                className={styles.conditionPickerClose}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setConditionValueUid(null); setConditionValueAnchor(null); setPendingConditionName(''); }}
              >✕</button>
            </div>
            <div className={styles.conditionValueRow}>
              <button
                className={styles.conditionStepBtn}
                onClick={() => setPendingConditionValue(v => Math.max(1, v - 1))}
              >−</button>
              <span className={styles.conditionValueDisplay}>{pendingConditionValue}</span>
              <button
                className={styles.conditionStepBtn}
                onClick={() => setPendingConditionValue(v => Math.min(20, v + 1))}
              >+</button>
              <button
                className={styles.conditionValueConfirm}
                onClick={() => addCondition(conditionValueUid, pendingConditionName, pendingConditionValue)}
              >✓ Apply</button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
