import Dexie, { type Table } from 'dexie';
import type { CreatureRecord, MetaRecord } from './schema';

class SeneschalDatabase extends Dexie {
  creatures!: Table<CreatureRecord, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('SeneschalGMAssistant');
    this.version(1).stores({
      // Multi-entry index on traits (*traits) enables WHERE traits CONTAINS 'undead'
      creatures: 'id, nameLower, level, rarity, size, packSource, *traits',
      meta: 'key',
    });
  }
}

export const db = new SeneschalDatabase();
