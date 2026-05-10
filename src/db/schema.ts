import type { PF2ECreature } from '../types/pf2e';
import type { CustomAttack, CustomAbility, CustomSpeed, CustomSense, CustomImmunity, CustomResistance, CustomSpellcastingEntry, CustomSkill, Encounter } from '../types/encounter';

export interface CreatureRecord {
  id: string;
  entityType: string; // 'npc' | 'hazard'
  name: string;
  nameLower: string;
  level: number;
  traits: string[];
  size: string;
  rarity: string;
  packSource: string;
  blobSha: string;
  data: PF2ECreature;
  customData?: {
    attacks?: CustomAttack[];
    abilities?: CustomAbility[];
    flavorText?: string;
    speeds?: CustomSpeed[];
    senses?: CustomSense[];
    immunities?: CustomImmunity[];
    resistances?: CustomResistance[];
    weaknesses?: CustomResistance[];
    spellcasting?: CustomSpellcastingEntry[];
    skills?: CustomSkill[];
    languages?: string[];
    allSavesNote?: string;
  };
}

export interface CharacterRecord {
  id: string;
  name: string;
  playerName: string;
  ancestry: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  fort: number;
  ref: number;
  will: number;
  perception: number;
}

export interface EncounterStateRecord {
  key: string;
  encounters: Encounter[];
  activeEnc: number;
  partySize: number;
  partyLevel: number;
}

export interface MetaRecord {
  key: string;
  commitSha: string;
  lastSynced: number;
  fileShas: Record<string, string>;
}

export interface TraitDescriptionsRecord {
  key: string;           // always 'trait_descriptions'
  commitSha: string;     // the repo commit SHA this was fetched from
  descriptions: Record<string, string>; // trait name (lowercase) → description
}
