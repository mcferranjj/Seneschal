import type { PF2ECreature } from '../types/pf2e';
import type { CustomAttack, CustomAbility, CustomSpeed, CustomSense, CustomImmunity, CustomResistance, CustomSpellcastingEntry, CustomSkill, Encounter } from '../types/encounter';

// -- Ability types -------------------------------------------------------------

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type SkillRank = 0 | 1 | 2 | 3 | 4; // untrained/trained/expert/master/legendary
export type FeatCategory = 'ancestry' | 'class' | 'general' | 'skill' | 'archetype' | 'heritage' | 'classfeature' | 'ancestryfeature';
export type FeatSlotType = 'ancestry' | 'class' | 'general' | 'skill' | 'free';

export interface AbilityScores {
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
}

export interface CharacterSkills {
  acrobatics: SkillRank; arcana: SkillRank; athletics: SkillRank;
  crafting: SkillRank; deception: SkillRank; diplomacy: SkillRank;
  intimidation: SkillRank; medicine: SkillRank; nature: SkillRank;
  occultism: SkillRank; performance: SkillRank; religion: SkillRank;
  society: SkillRank; stealth: SkillRank; survival: SkillRank;
  thievery: SkillRank;
  loreSkills: Record<string, SkillRank>;
}

export interface BoostChoicesByLevel {
  ancestryBoosts: AbilityKey[];       // free ancestry boost choices (fixed boosts are automatic)
  backgroundBoost: AbilityKey | null; // which of the 2-option background boost was chosen
  backgroundFreeBoost: AbilityKey | null; // which ability was boosted from the 6-option free slot
  classKeyAbility: AbilityKey | null;
  level1FreeBoosts: AbilityKey[];     // the four free attribute boosts chosen at character creation
  level5: AbilityKey[];
  level10: AbilityKey[];
  level15: AbilityKey[];
  level20: AbilityKey[];
}

export interface FeatChoice {
  slotType: FeatSlotType;
  level: number;
  featId: string | null;
  featName: string | null;
}

export interface CharacterDerivedStats {
  maxHp: number;
  ac: number;
  perception: number;
  fort: number;
  ref: number;
  will: number;
  classDC: number;
}

// References stored on the character record (denormalized name for display)
export interface CharacterAncestryRef {
  id: string; name: string; slug: string;
  hp: number; speed: number; size: string; vision: string;
  traits: string[]; languages: string[];
  fixedBoosts: AbilityKey[][];
  freeBoostCount: number;
  flaw: AbilityKey | null;
}
export interface CharacterHeritageRef {
  id: string; name: string; slug: string; isVersatile: boolean;
  versatileAncestrySlug: string | null;
}
export interface CharacterBackgroundRef {
  id: string; name: string; slug: string;
  boostOptions: AbilityKey[][];
  freeBoostCount: number;
  trainedSkills: string[];
  trainedLoreSkills: string[];
  grantedFeatId: string | null;
  grantedFeatName: string | null;
}
export interface CharacterClassRef {
  id: string; name: string; slug: string;
  hp: number;
  keyAbilityOptions: AbilityKey[];
  /** Chosen key ability (populated after class selection; mirrors boostChoices.classKeyAbility) */
  classKeyAbility?: AbilityKey;
  perception: number;
  savingThrows: { fortitude: number; reflex: number; will: number };
  unarmoredRank: number;
  trainedSkills: string[];
  additionalSkills: number;
  ancestryFeatLevels: number[];
  classFeatLevels: number[];
  generalFeatLevels: number[];
  skillFeatLevels: number[];
  skillIncreaseLevels: number[];
  /** Tag used to filter class-feature records that are subclass options (e.g. "barbarian-instinct"). Null for classes with no subclass. */
  subclassTag: string | null;
  /** Human-readable label for the subclass choice (e.g. "Instinct", "Research Field"). */
  subclassLabel: string | null;
}

export interface CharacterSubclassRef {
  id: string;
  name: string;
  slug: string;
}

// -- Existing database records -------------------------------------------------

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
  publication: string;
  blobSha: string;
  data: PF2ECreature;
  /** Indexed for filtering; set for complex hazards only */
  isComplex?: boolean;
  family?: string;
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
    // Hazard-specific fields
    hardness?: number;
    hasHealth?: boolean;
    stealthDC?: number;
    stealthDetails?: string;
    isComplex?: boolean;
    disable?: string;
    reset?: string;
    routine?: string;
  };
}

