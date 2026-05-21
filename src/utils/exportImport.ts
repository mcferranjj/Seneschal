import type {
  CreatureRecord,
  CharacterRecord,
  PartyRecord,
  PartyMemberRecord,
} from '../db/schema';
import type { Encounter } from '../types/encounter';
import { db, loadEncounterState, saveEncounterState } from '../db/db';

export interface ExportFile {
  format: 'seneschal-export';
  version: number;
  exportedAt: string;
  kind: 'full' | 'encounter' | 'customCreature';
  contents: {
    customCreatures?: CreatureRecord[];
    encounters?: Encounter[];
    characters?: CharacterRecord[];
    parties?: PartyRecord[];
    partyMembers?: PartyMemberRecord[];
  };
}

export interface ImportReport {
  imported: Record<string, number>;
  skipped: Record<string, number>;
  warnings: string[];
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Shared wrapper builder so all three exporters stay in sync on format/version. */
function makeExportFile(
  kind: ExportFile['kind'],
  contents: ExportFile['contents'],
): ExportFile {
  return {
    format: 'seneschal-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    kind,
    contents,
  };
}

/**
 * Sanitize a user-typed name for use as a download filename segment.
 * Strips path separators, leading dots, and caps length so a creature
 * named "../../etc/passwd" can't escape the download directory.
 */
export function sanitizeFilenameSegment(raw: string, maxLength = 60): string {
  const cleaned = raw.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const trimmed = cleaned.replace(/^[-.]+/, '').replace(/-+/g, '-');
  const truncated = trimmed.slice(0, maxLength);
  return truncated || 'untitled';
}

/**
 * Build a full database export including all custom creatures, encounters,
 * characters, parties, and party members.
 */
export async function buildFullExport(): Promise<ExportFile> {
  const customCreatures = await db.creatures
    .where('packSource')
    .equals('custom')
    .toArray();

  const encounterState = await loadEncounterState();
  const encounters = encounterState?.encounters ?? [];

  const characters = await db.characters.toArray();
  const parties = await db.parties.toArray();
  const partyMembers = await db.partyMembers.toArray();

  return makeExportFile('full', {
    customCreatures,
    encounters,
    characters,
    parties,
    partyMembers,
  });
}

/**
 * Build an encounter export that includes the encounter and all its referenced
 * custom creatures (bundled dependencies).
 *
 * Encounter ids are numeric (see `Encounter.id` in src/types/encounter.ts).
 */
export async function buildEncounterExport(encounterId: number): Promise<ExportFile> {
  const encounterState = await loadEncounterState();
  if (!encounterState) {
    throw new ImportError('No encounter state found');
  }

  const encounter = encounterState.encounters.find((e) => e.id === encounterId);
  if (!encounter) {
    throw new ImportError(`Encounter with id ${encounterId} not found`);
  }

  // Collect unique custom creature IDs referenced by this encounter.
  // EncounterCreature.creatureId is the FK into db.creatures.
  const customCreatureIds = new Set<string>();
  for (const creature of encounter.creatures) {
    if (creature.creatureId) {
      const creatureRecord = await db.creatures.get(creature.creatureId);
      if (creatureRecord && creatureRecord.packSource === 'custom') {
        customCreatureIds.add(creature.creatureId);
      }
    }
  }

  // Fetch all referenced custom creatures
  const customCreatures = await Promise.all(
    Array.from(customCreatureIds).map((id) => db.creatures.get(id))
  );

  return makeExportFile('encounter', {
    customCreatures: customCreatures.filter((c) => c !== undefined),
    encounters: [encounter],
  });
}

/**
 * Build a custom creature export from a list of creature IDs.
 */
export async function buildCustomCreatureExport(creatureIds: string[]): Promise<ExportFile> {
  const customCreatures = await Promise.all(
    creatureIds.map((id) => db.creatures.get(id))
  );

  return makeExportFile('customCreature', {
    customCreatures: customCreatures.filter((c) => c !== undefined),
  });
}

/**
 * Trigger a browser download of a JSON file.
 */
export function downloadJson(filename: string, data: unknown): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an export file from JSON text.
 * Throws ImportError if validation fails.
 */
export function parseExportFile(text: string): ExportFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new ImportError("This file isn't a valid JSON file.");
  }

  if (typeof data !== 'object' || data === null) {
    throw new ImportError("This file isn't a Seneschal backup.");
  }

  const file = data as Record<string, unknown>;

  if (file.format !== 'seneschal-export') {
    throw new ImportError("This file isn't a Seneschal backup.");
  }

  if (typeof file.version !== 'number') {
    throw new ImportError("This file isn't a Seneschal backup.");
  }

  if (file.version > 1) {
    throw new ImportError(
      'Created by a newer version of Seneschal, please update the app.'
    );
  }

  return data as ExportFile;
}

