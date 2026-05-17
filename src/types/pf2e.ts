export interface PF2ECreature {
  _id: string;
  name: string;
  type: string;
  img?: string;
  items: PF2EItem[];
  system: PF2ESystem;
}

export interface PF2ESystem {
  details?: {
    level?: { value: number };
    blurb?: string;
    languages?: { value: string[]; details?: string } | string | null;
    publication?: { title?: string; authors?: string; license?: string; remaster?: boolean };
    publicNotes?: string;
    privateNotes?: string;
    // Hazard-specific
    description?: string;
    disable?: string;
    reset?: string;
    routine?: string;
    isComplex?: boolean;
  };
  attributes?: {
    ac?: { value: number; details?: string };
    hp?: { value: number; max: number; details?: string; temp?: number };
    speed?: { value: number; otherSpeeds?: Array<{ type: string; value: number; label?: string }> };
    immunities?: Array<{ type: string; exceptions?: string[] }>;
    resistances?: Array<{ type: string; value: number; exceptions?: string[] }>;
    weaknesses?: Array<{ type: string; value: number; exceptions?: string[] }>;
    allSaves?: { value: string };
    // Hazard-specific
    hardness?: number;
    hasHealth?: boolean;
    stealth?: { value?: number; details?: string };
  };
  abilities?: {
    str?: { mod: number };
    dex?: { mod: number };
    con?: { mod: number };
    int?: { mod: number };
    wis?: { mod: number };
    cha?: { mod: number };
  };
  saves?: {
    fortitude?: { value: number; saveDetail?: string };
    reflex?: { value: number; saveDetail?: string };
    will?: { value: number; saveDetail?: string };
  };
  skills?: Record<string, { base?: number; value?: number }>;
  perception?: {
    mod?: number;
    value?: number;
    details?: string;
    senses?: Array<{ type: string; range?: number; precision?: string }>;
  };
  traits?: {
    size?: { value: string } | string;
    rarity?: string;
    value?: string[];
    languages?: { value: string[]; details?: string };
  };
  initiative?: { statistic: string };
  resources?: { focus?: { value: number; max: number } };
}

export interface PF2EItem {
  _id: string;
  name: string;
  type: string;
  img?: string;
  system: PF2EItemSystem;
}

export interface PF2EItemSystem {
  description?: { value: string };
  actionType?: { value: 'action' | 'reaction' | 'free' | 'passive' };
  actions?: { value: number | null };
  trigger?: { value: string };
  traits?: { value: string[]; rarity?: string };
  bonus?: { value: number };
  damageRolls?: Record<string, { damage: string; damageType: string; category?: string }>;
  attackEffects?: { value: string[]; custom?: string };
  category?: string;
  slug?: string;
  frequency?: { value: number; per: string } | null;
  requirements?: string;
  cost?: { value: string };
  range?: { value: string | null; increment?: number | null };
  attack?: unknown;
}
