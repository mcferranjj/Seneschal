/**
 * PF2E Creature Creation Tables
 *
 * Source: GM Core Remaster Tables 9-2 through 9-12 via 2e.aonprd.com/Rules.aspx?ID=2874
 * HP uses midpoints of the per-level ranges; level 25 is extrapolated.
 *
 * These are pure static data — no logic, no imports.
 */

// ── Tier type aliases ─────────────────────────────────────────────────────────

export type HpTier       = 'low' | 'moderate' | 'high';
export type AcTier       = 'low' | 'moderate' | 'high' | 'extreme';
export type SaveTier     = 'terrible' | 'low' | 'moderate' | 'high' | 'extreme';
export type AbilityTier  = 'terrible' | 'low' | 'moderate' | 'high' | 'extreme';
export type ResWeakTier  = 'low' | 'moderate' | 'high';
export type AreaDamageTier = 'unlimited' | 'limited';

// ── Table 9-2: Hit Points ─────────────────────────────────────────────────────

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

// ── Table 9-3: Armor Class ────────────────────────────────────────────────────

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

// ── Table 9-4: Saving Throws ──────────────────────────────────────────────────

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

// ── Table 9-5: Attack Bonus ───────────────────────────────────────────────────

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

// ── Table 9-6: Strike Damage (single-target) ──────────────────────────────────

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

// ── Table 9-7: Area Damage (multi-target) ─────────────────────────────────────

export const AREA_DAMAGE_TABLE: Record<number, Record<AreaDamageTier, string>> = {
  [-1]: { unlimited: '1d4',   limited: '1d6'  },
  [0]:  { unlimited: '1d6',   limited: '1d10' },
  [1]:  { unlimited: '2d4',   limited: '2d6'  },
  [2]:  { unlimited: '2d6',   limited: '3d6'  },
  [3]:  { unlimited: '2d8',   limited: '4d6'  },
  [4]:  { unlimited: '3d6',   limited: '5d6'  },
  [5]:  { unlimited: '2d10',  limited: '6d6'  },
  [6]:  { unlimited: '4d6',   limited: '7d6'  },
  [7]:  { unlimited: '4d6',   limited: '8d6'  },
  [8]:  { unlimited: '5d6',   limited: '9d6'  },
  [9]:  { unlimited: '5d6',   limited: '10d6' },
  [10]: { unlimited: '6d6',   limited: '11d6' },
  [11]: { unlimited: '6d6',   limited: '12d6' },
  [12]: { unlimited: '5d8',   limited: '13d6' },
  [13]: { unlimited: '7d6',   limited: '14d6' },
  [14]: { unlimited: '4d12',  limited: '15d6' },
  [15]: { unlimited: '6d8',   limited: '16d6' },
  [16]: { unlimited: '8d6',   limited: '17d6' },
  [17]: { unlimited: '8d6',   limited: '18d6' },
  [18]: { unlimited: '9d6',   limited: '19d6' },
  [19]: { unlimited: '7d8',   limited: '20d6' },
  [20]: { unlimited: '6d10',  limited: '21d6' },
  [21]: { unlimited: '10d6',  limited: '22d6' },
  [22]: { unlimited: '8d8',   limited: '23d6' },
  [23]: { unlimited: '11d6',  limited: '24d6' },
  [24]: { unlimited: '11d6',  limited: '25d6' },
  [25]: { unlimited: '12d6',  limited: '26d6' },
};

// ── Table 9-8: Ability Modifiers ──────────────────────────────────────────────
// level -1 and 0 have no extreme in the table; 99 is used as a sentinel (hide tier button)

