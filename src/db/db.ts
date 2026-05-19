import Dexie, { type Table } from 'dexie';
import { resolvePublicationTitle } from '../sync/publicationRegistry';
import type {
  CreatureRecord, MetaRecord, TraitDescriptionsRecord, CharacterRecord, EncounterStateRecord,
  AncestryRecord, HeritageRecord, BackgroundRecord, ClassRecord, FeatRecord,
} from './schema';

// Re-export so existing callers that import from db.ts continue to work
export type { CharacterRecord, EncounterStateRecord };

class SeneschalDatabase extends Dexie {
  creatures!: Table<CreatureRecord, string>;
  meta!: Table<MetaRecord, string>;
  encounterState!: Table<EncounterStateRecord, string>;
  characters!: Table<CharacterRecord, string>;
  traitDescriptions!: Table<TraitDescriptionsRecord, string>;
  ancestries!: Table<AncestryRecord, string>;
  heritages!: Table<HeritageRecord, string>;
  backgrounds!: Table<BackgroundRecord, string>;
  classes!: Table<ClassRecord, string>;
  feats!: Table<FeatRecord, string>;

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
    this.version(6).stores({
      creatures: 'id, entityType, nameLower, level, rarity, size, packSource, publication, *traits',
      meta: 'key',
      encounterState: 'key',
      characters: 'id',
      traitDescriptions: 'key',
    });
    // Version 7: re-run publication backfill using resolvePublicationTitle so that
    // legacy entries without a publication.title get a proper canonical title
    // instead of falling back to the raw pack folder name.
    this.version(7).stores({
      creatures: 'id, entityType, nameLower, level, rarity, size, packSource, publication, *traits',
      meta: 'key',
      encounterState: 'key',
      characters: 'id',
      traitDescriptions: 'key',
    }).upgrade(tx => tx.table('creatures').toCollection().modify(c => {
      c.publication = resolvePublicationTitle(
        c.data?.system?.details?.publication?.title,
        c.packSource,
      );
    }));
    // Version 8: add character builder reference tables and update characters index.
    // Clears old incompatible character records (old schema used flat string fields).
    this.version(8).stores({
      creatures:         'id, entityType, nameLower, level, rarity, size, packSource, publication, *traits',
      meta:              'key',
      encounterState:    'key',
      characters:        'id, nameLower, level',
      traitDescriptions: 'key',
      ancestries:        'id, nameLower, slug, *traits, rarity',
      heritages:         'id, nameLower, ancestrySlug, isVersatile',
      backgrounds:       'id, nameLower, rarity',
      classes:           'id, nameLower, slug',
      feats:             'id, nameLower, level, category, *traits, rarity, [category+level]',
    }).upgrade(tx => {
      // Clear old character records — the CharacterRecord schema changed from a flat
      // string-based shape (ancestry: string, class: string) to a rich structured shape
      // with nested refs, boost choices, and skills. The old shape is incompatible and
      // cannot be migrated automatically.
      return tx.table('characters').clear();
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
