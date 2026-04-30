export type Section = 'gm' | 'rules' | 'characters';

export interface EncounterCreature {
  uid: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  init: number;
  custom?: boolean;
}

export interface Encounter {
  id: number;
  name: string;
  creatures: EncounterCreature[];
}