/**
 * Import an export file using skip-on-collision strategy.
 * Checks id existence; if present, skips; if absent, puts the record.
 * For encounters, appends non-colliding ones to the existing encounter state.
 */
export async function importExportFile(file: ExportFile): Promise<ImportReport> {
  const report: ImportReport = {
    imported: {},
    skipped: {},
    warnings: [],
  };

  const { contents } = file;

  // Import custom creatures
  if (contents.customCreatures && contents.customCreatures.length > 0) {
    for (const creature of contents.customCreatures) {
      const existing = await db.creatures.get(creature.id);
      if (existing) {
        report.skipped['customCreatures'] = (report.skipped['customCreatures'] ?? 0) + 1;
      } else {
        await db.creatures.put(creature);
        report.imported['customCreatures'] = (report.imported['customCreatures'] ?? 0) + 1;
      }
    }
  }

  // Import characters
  if (contents.characters && contents.characters.length > 0) {
    for (const character of contents.characters) {
      const existing = await db.characters.get(character.id);
      if (existing) {
        report.skipped['characters'] = (report.skipped['characters'] ?? 0) + 1;
      } else {
        await db.characters.put(character);
        report.imported['characters'] = (report.imported['characters'] ?? 0) + 1;
      }
    }
  }

  // Import parties / party members (skip-on-collision).
  //
  // Phase 1 caveat: parties reference their members by id. If a partyMember id
  // collides with an existing member that belongs to a DIFFERENT party, we
  // skip the incoming member and the imported party will reference the
  // *existing* (other-party) member. This is wrong but tolerable for Phase 1;
  // a future phase should remap ids on collision instead.
  if (contents.parties && contents.parties.length > 0) {
    for (const party of contents.parties) {
      const existing = await db.parties.get(party.id);
      if (existing) {
        report.skipped['parties'] = (report.skipped['parties'] ?? 0) + 1;
      } else {
        await db.parties.put(party);
        report.imported['parties'] = (report.imported['parties'] ?? 0) + 1;
      }
    }
  }

  // Import party members
  if (contents.partyMembers && contents.partyMembers.length > 0) {
    for (const member of contents.partyMembers) {
      const existing = await db.partyMembers.get(member.id);
      if (existing) {
        report.skipped['partyMembers'] = (report.skipped['partyMembers'] ?? 0) + 1;
      } else {
        await db.partyMembers.put(member);
        report.imported['partyMembers'] = (report.imported['partyMembers'] ?? 0) + 1;
      }
    }
  }

  // Import encounters
  // Encounter ids are local-only sequential integers with no semantic meaning
  // across exports. Always assign fresh ids so a collision on the default
  // id=1 "Encounter 1" never silently drops the user's data.
  if (contents.encounters && contents.encounters.length > 0) {
    const currentState = await loadEncounterState();
    const existingEncounters = currentState?.encounters ?? [];

    // Compute the next available id
    let nextId =
      existingEncounters.length > 0
        ? Math.max(...existingEncounters.map((e) => e.id)) + 1
        : 1;

    // Build a set of existing encounter names for optional name-uniquification
    const existingNames = new Set(existingEncounters.map((e) => e.name));

    const importedEncounters = contents.encounters.map((enc) => {
      let name = enc.name;
      if (existingNames.has(name)) {
        name = `${name} (imported)`;
      }
      // Track the new name so batch imports don't collide with each other either
      existingNames.add(name);
      return { ...enc, id: nextId++, name };
    });

    report.imported['encounters'] = importedEncounters.length;
    report.skipped['encounters'] = 0;

    const merged = [...existingEncounters, ...importedEncounters];
    await saveEncounterState({
      encounters: merged,
      activeEnc: currentState?.activeEnc ?? 0,
      partySize: currentState?.partySize ?? 4,
      partyLevel: currentState?.partyLevel ?? 1,
    });
  }

  return report;
}
