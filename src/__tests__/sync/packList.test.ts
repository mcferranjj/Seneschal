import { describe, it, expect } from 'vitest';
import { isCreaturePack, getPackMeta, packRegistryHas } from '../../sync/packList';

describe('isCreaturePack', () => {
  it.each([
    'bestiary-ability-glossary-srd',
    'bestiary-family-ability-glossary',
    'bestiary-effects',
    'paizo-pregens',
    'iconics',
    'pf2e-pregenerated-characters',
  ])('returns false for excluded pack "%s"', packName => {
    expect(isCreaturePack(packName)).toBe(false);
  });

  it.each([
    'sf2e-bestiaries',
    'sf2e-core-npcs',
    'sf2e',
  ])('returns false for sf2e-prefixed pack "%s"', packName => {
    expect(isCreaturePack(packName)).toBe(false);
  });

  it.each([
    'pathfinder-bestiary',
    'pathfinder-bestiary-2',
    'pathfinder-bestiary-3',
    'age-of-ashes-bestiary',
    'npc-gallery',
  ])('returns true for valid creature pack "%s"', packName => {
    expect(isCreaturePack(packName)).toBe(true);
  });

  it('does not block packs that merely contain "sf2e" mid-name', () => {
    // Only the PREFIX should be blocked, not arbitrary occurrences
    expect(isCreaturePack('not-sf2e-related')).toBe(true);
  });
});

describe('getPackMeta', () => {
  it('returns remaster/core for monster-core', () => {
    expect(getPackMeta('monster-core')).toEqual({ era: 'remaster', category: 'core' });
  });

  it('returns remaster/supplemental for rage-of-elements', () => {
    expect(getPackMeta('rage-of-elements')).toEqual({ era: 'remaster', category: 'supplemental' });
  });

  it('returns legacy/core for pathfinder-bestiary', () => {
    expect(getPackMeta('pathfinder-bestiary')).toEqual({ era: 'legacy', category: 'core' });
  });

  it('returns legacy/supplemental for known lost-omens pack', () => {
    expect(getPackMeta('lost-omens-monsters-of-myth')).toEqual({ era: 'legacy', category: 'supplemental' });
  });

  it('returns legacy/misc for known AP pack', () => {
    expect(getPackMeta('age-of-ashes-bestiary')).toEqual({ era: 'legacy', category: 'misc' });
  });

  it('infers legacy/supplemental for unknown lost-omens pack via name pattern', () => {
    expect(getPackMeta('lost-omens-some-new-book')).toEqual({ era: 'legacy', category: 'supplemental' });
  });

  it('infers legacy/misc for unknown pack ending in -bestiary', () => {
    expect(getPackMeta('some-new-adventure-bestiary')).toEqual({ era: 'legacy', category: 'misc' });
  });

  it('defaults unknown pack to legacy/supplemental when no pattern matches', () => {
    expect(getPackMeta('some-random-pack')).toEqual({ era: 'legacy', category: 'supplemental' });
  });

  it('uses isRemasterFromDb=true for era when pack is not in registry', () => {
    expect(getPackMeta('some-unknown-pack', true)).toMatchObject({ era: 'remaster' });
  });

  it('ignores isRemasterFromDb when pack is in registry', () => {
    // pathfinder-bestiary is legacy in the registry; isRemasterFromDb should not override that
    expect(getPackMeta('pathfinder-bestiary', true)).toMatchObject({ era: 'legacy' });
  });
});

describe('packRegistryHas', () => {
  it('returns true for a known pack', () => {
    expect(packRegistryHas('monster-core')).toBe(true);
    expect(packRegistryHas('pathfinder-bestiary')).toBe(true);
  });

  it('returns false for an unknown pack', () => {
    expect(packRegistryHas('some-unknown-pack')).toBe(false);
  });
});