export const ABILITY_TABLE: Record<number, Record<AbilityTier, number>> = {
  [-1]: { extreme: 99, high: 3,  moderate: 2, low: 0, terrible: -2 },
  [0]:  { extreme: 99, high: 3,  moderate: 2, low: 0, terrible: -2 },
  [1]:  { extreme: 5,  high: 4,  moderate: 3, low: 1, terrible: -2 },
  [2]:  { extreme: 5,  high: 4,  moderate: 3, low: 1, terrible: -2 },
  [3]:  { extreme: 5,  high: 4,  moderate: 3, low: 1, terrible: -2 },
  [4]:  { extreme: 6,  high: 5,  moderate: 3, low: 2, terrible: -2 },
  [5]:  { extreme: 6,  high: 5,  moderate: 4, low: 2, terrible: -2 },
  [6]:  { extreme: 7,  high: 5,  moderate: 4, low: 2, terrible: -2 },
  [7]:  { extreme: 7,  high: 6,  moderate: 4, low: 2, terrible: -2 },
  [8]:  { extreme: 7,  high: 6,  moderate: 4, low: 3, terrible: -2 },
  [9]:  { extreme: 7,  high: 6,  moderate: 4, low: 3, terrible: -2 },
  [10]: { extreme: 8,  high: 7,  moderate: 5, low: 3, terrible: -2 },
  [11]: { extreme: 8,  high: 7,  moderate: 5, low: 3, terrible: -2 },
  [12]: { extreme: 8,  high: 7,  moderate: 5, low: 4, terrible: -2 },
  [13]: { extreme: 9,  high: 8,  moderate: 5, low: 4, terrible: -2 },
  [14]: { extreme: 9,  high: 8,  moderate: 5, low: 4, terrible: -2 },
  [15]: { extreme: 9,  high: 8,  moderate: 6, low: 4, terrible: -2 },
  [16]: { extreme: 10, high: 9,  moderate: 6, low: 5, terrible: -2 },
  [17]: { extreme: 10, high: 9,  moderate: 6, low: 5, terrible: -2 },
  [18]: { extreme: 10, high: 9,  moderate: 6, low: 5, terrible: -2 },
  [19]: { extreme: 11, high: 10, moderate: 6, low: 5, terrible: -2 },
  [20]: { extreme: 11, high: 10, moderate: 7, low: 6, terrible: -2 },
  [21]: { extreme: 11, high: 10, moderate: 7, low: 6, terrible: -2 },
  [22]: { extreme: 11, high: 10, moderate: 8, low: 6, terrible: -2 },
  [23]: { extreme: 11, high: 10, moderate: 8, low: 6, terrible: -2 },
  [24]: { extreme: 13, high: 12, moderate: 9, low: 7, terrible: -2 },
  [25]: { extreme: 13, high: 12, moderate: 9, low: 7, terrible: -2 },
};

// ── Table 9-9: Perception ─────────────────────────────────────────────────────

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

// ── Hazard Tier Type Aliases ──────────────────────────────────────────────────

export type HazardDCTier      = 'low' | 'high' | 'extreme';
export type HazardDefenseTier = 'low' | 'high' | 'extreme';
export type HazardSaveDCTier  = 'high' | 'extreme';
export type HazardAttackTier  = 'simple' | 'complex';

// ── Table 2-13: Hazard Stealth / Disable DCs ─────────────────────────────────
// Columns: extreme, high, low (Stealth/Disable DCs)

