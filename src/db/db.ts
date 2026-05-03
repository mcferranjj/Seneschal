import Dexie, { type Table } from 'dexie';
import type { CreatureRecord, MetaRecord, TraitDescriptionsRecord } from './schema';
import type { Encounter } from '../types/encounter';

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

class SeneschalDatabase extends Dexie {
  creatures!: Table<CreatureRecord, string>;
  meta!: Table<MetaRecord, string>;
  encounterState!: Table<EncounterStateRecord, string>;
  characters!: Table<CharacterRecord, string>;
  traitDescriptions!: Table<TraitDescriptionsRecord, string>;

  constructor() {
    super('SeneschalGMAssistant');
    this.version(1).stores({
      creatures: 'id, nameLower, level, rarity, size, packSource, *traits',
      meta: 'key',
    });
    this.version(2).stores({
      creatures: 'id, nameLower, level, rarity, size, packSource, *traits',
      meta: 'key',
      encounterState: 'key',
    });
    this.version(3).stores({
      creatures: 'id, entityType, nameLower, level, rarity, size, packSource, *traits',
      meta: 'key',
      encounterState: 'key',
    }).upgrade(tx => tx.table('creatures').toCollection().modify(c => {
      if (!c.entityType) c.entityType = 'npc';
    }));
    this.version(4).stores({
      creatures: 'id, entityType, nameLower, level, rarity, size, packSource, *traits',
      meta: 'key',
      encounterState: 'key',
      characters: 'id',
    });
    this.version(5).stores({
      creatures: 'id, entityType, nameLower, level, rarity, size, packSource, *traits',
      meta: 'key',
      encounterState: 'key',
      characters: 'id',
      traitDescriptions: 'key',
    });
  }
}

export const db = new SeneschalDatabase();

export const ENCOUNTER_STATE_KEY = 'encounter_state';

export async function loadEncounterState(): Promise<Omit<EncounterStateRecord, 'key'> | null> {
  const rec = await db.encounterState.get(ENCOUNTER_STATE_KEY);
  return rec ?? null;
}

export async function saveEncounterState(state: Omit<EncounterStateRecord, 'key'>): Promise<void> {
  await db.encounterState.put({ key: ENCOUNTER_STATE_KEY, ...state });
}
