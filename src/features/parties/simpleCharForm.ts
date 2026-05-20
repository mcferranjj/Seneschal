/**
 * Shared utilities for the simple character form used in the party editor.
 * Extracted from the old PartyPanel so both PartyEditor and any future
 * simple-entry UI can share the same form shape and helpers.
 */

import type { CharacterRecord } from '../../db/schema';

export const PF2E_CLASSES = [
  'Alchemist','Barbarian','Bard','Champion','Cleric','Druid','Fighter',
  'Gunslinger','Inventor','Investigator','Kineticist','Magus','Monk',
  'Oracle','Psychic','Ranger','Rogue','Sorcerer','Summoner','Swashbuckler',
  'Thaumaturge','Witch','Wizard',
];

export const ANCESTRIES = [
  'Dwarf','Elf','Gnome','Goblin','Halfling','Human','Leshy','Orc',
  'Catfolk','Fetchling','Fleshwarp','Gnoll','Grippli','Hobgoblin',
  'Kobold','Lizardfolk','Ratfolk','Shisk','Shoony','Sprite','Strix','Tengu',
];

/** Flat form state used by the simple "add/edit" form. */
export interface SimpleCharForm {
  name: string;
  playerName: string;
  ancestryName: string;
  className: string;
  level: number;
  maxHp: number;
  ac: number;
  perception: number;
  fort: number;
  ref: number;
  will: number;
}

export function blankForm(): SimpleCharForm {
  return {
    name: '', playerName: '', ancestryName: 'Human', className: 'Fighter',
    level: 1, maxHp: 20, ac: 15, perception: 3, fort: 5, ref: 3, will: 3,
  };
}

/**
 * Build a minimal valid CharacterRecord from the simple form.
 * @param form       The form data.
 * @param idHint     The id to use; defaults to `pc-<now>`.
 * @param createdAt  The createdAt timestamp; defaults to `now`.
 */
export function formToRecord(
  form: SimpleCharForm,
  idHint?: string,
  createdAt?: number,
): CharacterRecord {
  const now = Date.now();
  const id = idHint ?? `pc-${now}`;
  const ca = createdAt ?? now;
  return {
    id,
    name: form.name,
    playerName: form.playerName,
    createdAt: ca,
    updatedAt: now,
    level: form.level,
    ancestry: null,
    heritage: null,
    background: null,
    class: null,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    boostChoices: {
      ancestryBoosts: [],
      backgroundBoost: null,
      backgroundFreeBoost: null,
      classKeyAbility: null,
      level1FreeBoosts: [],
      level5: [], level10: [], level15: [], level20: [],
    },
    skills: {
      acrobatics: 0, arcana: 0, athletics: 0, crafting: 0, deception: 0,
      diplomacy: 0, intimidation: 0, medicine: 0, nature: 0, occultism: 0,
      performance: 0, religion: 0, society: 0, stealth: 0, survival: 0,
      thievery: 0, loreSkills: {},
    },
    feats: [],
    currentHp: form.maxHp,
    tempHp: 0,
    derivedStats: {
      maxHp: form.maxHp,
      ac: form.ac,
      perception: form.perception,
      fort: form.fort,
      ref: form.ref,
      will: form.will,
      classDC: 10,
    },
  } as CharacterRecord;
}

export function recordToForm(c: CharacterRecord): SimpleCharForm {
  return {
    name: c.name,
    playerName: c.playerName,
    ancestryName: c.ancestry?.name ?? 'Human',
    className: c.class?.name ?? 'Fighter',
    level: c.level,
    maxHp: c.derivedStats.maxHp,
    ac: c.derivedStats.ac,
    perception: c.derivedStats.perception,
    fort: c.derivedStats.fort,
    ref: c.derivedStats.ref,
    will: c.derivedStats.will,
  };
}
