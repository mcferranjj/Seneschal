export type Section = 'gm' | 'rules' | 'characters';

export interface Condition {
  name: string;
  value?: number; // for valued conditions like Frightened 2, Slowed 1
}

export interface CustomAttack {
  name: string;
  type: 'melee' | 'ranged';
  bonus: number;
  damage: string;
  range?: number; // feet, ranged only
  traits?: string[];
}

export type AbilityActionType = 'single' | 'two' | 'three' | 'reaction' | 'free' | 'passive';

export interface CustomAbility {
  name: string;
  description: string;
  actionType?: AbilityActionType;
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
}

export interface Encounter {
  id: number;
  name: string;
  creatures: EncounterCreature[];
}
