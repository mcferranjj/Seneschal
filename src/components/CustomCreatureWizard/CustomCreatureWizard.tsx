import { useState, useRef, useEffect } from 'react';
import type { CreatureRecord } from '../../db/schema';
import type { CustomAttack, CustomAbility, AbilityActionType, CustomSpeed, CustomSense, CustomImmunity, CustomResistance, SpeedType, CustomSpellcastingEntry, CustomSpell, SpellTradition, SpellcastingType, SpellFrequency, CustomSkill } from '../../types/encounter';
import { db } from '../../db/db';
import { getAllTraits } from '../../search/search';
import { stripFoundryMacros, linkKeywords, linkRolls } from '../StatblockDrawer/statblockHelpers';
import styles from './CustomCreatureWizard.module.css';

function processHtml(raw: string): string {
  return linkRolls(linkKeywords(stripFoundryMacros(raw)));
}

const CREATURE_TYPES = [
  'Aberration', 'Animal', 'Astral', 'Beast', 'Celestial', 'Construct',
  'Dragon', 'Dream', 'Elemental', 'Ethereal', 'Fey', 'Fiend', 'Fungus',
  'Humanoid', 'Monitor', 'Ooze', 'Plant', 'Shade', 'Spirit', 'Time', 'Undead',
];

const SIZES: { value: string; label: string }[] = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'sm',   label: 'Small' },
  { value: 'med',  label: 'Medium' },
  { value: 'lg',   label: 'Large' },
  { value: 'huge', label: 'Huge' },
  { value: 'grg',  label: 'Gargantuan' },
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

const COMMON_SENSES = [
  'low-light vision', 'darkvision', 'greater darkvision',
  'scent', 'tremorsense', 'echolocation', 'motion sense', 'lifesense',
];

const OFFICIAL_SKILLS = [
  'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception', 'Diplomacy',
  'Intimidation', 'Medicine', 'Nature', 'Occultism', 'Performance', 'Religion',
  'Society', 'Stealth', 'Survival', 'Thievery',
];

const LANGUAGE_SUGGESTIONS = [
  'Common', 'Draconic', 'Dwarven', 'Elven', 'Fey', 'Gnomish', 'Goblin', 'Halfling',
  'Jotun', 'Orcish', 'Sakvroth',
  'Aklo', 'Chthonian', 'Diabolic', 'Empyrean', 'Kholo', 'Necril', 'Petran', 'Pyric',
  'Shadowtongue', 'Sussuran', 'Thalassic', 'Muan', 'Talican',
];

const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'electricity', 'fire', 'force',
  'mental', 'negative', 'piercing', 'poison', 'positive', 'slashing', 'sonic',
  'bleed', 'chaotic', 'evil', 'good', 'lawful', 'void', 'vitality',
  'cold iron', 'silver', 'adamantine', 'magical',
  'disease', 'death effects', 'doomed', 'drained', 'fatigued',
  'paralyzed', 'petrified', 'poison', 'sleep', 'unconscious',
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

// Ability modifier tiers: Extreme/High/Moderate/Low (no Terrible for abilities)
type AbilityTier = 'low' | 'moderate' | 'high' | 'extreme';
const ABILITY_TIERS: AbilityTier[] = ['low', 'moderate', 'high', 'extreme'];

