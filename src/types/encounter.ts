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
  init: number;
  conditions: Condition[];
  custom?: boolean;
  isEnemy?: boolean; // false = ally/neutral placeholder; doesn't count toward XP budget
}

export interface Encounter {
  id: number;
  name: string;
  creatures: EncounterCreature[];
}