// Low values are ranges — median (floor) is used: e.g. "12 to 11" → 11, "13 to 12" → 12
export const HAZARD_STEALTH_DISABLE_TABLE: Record<number, Record<HazardDCTier, number>> = {
  [-1]: { extreme: 18, high: 15, low: 11 },
  [0]:  { extreme: 19, high: 16, low: 12 },
  [1]:  { extreme: 20, high: 17, low: 13 },
  [2]:  { extreme: 21, high: 18, low: 14 },
  [3]:  { extreme: 23, high: 20, low: 16 },
  [4]:  { extreme: 25, high: 22, low: 17 },
  [5]:  { extreme: 26, high: 23, low: 19 },
  [6]:  { extreme: 28, high: 25, low: 20 },
  [7]:  { extreme: 30, high: 27, low: 22 },
  [8]:  { extreme: 31, high: 28, low: 23 },
  [9]:  { extreme: 33, high: 30, low: 24 },
  [10]: { extreme: 35, high: 32, low: 26 },
  [11]: { extreme: 36, high: 33, low: 27 },
  [12]: { extreme: 38, high: 35, low: 28 },
  [13]: { extreme: 40, high: 37, low: 30 },
  [14]: { extreme: 41, high: 38, low: 31 },
  [15]: { extreme: 43, high: 40, low: 33 },
  [16]: { extreme: 45, high: 42, low: 34 },
  [17]: { extreme: 46, high: 43, low: 36 },
  [18]: { extreme: 48, high: 45, low: 37 },
  [19]: { extreme: 50, high: 47, low: 39 },
  [20]: { extreme: 51, high: 48, low: 40 },
  [21]: { extreme: 53, high: 50, low: 41 },
  [22]: { extreme: 55, high: 52, low: 43 },
  [23]: { extreme: 56, high: 53, low: 44 },
  [24]: { extreme: 58, high: 55, low: 45 },
};

// ── Table 2-15: Hazard Defenses ───────────────────────────────────────────────
// Per level: AC (extreme/high/low), Save (extreme/high/low), Hardness, HP midpoint

export interface HazardDefenseRow {
  ac:       Record<HazardDefenseTier, number>;
  save:     Record<HazardDefenseTier, number>;
  hardness: number;       // typical hardness value
  hp:       number;       // midpoint of the HP range
}

// AC uses EAC/HAC/LAC; Save uses E Save/H Save/L Save.
// Hardness and HP are ranges — median (floor) used: e.g. "2–4" → 3, "11–13" → 12.
export const HAZARD_DEFENSE_TABLE: Record<number, HazardDefenseRow> = {
  [-1]: { ac: { extreme: 18, high: 15, low: 12 }, save: { extreme: 9,  high: 8,  low: 2  }, hardness: 3,  hp: 12  },
  [0]:  { ac: { extreme: 19, high: 16, low: 13 }, save: { extreme: 10, high: 9,  low: 3  }, hardness: 4,  hp: 16  },
  [1]:  { ac: { extreme: 19, high: 16, low: 13 }, save: { extreme: 11, high: 10, low: 4  }, hardness: 6,  hp: 24  },
  [2]:  { ac: { extreme: 21, high: 18, low: 15 }, save: { extreme: 12, high: 11, low: 5  }, hardness: 8,  hp: 32  },
  [3]:  { ac: { extreme: 22, high: 19, low: 16 }, save: { extreme: 14, high: 12, low: 6  }, hardness: 11, hp: 44  },
  [4]:  { ac: { extreme: 24, high: 21, low: 18 }, save: { extreme: 15, high: 14, low: 8  }, hardness: 12, hp: 48  },
  [5]:  { ac: { extreme: 25, high: 22, low: 19 }, save: { extreme: 17, high: 15, low: 9  }, hardness: 13, hp: 52  },
  [6]:  { ac: { extreme: 27, high: 24, low: 21 }, save: { extreme: 18, high: 17, low: 11 }, hardness: 14, hp: 56  },
  [7]:  { ac: { extreme: 28, high: 25, low: 22 }, save: { extreme: 20, high: 18, low: 12 }, hardness: 15, hp: 60  },
  [8]:  { ac: { extreme: 30, high: 27, low: 24 }, save: { extreme: 21, high: 19, low: 13 }, hardness: 16, hp: 64  },
  [9]:  { ac: { extreme: 31, high: 28, low: 25 }, save: { extreme: 23, high: 21, low: 15 }, hardness: 17, hp: 68  },
  [10]: { ac: { extreme: 33, high: 30, low: 27 }, save: { extreme: 24, high: 22, low: 16 }, hardness: 18, hp: 72  },
  [11]: { ac: { extreme: 34, high: 31, low: 28 }, save: { extreme: 26, high: 24, low: 18 }, hardness: 20, hp: 80  },
  [12]: { ac: { extreme: 36, high: 33, low: 30 }, save: { extreme: 27, high: 25, low: 19 }, hardness: 21, hp: 84  },
  [13]: { ac: { extreme: 37, high: 34, low: 31 }, save: { extreme: 29, high: 26, low: 20 }, hardness: 22, hp: 88  },
  [14]: { ac: { extreme: 39, high: 36, low: 33 }, save: { extreme: 30, high: 28, low: 22 }, hardness: 23, hp: 92  },
  [15]: { ac: { extreme: 40, high: 37, low: 34 }, save: { extreme: 32, high: 29, low: 23 }, hardness: 24, hp: 96  },
  [16]: { ac: { extreme: 42, high: 39, low: 36 }, save: { extreme: 33, high: 30, low: 25 }, hardness: 26, hp: 104 },
  [17]: { ac: { extreme: 43, high: 40, low: 37 }, save: { extreme: 35, high: 32, low: 26 }, hardness: 28, hp: 112 },
  [18]: { ac: { extreme: 45, high: 42, low: 39 }, save: { extreme: 36, high: 33, low: 27 }, hardness: 30, hp: 120 },
  [19]: { ac: { extreme: 46, high: 43, low: 40 }, save: { extreme: 38, high: 35, low: 29 }, hardness: 32, hp: 128 },
  [20]: { ac: { extreme: 48, high: 45, low: 42 }, save: { extreme: 39, high: 36, low: 30 }, hardness: 34, hp: 136 },
  [21]: { ac: { extreme: 49, high: 46, low: 43 }, save: { extreme: 41, high: 38, low: 32 }, hardness: 37, hp: 148 },
  [22]: { ac: { extreme: 51, high: 48, low: 45 }, save: { extreme: 43, high: 39, low: 33 }, hardness: 40, hp: 160 },
  [23]: { ac: { extreme: 52, high: 49, low: 46 }, save: { extreme: 44, high: 40, low: 34 }, hardness: 45, hp: 172 },
  [24]: { ac: { extreme: 54, high: 51, low: 48 }, save: { extreme: 46, high: 42, low: 36 }, hardness: 48, hp: 184 },
};

