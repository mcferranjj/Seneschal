export type Section = 'gm' | 'rules' | 'characters';

export interface Condition {
  name: string;
  value?: number; // for valued conditions like Frightened 2, Slowed 1
}

export interface CustomAttackDamageType {
  /** Dice expression for this damage component, e.g. "2d6+9" or "1d6" */
  expr: string;
  /** Damage type, e.g. "slashing", "fire", "persistent fire" */
  type: string;
}

export interface CustomAttack {
  name: string;
  type: 'melee' | 'ranged';
  bonus: number;
  /**
   * Legacy plain-text damage string (e.g. "2d6+9 slashing plus 1d6 fire").
   * Kept for backwards-compat and as the canonical display/storage string.
   * When damageTypes is present it is derived from that; otherwise it is
   * used directly.
   */
  damage: string;
  range?: number; // feet, ranged only
  traits?: string[];
  /**
   * Structured damage breakdown. Each entry is one damage component.
   * The first entry is the primary roll (carries elite/weak modifier);
   * subsequent entries are "plus" components.
   */
  damageTypes?: CustomAttackDamageType[];
  /**
   * Named monster abilities listed after the damage entry,
   * e.g. ["Grab", "Push"] → rendered as "plus Grab plus Push" in the stat block.
   */
  strikeAbilities?: string[];
}

export type AbilityActionType = 'single' | 'two' | 'three' | 'reaction' | 'free' | 'passive';

export interface CustomAbility {
  name: string;
  description: string;
  actionType?: AbilityActionType;
  /** Whether this ability is limited-use (affects area damage tier and frequency visibility) */
  isLimitedUse?: boolean;
  frequency?: string;
  trigger?: string;
  requirements?: string;
  /**
   * If set, this ability was inserted from the generic ability glossary.
   * The value is the canonical glossary name (may differ from `name` if the
   * user renames it). Used to look up the full glossary description for the
   * popup in the statblock view.
   */
  genericAbilityName?: string;
}

export interface CustomSkill {
  name: string;
  mod: number;
}

export type SpellTradition = 'arcane' | 'divine' | 'occult' | 'primal';
export type SpellcastingType = 'prepared' | 'spontaneous' | 'innate';
export type SpellFrequency = 'at-will' | 'cantrip' | '1/day' | '2/day' | '3/day' | 'focus' | 'constant';

export interface CustomSpell {
  name: string;
  actionCost?: AbilityActionType;
  description: string;
  rank?: number;
  frequency?: SpellFrequency;
  traits?: string[];
}

export interface CustomSpellcastingEntry {
  id: string;
  name: string;
  tradition: SpellTradition;
  type: SpellcastingType;
  dc: number;
  attackMod: number;
  focusPoints?: number;
  spells: CustomSpell[];
}

export type SpeedType = 'land' | 'climb' | 'swim' | 'burrow' | 'fly';

export interface CustomSpeed {
  type: SpeedType;
  value: number;
}

export interface CustomSense {
  name: string;
  range?: number; // feet; undefined = unlimited
}

export interface CustomImmunity {
  type: string;
}

export interface CustomResistance {
  type: string;
  value: number;
  exceptions?: string;
}

export interface EncounterCreature {
  uid: string;
  creatureId?: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  fort?: number;
  ref?: number;
  will?: number;
  strMod?: number;
  dexMod?: number;
  attacks?: CustomAttack[];
  abilities?: CustomAbility[];
  traits?: string[]; // creature type traits for recall knowledge
  rarity?: string;  // for recall knowledge DC adjustment
  init: number;
  conditions: Condition[];
  custom?: boolean;
  isEnemy?: boolean; // false = ally/neutral placeholder; doesn't count toward XP budget
  eliteWeak?: 'elite' | 'weak'; // Elite/Weak adjustment (Monster Core pg. 6-7)
  scaledLevel?: number; // Custom level scaling; undefined = no scaling
  baseMaxHp?: number; // Raw max HP before elite/weak adjustment; undefined = use maxHp
  notes?: string; // GM notes for this encounter instance
  perception?: number; // Perception modifier (creatures) — used for initiative rolls
  stealthMod?: number; // Stealth modifier (hazards) — used for initiative rolls
  isHazard?: boolean; // True for hazard entity types
}

export interface Encounter {
  id: number;
  name: string;
  creatures: EncounterCreature[];
  activePartyId?: string | null;
}
