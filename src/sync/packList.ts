const EXCLUDED_PACKS = new Set([
  'bestiary-ability-glossary-srd',
  'bestiary-family-ability-glossary',
  'bestiary-effects',
  'paizo-pregens',
  'iconics',
  'pf2e-pregenerated-characters',
]);

export function isCreaturePack(packName: string): boolean {
  if (EXCLUDED_PACKS.has(packName)) return false;
  return true;
}


export type PackEra = 'remaster' | 'legacy' | 'sf2e';
export type PackCategory = 'core' | 'supplemental' | 'misc';
export interface PackMeta { era: PackEra; category: PackCategory; }

const PACK_REGISTRY: Record<string, PackMeta> = {
  // ── REMASTER ──────────────────────────────────────────────────────────────
  // Remaster — Core
  'pathfinder-monster-core':              { era: 'remaster', category: 'core' },
  'pathfinder-monster-core-2':            { era: 'remaster', category: 'core' },
  'pathfinder-npc-core':                  { era: 'remaster', category: 'core' },

  // Remaster — Supplemental
  'battlecry-bestiary':                   { era: 'remaster', category: 'supplemental' },
  'howl-of-the-wild-bestiary':            { era: 'remaster', category: 'supplemental' },
  'pathfinder-dark-archive':              { era: 'remaster', category: 'supplemental' },
  'rage-of-elements-bestiary':            { era: 'remaster', category: 'supplemental' },
  'war-of-immortals-bestiary':            { era: 'remaster', category: 'supplemental' },
  'lost-omens-bestiary':                  { era: 'remaster', category: 'supplemental' },
  'tian-xia-world-guide':                 { era: 'remaster', category: 'supplemental' },

  // Remaster — Misc (Adventure Paths, Society & Standalones)
  'claws-of-the-tyrant-bestiary':         { era: 'remaster', category: 'misc' },
  'curtain-call-bestiary':                { era: 'remaster', category: 'misc' },
  'hellbreakers-bestiary':                { era: 'remaster', category: 'misc' },
  'menace-under-otari-bestiary':          { era: 'remaster', category: 'misc' },
  'myth-speaker-bestiary':                { era: 'remaster', category: 'misc' },
  'pfs-season-6-bestiary':               { era: 'remaster', category: 'misc' },
  'pfs-season-7-bestiary':               { era: 'remaster', category: 'misc' },
  'prey-for-death-bestiary':              { era: 'remaster', category: 'misc' },
  'revenge-of-the-runelords-bestiary':    { era: 'remaster', category: 'misc' },
  'season-of-ghosts-bestiary':            { era: 'remaster', category: 'misc' },
  'shades-of-blood-bestiary':             { era: 'remaster', category: 'misc' },
  'spore-war-bestiary':                   { era: 'remaster', category: 'misc' },
  'standalone-adventures':                { era: 'remaster', category: 'misc' },
  'triumph-of-the-tusk-bestiary':         { era: 'remaster', category: 'misc' },
  'troubles-in-grayce-bestiary':          { era: 'remaster', category: 'misc' },
  'wardens-of-wildwood-bestiary':         { era: 'remaster', category: 'misc' },

  // ── LEGACY ────────────────────────────────────────────────────────────────
  // Legacy — Core
  'npc-gallery':                          { era: 'legacy', category: 'core' },
  'pathfinder-bestiary':                  { era: 'legacy', category: 'core' },
  'pathfinder-bestiary-2':               { era: 'legacy', category: 'core' },
  'pathfinder-bestiary-3':               { era: 'legacy', category: 'core' },

  // Legacy — Supplemental
  'book-of-the-dead-bestiary':            { era: 'legacy', category: 'supplemental' },

  // Legacy — Misc (Adventure Paths, Society & Standalones)
  'abomination-vaults-bestiary':          { era: 'legacy', category: 'misc' },
  'age-of-ashes-bestiary':               { era: 'legacy', category: 'misc' },
  'agents-of-edgewatch-bestiary':         { era: 'legacy', category: 'misc' },
  'blog-bestiary':                        { era: 'legacy', category: 'misc' },
  'blood-lords-bestiary':                 { era: 'legacy', category: 'misc' },
  'crown-of-the-kobold-king-bestiary':    { era: 'legacy', category: 'misc' },
  'extinction-curse-bestiary':            { era: 'legacy', category: 'misc' },
  'fall-of-plaguestone':                  { era: 'legacy', category: 'misc' },
  'fists-of-the-ruby-phoenix-bestiary':   { era: 'legacy', category: 'misc' },
  'gatewalkers-bestiary':                 { era: 'legacy', category: 'misc' },
  'kingmaker-bestiary':                   { era: 'legacy', category: 'misc' },
  'malevolence-bestiary':                 { era: 'legacy', category: 'misc' },
  'night-of-the-gray-death-bestiary':     { era: 'legacy', category: 'misc' },
  'one-shot-bestiary':                    { era: 'legacy', category: 'misc' },
  'outlaws-of-alkenstar-bestiary':        { era: 'legacy', category: 'misc' },
  'pfs-introductions-bestiary':           { era: 'legacy', category: 'misc' },
  'pfs-season-1-bestiary':               { era: 'legacy', category: 'misc' },
  'pfs-season-2-bestiary':               { era: 'legacy', category: 'misc' },
  'pfs-season-3-bestiary':               { era: 'legacy', category: 'misc' },
  'pfs-season-4-bestiary':               { era: 'legacy', category: 'misc' },
  'pfs-season-5-bestiary':               { era: 'legacy', category: 'misc' },
  'quest-for-the-frozen-flame-bestiary':  { era: 'legacy', category: 'misc' },
  'rusthenge-bestiary':                   { era: 'legacy', category: 'misc' },
  'seven-dooms-for-sandpoint-bestiary':   { era: 'legacy', category: 'misc' },
  'shadows-at-sundown-bestiary':          { era: 'legacy', category: 'misc' },
  'sky-kings-tomb-bestiary':             { era: 'legacy', category: 'misc' },
  'stolen-fate-bestiary':                 { era: 'legacy', category: 'misc' },
  'strength-of-thousands-bestiary':       { era: 'legacy', category: 'misc' },
  'the-enmity-cycle-bestiary':            { era: 'legacy', category: 'misc' },
  'the-slithering-bestiary':              { era: 'legacy', category: 'misc' },
  'troubles-in-otari-bestiary':           { era: 'legacy', category: 'misc' },
};

function inferCategory(packName: string): PackCategory {
  if (packName.endsWith('-bestiary') || packName.includes('society')) return 'misc';
  return 'supplemental';
}

export function packRegistryHas(packName: string): boolean {
  return packName in PACK_REGISTRY;
}

/** Returns metadata for a pack. `isRemasterFromDb` is used only for packs absent from PACK_REGISTRY. */
export function getPackMeta(packName: string, isRemasterFromDb?: boolean): PackMeta {
  if (PACK_REGISTRY[packName]) return PACK_REGISTRY[packName];
  if (packName === 'custom') return { era: 'remaster', category: 'misc' };
  if (packName.startsWith('sf2e')) return { era: 'sf2e', category: inferCategory(packName) };
  return {
    era: isRemasterFromDb ? 'remaster' : 'legacy',
    category: inferCategory(packName),
  };
}