export const ABILITY_TABLE: Record<number, Record<AbilityTier, number>> = {
  [-1]: { extreme: 99,  high: 3,  moderate: 2,  low: 0  },
  [0]:  { extreme: 99,  high: 3,  moderate: 2,  low: 0  },
  [1]:  { extreme: 5,   high: 4,  moderate: 3,  low: 1  },
  [2]:  { extreme: 5,   high: 4,  moderate: 3,  low: 1  },
  [3]:  { extreme: 5,   high: 4,  moderate: 3,  low: 1  },
  [4]:  { extreme: 6,   high: 5,  moderate: 3,  low: 2  },
  [5]:  { extreme: 6,   high: 5,  moderate: 4,  low: 2  },
  [6]:  { extreme: 7,   high: 5,  moderate: 4,  low: 2  },
  [7]:  { extreme: 7,   high: 6,  moderate: 4,  low: 2  },
  [8]:  { extreme: 7,   high: 6,  moderate: 4,  low: 3  },
  [9]:  { extreme: 7,   high: 6,  moderate: 4,  low: 3  },
  [10]: { extreme: 8,   high: 7,  moderate: 5,  low: 3  },
  [11]: { extreme: 8,   high: 7,  moderate: 5,  low: 3  },
  [12]: { extreme: 8,   high: 7,  moderate: 5,  low: 4  },
  [13]: { extreme: 9,   high: 8,  moderate: 5,  low: 4  },
  [14]: { extreme: 9,   high: 8,  moderate: 5,  low: 4  },
  [15]: { extreme: 9,   high: 8,  moderate: 6,  low: 4  },
  [16]: { extreme: 10,  high: 9,  moderate: 6,  low: 5  },
  [17]: { extreme: 10,  high: 9,  moderate: 6,  low: 5  },
  [18]: { extreme: 10,  high: 9,  moderate: 6,  low: 5  },
  [19]: { extreme: 11,  high: 10, moderate: 6,  low: 5  },
  [20]: { extreme: 11,  high: 10, moderate: 7,  low: 6  },
  [21]: { extreme: 11,  high: 10, moderate: 7,  low: 6  },
  [22]: { extreme: 11,  high: 10, moderate: 8,  low: 6  },
  [23]: { extreme: 11,  high: 10, moderate: 8,  low: 6  },
  [24]: { extreme: 13,  high: 12, moderate: 9,  low: 7  },
  [25]: { extreme: 13,  high: 12, moderate: 9,  low: 7  },
};
// level -1 and 0 have no extreme in the table; use 99 as sentinel (hide tier btn)

