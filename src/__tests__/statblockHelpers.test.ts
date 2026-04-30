import { describe, it, expect } from 'vitest';
import type { PF2ECreature, PF2EItem } from '../types/pf2e';
import {
  getLevel,
  getSize,
  getLanguages,
  formatMod,
  getSkills,
  getSenses,
  getSpeedString,
  getImmResWeak,
  getAttacks,
  getActions,
  getPassives,
  getDamageString,
  getActionCostLabel,
  stripFoundryMacros,
} from '../components/StatblockDrawer/statblockHelpers';

// Minimal creature fixture — tests override only the fields they care about
function makeCreature(overrides: Partial<PF2ECreature> = {}): PF2ECreature {
  return {
    _id: 'test-id',
    name: 'Test Creature',
    type: 'npc',
    items: [],
    system: {},
    ...overrides,
  };
}

function makeItem(overrides: Partial<PF2EItem> = {}): PF2EItem {
  return {
    _id: 'item-id',
    name: 'Test Item',
    type: 'action',
    system: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getLevel
// ---------------------------------------------------------------------------
describe('getLevel', () => {
  it('returns 0 when system is empty', () => {
    expect(getLevel(makeCreature())).toBe(0);
  });

  it('returns level.value when level is an object', () => {
    const c = makeCreature({ system: { details: { level: { value: 7 } } } });
    expect(getLevel(c)).toBe(7);
  });

  it('returns bare number when level is a number', () => {
    const c = makeCreature({ system: { details: { level: 12 as unknown as { value: number } } } });
    expect(getLevel(c)).toBe(12);
  });

  it('returns 0 when level is falsy', () => {
    const c = makeCreature({ system: { details: { level: { value: 0 } } } });
    expect(getLevel(c)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getSize
// ---------------------------------------------------------------------------
describe('getSize', () => {
  it('returns Medium when system is empty', () => {
    expect(getSize(makeCreature())).toBe('Medium');
  });

  it('maps object size values to display labels', () => {
    const cases: Array<[string, string]> = [
      ['tiny', 'Tiny'],
      ['sm', 'Small'],
      ['med', 'Medium'],
      ['lg', 'Large'],
      ['huge', 'Huge'],
      ['grg', 'Gargantuan'],
    ];
    for (const [raw, expected] of cases) {
      const c = makeCreature({ system: { traits: { size: { value: raw } } } });
      expect(getSize(c)).toBe(expected);
    }
  });

  it('returns raw value for unknown size codes', () => {
    const c = makeCreature({ system: { traits: { size: { value: 'colossal' } } } });
    expect(getSize(c)).toBe('colossal');
  });

  it('maps string size value directly', () => {
    const c = makeCreature({ system: { traits: { size: 'lg' as unknown as { value: string } } } });
    expect(getSize(c)).toBe('Large');
  });
});

// ---------------------------------------------------------------------------
// getLanguages
// ---------------------------------------------------------------------------
describe('getLanguages', () => {
  it('returns empty string when system is empty', () => {
    expect(getLanguages(makeCreature())).toBe('');
  });

  it('returns the string directly when languages is a string', () => {
    const c = makeCreature({
      system: { details: { languages: 'Common, Elvish' as unknown as { value: string[]; details?: string } } },
    });
    expect(getLanguages(c)).toBe('Common, Elvish');
  });

  it('joins language array', () => {
    const c = makeCreature({ system: { details: { languages: { value: ['Common', 'Draconic'] } } } });
    expect(getLanguages(c)).toBe('Common, Draconic');
  });

  it('appends details after semicolon', () => {
    const c = makeCreature({
      system: { details: { languages: { value: ['Common'], details: 'plus any 2 others' } } },
    });
    expect(getLanguages(c)).toBe('Common; plus any 2 others');
  });

  it('returns only details when value array is empty', () => {
    const c = makeCreature({
      system: { details: { languages: { value: [], details: 'understands all' } } },
    });
    expect(getLanguages(c)).toBe('understands all');
  });
});

// ---------------------------------------------------------------------------
// formatMod
// ---------------------------------------------------------------------------
describe('formatMod', () => {
  it('returns em-dash for null', () => {
    expect(formatMod(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatMod(undefined)).toBe('—');
  });

  it('formats zero with plus sign', () => {
    expect(formatMod(0)).toBe('+0');
  });

  it('formats positive numbers with plus sign', () => {
    expect(formatMod(5)).toBe('+5');
  });

  it('formats negative numbers with minus sign (from the number itself)', () => {
    expect(formatMod(-3)).toBe('-3');
  });
});

// ---------------------------------------------------------------------------
// getSkills
// ---------------------------------------------------------------------------
describe('getSkills', () => {
  it('returns empty array when no skills', () => {
    expect(getSkills(makeCreature())).toEqual([]);
  });

  it('filters out zero-mod skills', () => {
    const c = makeCreature({ system: { skills: { athletics: { base: 0 } } } });
    expect(getSkills(c)).toEqual([]);
  });

  it('extracts skills using base field', () => {
    const c = makeCreature({ system: { skills: { athletics: { base: 8 } } } });
    expect(getSkills(c)).toEqual([{ name: 'athletics', mod: 8 }]);
  });

  it('falls back to value field when base is absent', () => {
    const c = makeCreature({ system: { skills: { stealth: { value: 6 } } } });
    expect(getSkills(c)).toEqual([{ name: 'stealth', mod: 6 }]);
  });

  it('sorts skills alphabetically', () => {
    const c = makeCreature({
      system: {
        skills: {
          stealth: { base: 6 },
          acrobatics: { base: 4 },
          medicine: { base: 10 },
        },
      },
    });
    const result = getSkills(c);
    expect(result.map(s => s.name)).toEqual(['acrobatics', 'medicine', 'stealth']);
  });
});

// ---------------------------------------------------------------------------
// getSenses
// ---------------------------------------------------------------------------
describe('getSenses', () => {
  it('returns Perception +0 when system is empty', () => {
    expect(getSenses(makeCreature())).toBe('Perception +0');
  });

  it('includes perception mod', () => {
    const c = makeCreature({ system: { perception: { mod: 12 } } });
    expect(getSenses(c)).toBe('Perception +12');
  });

  it('appends senses without range', () => {
    const c = makeCreature({
      system: { perception: { mod: 5, senses: [{ type: 'darkvision' }] } },
    });
    expect(getSenses(c)).toBe('Perception +5; darkvision');
  });

  it('appends senses with range', () => {
    const c = makeCreature({
      system: { perception: { mod: 3, senses: [{ type: 'scent', range: 30 }] } },
    });
    expect(getSenses(c)).toBe('Perception +3; scent 30 ft.');
  });

  it('appends details after senses', () => {
    const c = makeCreature({
      system: { perception: { mod: 7, senses: [{ type: 'darkvision' }], details: 'in moonlight' } },
    });
    expect(getSenses(c)).toBe('Perception +7; darkvision; in moonlight');
  });
});

// ---------------------------------------------------------------------------
// getSpeedString
// ---------------------------------------------------------------------------
describe('getSpeedString', () => {
  it('returns em-dash when no speed', () => {
    expect(getSpeedString(makeCreature())).toBe('—');
  });

  it('returns walk speed only', () => {
    const c = makeCreature({ system: { attributes: { speed: { value: 30 } } } });
    expect(getSpeedString(c)).toBe('30 ft.');
  });

  it('includes additional speed types', () => {
    const c = makeCreature({
      system: {
        attributes: {
          speed: { value: 25, otherSpeeds: [{ type: 'fly', value: 60 }, { type: 'swim', value: 20 }] },
        },
      },
    });
    expect(getSpeedString(c)).toBe('25 ft., fly 60 ft., swim 20 ft.');
  });
});

// ---------------------------------------------------------------------------
// getImmResWeak
// ---------------------------------------------------------------------------
describe('getImmResWeak', () => {
  it('returns empty strings when no attributes', () => {
    expect(getImmResWeak(makeCreature())).toEqual({ immunities: '', resistances: '', weaknesses: '' });
  });

  it('formats immunities (no value)', () => {
    const c = makeCreature({
      system: { attributes: { immunities: [{ type: 'fire' }, { type: 'cold' }] } },
    });
    expect(getImmResWeak(c).immunities).toBe('fire, cold');
  });

  it('formats resistances with value', () => {
    const c = makeCreature({
      system: { attributes: { resistances: [{ type: 'fire', value: 5 }] } },
    });
    expect(getImmResWeak(c).resistances).toBe('fire 5');
  });

  it('formats weaknesses with value and exceptions', () => {
    const c = makeCreature({
      system: {
        attributes: { weaknesses: [{ type: 'cold', value: 10, exceptions: ['magical'] }] },
      },
    });
    expect(getImmResWeak(c).weaknesses).toBe('cold 10 (except magical)');
  });
});

// ---------------------------------------------------------------------------
// getAttacks / getActions / getPassives
// ---------------------------------------------------------------------------
describe('getAttacks', () => {
  it('returns melee and ranged items', () => {
    const items = [
      makeItem({ type: 'melee', _id: 'a' }),
      makeItem({ type: 'ranged', _id: 'b' }),
      makeItem({ type: 'action', _id: 'c' }),
    ];
    const c = makeCreature({ items });
    expect(getAttacks(c).map(i => i._id)).toEqual(['a', 'b']);
  });

  it('returns empty array when no attacks', () => {
    const c = makeCreature({ items: [makeItem({ type: 'action' })] });
    expect(getAttacks(c)).toEqual([]);
  });
});

describe('getActions', () => {
  it('returns action/reaction/free items', () => {
    const items = [
      makeItem({ type: 'action', _id: 'act', system: { actionType: { value: 'action' } } }),
      makeItem({ type: 'action', _id: 'rea', system: { actionType: { value: 'reaction' } } }),
      makeItem({ type: 'action', _id: 'fre', system: { actionType: { value: 'free' } } }),
      makeItem({ type: 'action', _id: 'pas', system: { actionType: { value: 'passive' } } }),
      makeItem({ type: 'melee', _id: 'mel' }),
    ];
    const c = makeCreature({ items });
    expect(getActions(c).map(i => i._id)).toEqual(['act', 'rea', 'fre']);
  });
});

describe('getPassives', () => {
  it('returns only passive action items', () => {
    const items = [
      makeItem({ type: 'action', _id: 'pas', system: { actionType: { value: 'passive' } } }),
      makeItem({ type: 'action', _id: 'act', system: { actionType: { value: 'action' } } }),
    ];
    const c = makeCreature({ items });
    expect(getPassives(c).map(i => i._id)).toEqual(['pas']);
  });
});

// ---------------------------------------------------------------------------
// getDamageString
// ---------------------------------------------------------------------------
describe('getDamageString', () => {
  it('returns empty string for undefined', () => {
    expect(getDamageString(undefined)).toBe('');
  });

  it('formats a single damage roll', () => {
    expect(getDamageString({ a: { damage: '2d6', damageType: 'fire' } })).toBe('2d6 fire');
  });

  it('joins multiple damage rolls with " + "', () => {
    const rolls = {
      a: { damage: '2d6', damageType: 'fire' },
      b: { damage: '1d4', damageType: 'cold' },
    };
    expect(getDamageString(rolls)).toBe('2d6 fire + 1d4 cold');
  });
});

// ---------------------------------------------------------------------------
// getActionCostLabel
// ---------------------------------------------------------------------------
describe('getActionCostLabel', () => {
  it('returns [R] for reaction', () => {
    const item = makeItem({ system: { actionType: { value: 'reaction' } } });
    expect(getActionCostLabel(item)).toBe('[R]');
  });

  it('returns [F] for free action', () => {
    const item = makeItem({ system: { actionType: { value: 'free' } } });
    expect(getActionCostLabel(item)).toBe('[F]');
  });

  it('returns empty string for passive', () => {
    const item = makeItem({ system: { actionType: { value: 'passive' } } });
    expect(getActionCostLabel(item)).toBe('');
  });

  it('returns [A] for 1-action cost', () => {
    const item = makeItem({ system: { actionType: { value: 'action' }, actions: { value: 1 } } });
    expect(getActionCostLabel(item)).toBe('[A]');
  });

  it('returns [AA] for 2-action cost', () => {
    const item = makeItem({ system: { actionType: { value: 'action' }, actions: { value: 2 } } });
    expect(getActionCostLabel(item)).toBe('[AA]');
  });

  it('returns [AAA] for 3-action cost', () => {
    const item = makeItem({ system: { actionType: { value: 'action' }, actions: { value: 3 } } });
    expect(getActionCostLabel(item)).toBe('[AAA]');
  });

  it('returns empty string for action with no cost value', () => {
    const item = makeItem({ system: { actionType: { value: 'action' }, actions: { value: null } } });
    expect(getActionCostLabel(item)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// stripFoundryMacros
// ---------------------------------------------------------------------------
describe('stripFoundryMacros', () => {
  it('extracts dice formula from @Damage with simple expression', () => {
    expect(stripFoundryMacros('@Damage[2d6]')).toBe('2d6');
  });

  it('handles @Damage with nested type annotation (leaves trailing bracket due to regex boundary)', () => {
    // The outer regex [^\]]+ stops at the first ], so "9d10[untyped]" is parsed as
    // inner="9d10[untyped" + residual "]" → output "9d10[untyped]"
    expect(stripFoundryMacros('@Damage[9d10[untyped]]')).toBe('9d10[untyped]');
  });

  it('extracts DC label from @Check macro', () => {
    expect(stripFoundryMacros('@Check[type:reflex|dc:18]')).toBe('DC reflex');
  });

  it('extracts display text from Compendium @UUID link', () => {
    expect(
      stripFoundryMacros('@UUID[Compendium.pf2e.monsters.Actor.abc123]{Goblin}'),
    ).toBe('Goblin');
  });

  it('extracts item name from @UUID link with no display text', () => {
    expect(stripFoundryMacros('@UUID[Compendium.pf2e.actionspf2e.Item.Balance]')).toBe('Balance');
  });

  it('extracts multi-word item name from @UUID link with no display text', () => {
    expect(stripFoundryMacros('@UUID[Compendium.pf2e.actionspf2e.Item.Grab an Edge]')).toBe('Grab an Edge');
  });

  it('extracts condition name from @UUID link with no display text', () => {
    expect(stripFoundryMacros('@UUID[Compendium.pf2e.conditionitems.Item.Off-Guard]')).toBe('Off-Guard');
  });

  it('handles mixed UUID links with and without display text (Steady Balance example)', () => {
    const input = "They aren't @UUID[Compendium.pf2e.conditionitems.Item.Off-Guard] when attempting to @UUID[Compendium.pf2e.actionspf2e.Item.Balance] and can attempt an Acrobatics check instead of a Reflex save to @UUID[Compendium.pf2e.actionspf2e.Item.Grab an Edge].";
    expect(stripFoundryMacros(input)).toBe("They aren't Off-Guard when attempting to Balance and can attempt an Acrobatics check instead of a Reflex save to Grab an Edge.");
  });

  it('extracts display text from Actor @UUID link', () => {
    expect(stripFoundryMacros('@UUID[Actor.xyz]{Some Creature}')).toBe('Some Creature');
  });

  it('removes @Localize macros entirely', () => {
    expect(stripFoundryMacros('See @Localize[PF2E.NPC.Abilities.Glossary.X] for details')).toBe(
      'See  for details',
    );
  });

  it('removes @Template macros entirely', () => {
    expect(stripFoundryMacros('Area: @Template[type:cone|distance:15]')).toBe('Area: ');
  });

  it('removes unknown @Macro references', () => {
    expect(stripFoundryMacros('@SomeNewMacro[stuff]')).toBe('');
  });

  it('leaves plain HTML untouched', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(stripFoundryMacros(html)).toBe(html);
  });

  it('handles multiple macros in one string', () => {
    // Nested type brackets leave a residual ] — see note above
    const input = 'Deal @Damage[3d8[fire]] and @Damage[1d6[cold]] damage.';
    expect(stripFoundryMacros(input)).toBe('Deal 3d8[fire] and 1d6[cold] damage.');
  });
});
