import Dexie, { type Table } from 'dexie';
import { resolvePublicationTitle } from '../sync/publicationRegistry';
import { normalizeFamily } from '../utils/pf2eHelpers';
import type {
  CreatureRecord, MetaRecord, TraitDescriptionsRecord, CharacterRecord, EncounterStateRecord,
  AncestryRecord, HeritageRecord, BackgroundRecord, ClassRecord, FeatRecord, PartyRecord,
  PartyMemberRecord,
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
  parties!: Table<PartyRecord, string>;
  partyMembers!: Table<PartyMemberRecord, string>;

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
    // Version 9: add the `parties` table for the new Party UX (PartyRecord
    // with its own canonical level + ordered memberIds → CharacterRecord.id).
    this.version(9).stores({
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
      parties:           'id, updatedAt',
    });
    // Version 10: add `partyMembers` — lightweight stat-only records for
    // party members, decoupled from CharacterRecord. memberIds on PartyRecord
    // now reference PartyMemberRecord.id instead of CharacterRecord.id.
    this.version(10).stores({
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
      parties:           'id, updatedAt',
      partyMembers:      'id, updatedAt',
    });
    // Version 11: add `family` index to creatures for family-based filtering
    this.version(11).stores({
      creatures:         'id, entityType, nameLower, level, rarity, size, packSource, publication, family, *traits',
      meta:              'key',
      encounterState:    'key',
      characters:        'id, nameLower, level',
      traitDescriptions: 'key',
      ancestries:        'id, nameLower, slug, *traits, rarity',
      heritages:         'id, nameLower, ancestrySlug, isVersatile',
      backgrounds:       'id, nameLower, rarity',
      classes:           'id, nameLower, slug',
      feats:             'id, nameLower, level, category, *traits, rarity, [category+level]',
      parties:           'id, updatedAt',
      partyMembers:      'id, updatedAt',
    });
    // Version 12: backfill the `family` field for existing NPC records that were
    // synced before version 11 added the index (those records have family === undefined).
    // We read `creatureType` directly from the embedded `data` blob — no network
    // call needed — so this migration is instant and transparent to the user.
    this.version(12).stores({
      creatures:         'id, entityType, nameLower, level, rarity, size, packSource, publication, family, *traits',
      meta:              'key',
      encounterState:    'key',
      characters:        'id, nameLower, level',
      traitDescriptions: 'key',
      ancestries:        'id, nameLower, slug, *traits, rarity',
      heritages:         'id, nameLower, ancestrySlug, isVersatile',
      backgrounds:       'id, nameLower, rarity',
      classes:           'id, nameLower, slug',
      feats:             'id, nameLower, level, category, *traits, rarity, [category+level]',
      parties:           'id, updatedAt',
      partyMembers:      'id, updatedAt',
    }).upgrade(tx => tx.table('creatures').toCollection().modify(c => {
      try {
        // Only backfill NPC records that don't already have a family set —
        // idempotent + matches the sync-path gating (NPCs only) in sync.ts.
        if (c.entityType !== 'npc' || c.family != null) return;
        const family = normalizeFamily(c.data?.system?.details?.creatureType);
        if (family) c.family = family;
      } catch (err) {
        // Never let one malformed record abort the whole migration transaction.
        console.warn('[db v12] family backfill skipped for record', c?.id, err);
      }
    }));
    // Version 13: no schema change — clears the char-builder sync metadata so
    // the next sync pulls class-features/ (new prefix added in this version).
    this.version(13).stores({
      creatures:         'id, entityType, nameLower, level, rarity, size, packSource, publication, family, *traits',
      meta:              'key',
      encounterState:    'key',
      characters:        'id, nameLower, level',
      traitDescriptions: 'key',
      ancestries:        'id, nameLower, slug, *traits, rarity',
      heritages:         'id, nameLower, ancestrySlug, isVersatile',
      backgrounds:       'id, nameLower, rarity',
      classes:           'id, nameLower, slug',
      feats:             'id, nameLower, level, category, *traits, rarity, [category+level]',
      parties:           'id, updatedAt',
      partyMembers:      'id, updatedAt',
    }).upgrade(tx => tx.table('meta').delete('char_builder_sync_state'));
    // Version 14: clear classes and feats so the next sync re-populates them
    // with the new subclassTag/subclassLabel fields on ClassRecord and the new
    // otherTags field on FeatRecord (both added in the previous version but not
    // present on already-cached rows).
    this.version(14).stores({
      creatures:         'id, entityType, nameLower, level, rarity, size, packSource, publication, family, *traits',
      meta:              'key',
      encounterState:    'key',
      characters:        'id, nameLower, level',
      traitDescriptions: 'key',
      ancestries:        'id, nameLower, slug, *traits, rarity',
      heritages:         'id, nameLower, ancestrySlug, isVersatile',
      backgrounds:       'id, nameLower, rarity',
      classes:           'id, nameLower, slug',
      feats:             'id, nameLower, level, category, *traits, rarity, [category+level]',
      parties:           'id, updatedAt',
      partyMembers:      'id, updatedAt',
    }).upgrade(async tx => {
      await Promise.all([
        tx.table('classes').clear(),
        tx.table('feats').clear(),
        tx.table('meta').delete('char_builder_sync_state'),
      ]);
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