export const PERCEPTION_TABLE: Record<number, Record<SaveTier, number>> = {
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

// Resistance/Weakness: Maximum = 'high', Minimum = 'low', median = 'moderate'
export const RES_WEAK_TABLE: Record<number, { high: number; moderate: number; low: number }> = {
  [-1]: { high: 1,  moderate: 1,  low: 1  },
  [0]:  { high: 3,  moderate: 2,  low: 1  },
  [1]:  { high: 3,  moderate: 2,  low: 2  },
  [2]:  { high: 5,  moderate: 3,  low: 2  },
  [3]:  { high: 6,  moderate: 4,  low: 3  },
  [4]:  { high: 7,  moderate: 5,  low: 4  },
  [5]:  { high: 8,  moderate: 6,  low: 4  },
  [6]:  { high: 9,  moderate: 7,  low: 5  },
  [7]:  { high: 10, moderate: 7,  low: 5  },
  [8]:  { high: 11, moderate: 8,  low: 6  },
  [9]:  { high: 12, moderate: 9,  low: 6  },
  [10]: { high: 13, moderate: 10, low: 7  },
  [11]: { high: 14, moderate: 10, low: 7  },
  [12]: { high: 15, moderate: 11, low: 8  },
  [13]: { high: 16, moderate: 12, low: 8  },
  [14]: { high: 17, moderate: 13, low: 9  },
  [15]: { high: 18, moderate: 13, low: 9  },
  [16]: { high: 19, moderate: 14, low: 9  },
  [17]: { high: 19, moderate: 14, low: 10 },
  [18]: { high: 20, moderate: 15, low: 10 },
  [19]: { high: 21, moderate: 16, low: 11 },
  [20]: { high: 22, moderate: 16, low: 11 },
  [21]: { high: 23, moderate: 17, low: 12 },
  [22]: { high: 24, moderate: 18, low: 12 },
  [23]: { high: 25, moderate: 19, low: 13 },
  [24]: { high: 26, moderate: 19, low: 13 },
  [25]: { high: 27, moderate: 20, low: 14 },
};

type ResWeakTier = 'low' | 'moderate' | 'high';
const RES_WEAK_TIERS: ResWeakTier[] = ['low', 'moderate', 'high'];

function lookupAbility(level: number, tier: AbilityTier): number {
  const l = Math.max(-1, Math.min(25, level));
  return (ABILITY_TABLE[l] ?? ABILITY_TABLE[0])[tier];
}
function lookupPerception(level: number, tier: SaveTier): number {
  const l = Math.max(-1, Math.min(25, level));
  return (PERCEPTION_TABLE[l] ?? PERCEPTION_TABLE[0])[tier];
}
function lookupResWeak(level: number, tier: ResWeakTier): number {
  const l = Math.max(-1, Math.min(25, level));
  return (RES_WEAK_TABLE[l] ?? RES_WEAK_TABLE[0])[tier];
}

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
          />
          {focused && typeInput.length > 0 && (() => {
            const q = typeInput.toLowerCase();
            const sugg = DAMAGE_TYPES.filter(d => d.includes(q) && d !== typeInput.toLowerCase()).slice(0, 6);
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
  const editType = isEditing
    ? (editCreature!.traits.find(t => CREATURE_TYPES.map(c => c.toLowerCase()).includes(t)) ?? '')
    : '';
  const editExtraTraits = isEditing
    ? editCreature!.traits.filter(t => !CREATURE_TYPES.map(c => c.toLowerCase()).includes(t))
    : [];
  const editAttacks: AttackDraft[] = isEditing && editCreature!.customData?.attacks
    ? editCreature!.customData.attacks.map(a => ({
        name: a.name,
        type: a.type,
        bonus: a.bonus,
        bonusTier: 'moderate' as AcTier,
        damage: a.damage,
        damageTier: 'moderate' as AcTier,
        range: a.range,
        traits: a.traits ?? [],
        traitInput: '',
      }))
    : [];

  const [step, setStep] = useState(isEditing ? 0 : 0);
  const [name, setName] = useState(initFromEdit(editCreature?.name ?? '', ''));
  const [level, setLevel] = useState(initFromEdit(editCreature?.level ?? partyLevel, partyLevel));
  const [size, setSize] = useState(initFromEdit(editCreature?.size ?? 'med', 'med'));
  const [creatureType, setCreatureType] = useState(
    isEditing ? (CREATURE_TYPES.find(t => t.toLowerCase() === editType) ?? '') : ''
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
  const [hpTier, setHpTier] = useState<HpTier>('moderate');
  const [acTier, setAcTier] = useState<AcTier>('moderate');
  const [fortTier, setFortTier] = useState<SaveTier>('moderate');
  const [refTier, setRefTier] = useState<SaveTier>('moderate');
  const [willTier, setWillTier] = useState<SaveTier>('moderate');
  const [attacks, setAttacks] = useState<AttackDraft[]>(() =>
    isEditing && editAttacks.length > 0 ? editAttacks : [defaultAttack(partyLevel)]
  );
  const [abilities, setAbilities] = useState<CustomAbility[]>(
    initFromEdit(editCreature?.customData?.abilities ?? [], [])
  );
  const [extraTraits, setExtraTraits] = useState<string[]>(initFromEdit(editExtraTraits, []));
  const [traitInput, setTraitInput] = useState('');
  const traitInputRef = useRef<HTMLInputElement>(null);
  const [allTraits, setAllTraits] = useState<string[]>([]);
  const [focusedAttackIdx, setFocusedAttackIdx] = useState<number | null>(null);
  const [focusedAbilityIdx, setFocusedAbilityIdx] = useState<number | null>(null);
  const [flavorText, setFlavorText] = useState(initFromEdit(editCreature?.customData?.flavorText ?? '', ''));

  // Ability modifiers
  const editAbils = editCreature?.data as any;
  const [strMod, setStrMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.str?.mod ?? 0, 0));
  const [dexMod, setDexMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.dex?.mod ?? 0, 0));
  const [conMod, setConMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.con?.mod ?? 0, 0));
  const [intMod, setIntMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.int?.mod ?? 0, 0));
  const [wisMod, setWisMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.wis?.mod ?? 0, 0));
  const [chaMod, setChaMod] = useState<number>(initFromEdit(editAbils?.system?.abilities?.cha?.mod ?? 0, 0));
  const [strTier, setStrTier] = useState<AbilityTier>('moderate');
  const [dexTier, setDexTier] = useState<AbilityTier>('moderate');
  const [conTier, setConTier] = useState<AbilityTier>('moderate');
  const [intTier, setIntTier] = useState<AbilityTier>('moderate');
  const [wisTier, setWisTier] = useState<AbilityTier>('moderate');
  const [chaTier, setChaTier] = useState<AbilityTier>('moderate');

  // Perception
  const [perception, setPerception] = useState<number>(() => {
    if (isEditing) return editAbils?.system?.perception?.mod ?? editAbils?.system?.perception?.value ?? lookupPerception(partyLevel, 'moderate');
    return lookupPerception(partyLevel, 'moderate');
  });
  const [perceptionTier, setPerceptionTier] = useState<SaveTier>('moderate');

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

  // Skills
  const [skills, setSkills] = useState<CustomSkill[]>(
    initFromEdit(editCreature?.customData?.skills ?? [], [])
  );
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

  // Ability editor tab state: map from ability index to 'edit' | 'preview'
  const [abilityEditorTabs, setAbilityEditorTabs] = useState<Record<number, 'edit' | 'preview'>>({});
  const abilityTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

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

  function goNext() {
    if (!name.trim() || !creatureType) return;
    // Only reset tiers/stats when creating new (not editing)
    if (!isEditing) applyTiers(level);
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
      .map(({ name: n, description, actionType, frequency, trigger, requirements }) => ({
        name: n.trim(), description, actionType,
        frequency: frequency?.trim() || undefined,
        trigger: trigger?.trim() || undefined,
        requirements: requirements?.trim() || undefined,
      }));
    // Preserve ID when editing; generate new one for new creatures
    const id = isEditing ? editCreature!.id : `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const trimmedName = name.trim();
    const allTraitsList = [creatureType.toLowerCase(), ...extraTraits];
    // Build speed string for PF2E system blob
    const landSpeed = speeds.find(s => s.type === 'land');
    const otherSpeeds = speeds.filter(s => s.type !== 'land').map(s => ({ type: s.type, value: s.value, label: s.type }));

    // Build immunities/resistances/weaknesses for PF2E system blob
    const pf2eImmunities = immunities.map(i => ({ type: i.type }));
    const pf2eResistances = resistances.map(r => ({ type: r.type, value: r.value, exceptions: r.exceptions ? [r.exceptions] : undefined }));
    const pf2eWeaknesses = weaknesses.map(w => ({ type: w.type, value: w.value, exceptions: w.exceptions ? [w.exceptions] : undefined }));

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
        skills: skills.length ? skills : undefined,
        languages: languages.length ? languages : undefined,
        allSavesNote: allSavesNote.trim() || undefined,
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
          <span className={styles.wizardTitle}>{isEditing ? `Edit: ${editCreature!.name}` : 'New Custom Creature'}</span>
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
        <div className={styles.statRow}>
          <span className={styles.statLabel} style={{ width: 'auto', marginRight: 6 }}>All Saves Note</span>
          <input
            className={styles.attackNameInput}
            value={allSavesNote}
            onChange={e => setAllSavesNote(e.target.value)}
            placeholder="e.g. +1 status bonus to all saves vs. magic"
          />
        </div>

        {/* Perception */}
        <div className={styles.sectionHead}>Perception</div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Perc</span>
          <div className={styles.tierBtns}>
            {SAVE_TIERS.map(t => (
              <button key={t} title={t}
                className={`${styles.tierBtn} ${perceptionTier === t ? styles.tierBtnActive : ''}`}
                onClick={() => { setPerceptionTier(t); setPerception(lookupPerception(level, t)); }}
              >{TIER_ABBREV[t]}</button>
            ))}
          </div>
          <input className={styles.statInput} type="number" min={-10} max={80}
            value={perception} onChange={e => setPerception(Number(e.target.value))} />
        </div>

        {/* Skills */}
        <div className={styles.sectionHead}>
          Skills
          <button className={styles.addBtn} onClick={() => setSkills(prev => [...prev, { name: '', mod: lookupSave(level, 'moderate') }])}>+ Add Skill</button>
        </div>
        {skills.map((sk, i) => (
          <div key={i} className={styles.statRow}>
            <div className={styles.attackTraitInputWrap} style={{ flex: 1 }}>
              <input
                className={styles.attackNameInput}
                value={sk.name}
                placeholder="Skill name…"
                onChange={e => setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                onFocus={() => { setFocusedSkillInput(true); setFocusedSkillIdx(i); }}
                onBlur={() => { setFocusedSkillInput(false); setFocusedSkillIdx(null); }}
              />
              {focusedSkillInput && focusedSkillIdx === i && sk.name.length > 0 && (() => {
                const q = sk.name.toLowerCase();
                const sugg = OFFICIAL_SKILLS.filter(s => s.toLowerCase().includes(q) && s.toLowerCase() !== sk.name.toLowerCase()).slice(0, 8);
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
                  className={styles.tierBtn}
                  onClick={() => setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, mod: lookupSave(level, t) } : s))}
                >{TIER_ABBREV[t]}</button>
              ))}
            </div>
            <input className={styles.statInput} type="number" min={-10} max={80}
              value={sk.mod}
              onChange={e => setSkills(prev => prev.map((s, idx) => idx === i ? { ...s, mod: Number(e.target.value) } : s))} />
            <button className={styles.removeBtn} onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))}>×</button>
          </div>
        ))}

        {/* Languages */}
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
              }}
              placeholder="Add language… (Enter to add)"
            />
            {focusedLangInput && langInput.length > 0 && (() => {
              const q = langInput.toLowerCase();
              const sugg = LANGUAGE_SUGGESTIONS.filter(l => l.toLowerCase().includes(q) && !languages.includes(l)).slice(0, 8);
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

        {/* Senses */}
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
              }}
            />
            {focusedSenseInput && senseNameInput.length > 0 && (() => {
              const q = senseNameInput.toLowerCase();
              const sugg = COMMON_SENSES.filter(s => s.includes(q) && !senses.some(x => x.name === s));
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

        {/* Ability Modifiers */}
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
                    onClick={() => (setTier as (t: AbilityTier) => void)(t)}
                  >{TIER_ABBREV[t]}</button>
                );
              })}
            </div>
            <input className={styles.statInput} type="number" min={-5} max={20}
              value={val} onChange={e => (setVal as (n: number) => void)(Number(e.target.value))} />
          </div>
        ))}

        {/* Speed */}
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
              }}
              placeholder="Add immunity… (Enter to add)"
            />
            {immunityInput.length > 0 && (() => {
              const q = immunityInput.toLowerCase();
              const sugg = DAMAGE_TYPES.filter(d => d.includes(q) && !immunities.some(i => i.type === d)).slice(0, 8);
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
        {abilities.map((ab, i) => {
          const editorTab = abilityEditorTabs[i] ?? (ab.description ? 'preview' : 'edit');
          const setEditorTab = (tab: 'edit' | 'preview') => setAbilityEditorTabs(prev => ({ ...prev, [i]: tab }));

          function insertAtCursor(text: string) {
            const ta = abilityTextareaRefs.current[i];
            if (!ta) return;
            const start = ta.selectionStart ?? 0;
            const end = ta.selectionEnd ?? 0;
            const before = ab.description.slice(0, start);
            const after = ab.description.slice(end);
            const newVal = before + text + after;
            setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, description: newVal } : a));
            setTimeout(() => {
              ta.focus();
              ta.setSelectionRange(start + text.length, start + text.length);
            }, 0);
          }

          function wrapSelection(open: string, close: string) {
            const ta = abilityTextareaRefs.current[i];
            if (!ta) return;
            const start = ta.selectionStart ?? 0;
            const end = ta.selectionEnd ?? 0;
            const selected = ab.description.slice(start, end);
            const newVal = ab.description.slice(0, start) + open + selected + close + ab.description.slice(end);
            setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, description: newVal } : a));
            setTimeout(() => {
              ta.focus();
              ta.setSelectionRange(start + open.length, start + open.length + selected.length);
            }, 0);
          }

          return (
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
              {/* Frequency — always visible */}
              <input
                className={styles.attackNameInput}
                value={ab.frequency ?? ''}
                onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, frequency: e.target.value } : a))}
                placeholder="Frequency (e.g. Once per day)"
              />
              {/* Trigger — only for reaction/free */}
              {(ab.actionType === 'reaction' || ab.actionType === 'free') && (
                <input
                  className={styles.attackNameInput}
                  value={ab.trigger ?? ''}
                  onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, trigger: e.target.value } : a))}
                  placeholder="Trigger (e.g. A creature enters your reach)"
                />
              )}
              {/* Requirements — always visible */}
              <input
                className={styles.attackNameInput}
                value={ab.requirements ?? ''}
                onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, requirements: e.target.value } : a))}
                placeholder="Requirements (e.g. You are holding a weapon)"
              />
              {/* Edit/Preview tab strip */}
              <div className={styles.abilityEditorTabs}>
                <button
                  className={`${styles.abilityEditorTab} ${editorTab === 'edit' ? styles.abilityEditorTabActive : ''}`}
                  onClick={() => setEditorTab('edit')}
                >Edit</button>
                <button
                  className={`${styles.abilityEditorTab} ${editorTab === 'preview' ? styles.abilityEditorTabActive : ''}`}
                  onClick={() => setEditorTab('preview')}
                >Preview</button>
              </div>
              {editorTab === 'edit' && (
                <>
                  <div className={styles.abilityToolbar}>
                    {[
                      { label: '◆',       text: ' ◆ ' },
                      { label: '◆◆',      text: ' ◆◆ ' },
                      { label: '◆◆◆',     text: ' ◆◆◆ ' },
                      { label: '↺',        text: ' ↺ ' },
                    ].map(btn => (
                      <button key={btn.label} className={styles.abilityToolbarBtn} title={btn.text.trim()} onMouseDown={e => { e.preventDefault(); insertAtCursor(btn.text); }}>{btn.label}</button>
                    ))}
                    <button className={styles.abilityToolbarBtn} title="Insert @Damage macro" onMouseDown={e => { e.preventDefault(); insertAtCursor('@Damage[XdY[type]]{XdY type damage}'); }}>@Dmg</button>
                    <button className={styles.abilityToolbarBtn} title="Insert @Check macro" onMouseDown={e => { e.preventDefault(); insertAtCursor('@Check[will|dc:15|basic]{DC 15 Will save}'); }}>DC</button>
                    <button className={styles.abilityToolbarBtn} title="Wrap in <p>" onMouseDown={e => { e.preventDefault(); wrapSelection('<p>', '</p>'); }}>&lt;p&gt;</button>
                    <button className={styles.abilityToolbarBtn} title="Insert <hr />" onMouseDown={e => { e.preventDefault(); insertAtCursor('<hr />'); }}>&lt;hr&gt;</button>
                    <button className={styles.abilityToolbarBtn} title="Wrap in <strong>" onMouseDown={e => { e.preventDefault(); wrapSelection('<strong>', '</strong>'); }}><b>B</b></button>
                  </div>
                  <textarea
                    ref={el => { abilityTextareaRefs.current[i] = el; }}
                    className={styles.descInput}
                    value={ab.description}
                    onChange={e => setAbilities(prev => prev.map((a, idx) => idx === i ? { ...a, description: e.target.value } : a))}
                    placeholder="Description (raw HTML or plain text)…"
                    rows={3}
                  />
                </>
              )}
              {editorTab === 'preview' && (
                <div
                  className={styles.abilityPreview}
                  dangerouslySetInnerHTML={{ __html: ab.description ? processHtml(ab.description) : '<em style="color:var(--text-mute)">No description</em>' }}
                />
              )}
            </div>
          );
        })}
        {/* Spellcasting */}
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
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Creature'}
        </button>
        <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