export interface CharacterRecord {
  id: string;
  name: string;
  playerName: string;
  createdAt: number;
  updatedAt: number;
  level: number;

  ancestry: CharacterAncestryRef | null;
  heritage: CharacterHeritageRef | null;
  background: CharacterBackgroundRef | null;
  class: CharacterClassRef | null;
  subclass: CharacterSubclassRef | null;

  abilityScores: AbilityScores;
  boostChoices: BoostChoicesByLevel;
  skills: CharacterSkills;
  feats: FeatChoice[];

  // In-play state
  currentHp: number;
  tempHp: number;

  derivedStats: CharacterDerivedStats;
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
  descriptions: Record<string, string>; // trait name (lowercase) -> description
}

// -- Character builder reference data -----------------------------------------

export interface GrantedItem { name: string; uuid: string; }

export interface AncestryBoostSet {
  fixed: AbilityKey[][];  // e.g. [["con"], ["wis"]]
  freeCount: number;      // usually 1; Human = 2
  flaw: AbilityKey | null;
}

export interface AncestryRecord {
  id: string; name: string; nameLower: string; slug: string;
  hp: number; speed: number; size: string; reach: number; vision: string;
  traits: string[]; rarity: string;
  boosts: AncestryBoostSet;
  languages: string[];
  additionalLanguages: { count: number; options: string[] };
  description: string;
  grantedItems: GrantedItem[];
  publication: string; remaster: boolean; blobSha: string;
}

export interface HeritageRecord {
  id: string; name: string; nameLower: string; slug: string;
  ancestrySlug: string | null;
  isVersatile: boolean;
  versatileAncestrySlug: string | null;
  description: string;
  traits: string[]; rarity: string;
  publication: string; remaster: boolean; blobSha: string;
}

export interface BackgroundBoostOption { choices: AbilityKey[]; }

export interface BackgroundRecord {
  id: string; name: string; nameLower: string; slug: string;
  boostOptions: BackgroundBoostOption[];
  freeBoostCount: number;
  trainedSkills: string[];
  trainedLoreSkills: string[];
  grantedFeat: GrantedItem | null;
  description: string;
  traits: string[]; rarity: string;
  publication: string; remaster: boolean; blobSha: string;
}

export interface ClassFeatureItem { level: number; name: string; uuid: string; }

export interface ClassRecord {
  id: string; name: string; nameLower: string; slug: string;
  hp: number;
  keyAbilityOptions: AbilityKey[];
  perception: number;
  savingThrows: { fortitude: number; reflex: number; will: number };
  attacks: { simple: number; martial: number; advanced: number; unarmed: number };
  defenses: { unarmored: number; light: number; medium: number; heavy: number };
  spellcasting: number;
  trainedSkills: string[];
  additionalSkills: number;
  ancestryFeatLevels: number[];
  classFeatLevels: number[];
  generalFeatLevels: number[];
  skillFeatLevels: number[];
  skillIncreaseLevels: number[];
  features: ClassFeatureItem[];
  /** Tag used to filter class-feature records that are subclass options (e.g. "barbarian-instinct"). Null for classes with no subclass. */
  subclassTag: string | null;
  /** Human-readable label for the subclass choice (e.g. "Instinct", "Research Field"). */
  subclassLabel: string | null;
  traits: string[]; rarity: string;
  publication: string; remaster: boolean; blobSha: string;
}

export interface FeatRecord {
  id: string; name: string; nameLower: string; slug: string;
  level: number;
  category: FeatCategory;
  traits: string[]; rarity: string;
  otherTags: string[];
  actionType: string | null;
  actions: number | null;
  prerequisites: string[];
  description: string;
  publication: string; remaster: boolean; blobSha: string;
}

/** Lightweight stat block for a party member — GM-facing only, not tied to CharacterRecord. */
export interface PartyMemberRecord {
  id: string;            // 'pmember-<timestamp>-<rand>'
  name: string;
  maxHp: number;
  ac: number;
  perception: number;
  fort: number;
  ref: number;
  will: number;
  createdAt: number;
  updatedAt: number;
}

export interface PartyRecord {
  id: string;            // 'party-<timestamp>'
  name: string;
  level: number;         // 1..20
  memberIds: string[];   // ordered list of PartyMemberRecord.id
  createdAt: number;
  updatedAt: number;
}
