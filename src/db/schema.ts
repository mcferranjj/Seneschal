import type { PF2ECreature } from '../types/pf2e';
import type { CustomAttack, CustomAbility } from '../types/encounter';

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
  };
}

export interface MetaRecord {
  key: string;
  commitSha: string;
  lastSynced: number;
  fileShas: Record<string, string>;
}