// ── Table 2-16: Hazard Offense ────────────────────────────────────────────────
// Simple/Complex attack bonuses, damage strings, and DCs

export interface HazardOffenseRow {
  simpleAtk: number;
  complexAtk: number;
  simpleDmg: string;
  complexDmg: string;
  extremeDC: number;
  hardDC: number;
}

// S. Atk is the Simple attack bonus; C. Atk is the Complex attack bonus.
// Simple Dmg deals less; Complex Dmg deals more (the parenthetical is the median used here).
// EDC = Extreme DC; HDC = Hard DC.
export const HAZARD_OFFENSE_TABLE: Record<number, HazardOffenseRow> = {
  [-1]: { simpleAtk: 10, complexAtk: 8,  simpleDmg: '2d4+1',    complexDmg: '1d4+1',    extremeDC: 19, hardDC: 16 },
  [0]:  { simpleAtk: 11, complexAtk: 8,  simpleDmg: '2d6+3',    complexDmg: '1d6+2',    extremeDC: 19, hardDC: 16 },
  [1]:  { simpleAtk: 13, complexAtk: 9,  simpleDmg: '2d6+5',    complexDmg: '1d6+3',    extremeDC: 20, hardDC: 17 },
  [2]:  { simpleAtk: 14, complexAtk: 11, simpleDmg: '2d10+7',   complexDmg: '1d10+4',   extremeDC: 22, hardDC: 18 },
  [3]:  { simpleAtk: 16, complexAtk: 12, simpleDmg: '2d10+13',  complexDmg: '1d10+6',   extremeDC: 23, hardDC: 20 },
  [4]:  { simpleAtk: 17, complexAtk: 14, simpleDmg: '4d8+10',   complexDmg: '2d8+5',    extremeDC: 25, hardDC: 21 },
  [5]:  { simpleAtk: 19, complexAtk: 15, simpleDmg: '4d8+14',   complexDmg: '2d8+7',    extremeDC: 26, hardDC: 22 },
  [6]:  { simpleAtk: 20, complexAtk: 17, simpleDmg: '4d8+18',   complexDmg: '2d8+9',    extremeDC: 27, hardDC: 24 },
  [7]:  { simpleAtk: 22, complexAtk: 18, simpleDmg: '4d10+18',  complexDmg: '2d10+9',   extremeDC: 29, hardDC: 25 },
  [8]:  { simpleAtk: 23, complexAtk: 20, simpleDmg: '4d10+22',  complexDmg: '2d10+11',  extremeDC: 30, hardDC: 26 },
  [9]:  { simpleAtk: 25, complexAtk: 21, simpleDmg: '4d10+26',  complexDmg: '2d10+13',  extremeDC: 32, hardDC: 28 },
  [10]: { simpleAtk: 26, complexAtk: 23, simpleDmg: '4d12+26',  complexDmg: '2d12+13',  extremeDC: 33, hardDC: 29 },
  [11]: { simpleAtk: 28, complexAtk: 24, simpleDmg: '4d12+30',  complexDmg: '2d12+15',  extremeDC: 34, hardDC: 30 },
  [12]: { simpleAtk: 29, complexAtk: 26, simpleDmg: '6d10+27',  complexDmg: '3d10+14',  extremeDC: 36, hardDC: 32 },
  [13]: { simpleAtk: 31, complexAtk: 27, simpleDmg: '6d10+31',  complexDmg: '3d10+16',  extremeDC: 37, hardDC: 33 },
  [14]: { simpleAtk: 32, complexAtk: 29, simpleDmg: '6d10+35',  complexDmg: '3d10+18',  extremeDC: 39, hardDC: 34 },
  [15]: { simpleAtk: 34, complexAtk: 30, simpleDmg: '6d12+33',  complexDmg: '3d12+17',  extremeDC: 40, hardDC: 36 },
  [16]: { simpleAtk: 35, complexAtk: 32, simpleDmg: '6d12+35',  complexDmg: '3d12+18',  extremeDC: 41, hardDC: 37 },
  [17]: { simpleAtk: 37, complexAtk: 33, simpleDmg: '6d12+37',  complexDmg: '3d12+19',  extremeDC: 43, hardDC: 38 },
  [18]: { simpleAtk: 38, complexAtk: 35, simpleDmg: '6d12+41',  complexDmg: '3d12+20',  extremeDC: 44, hardDC: 40 },
  [19]: { simpleAtk: 40, complexAtk: 36, simpleDmg: '8d10+40',  complexDmg: '4d10+20',  extremeDC: 46, hardDC: 41 },
  [20]: { simpleAtk: 41, complexAtk: 38, simpleDmg: '8d10+44',  complexDmg: '4d10+22',  extremeDC: 47, hardDC: 42 },
  [21]: { simpleAtk: 43, complexAtk: 39, simpleDmg: '8d10+48',  complexDmg: '4d10+24',  extremeDC: 48, hardDC: 44 },
  [22]: { simpleAtk: 44, complexAtk: 41, simpleDmg: '8d10+52',  complexDmg: '4d10+26',  extremeDC: 50, hardDC: 45 },
  [23]: { simpleAtk: 46, complexAtk: 42, simpleDmg: '8d12+48',  complexDmg: '4d12+24',  extremeDC: 51, hardDC: 46 },
  [24]: { simpleAtk: 47, complexAtk: 44, simpleDmg: '8d12+52',  complexDmg: '4d12+26',  extremeDC: 52, hardDC: 48 },
};

// ── Table 9-10: Resistance / Weakness ────────────────────────────────────────

export const RES_WEAK_TABLE: Record<number, Record<ResWeakTier, number>> = {
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
