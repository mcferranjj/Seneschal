import type { CreatureRecord } from '../db/schema';
import type {
  CustomAttack, CustomAbility, CustomSpeed, CustomSense,
  CustomImmunity, CustomResistance, CustomSkill, AbilityActionType, SpeedType,
  CustomSpellcastingEntry, CustomSpell, SpellTradition, SpellcastingType, SpellFrequency,
} from '../types/encounter';
import { getDamageString, getAttacks, getActions, getPassives } from '../features/statblock/statblockHelpers';
import { toEditableText } from './foundryMacros';
import { normalizeFamily } from './pf2eHelpers';

function mapActionCost(raw: string | number | null | undefined): AbilityActionType | undefined {
  if (raw == null) return undefined;
  const s = String(raw).toLowerCase().trim();
  if (s === 'reaction') return 'reaction';
  if (s === 'free') return 'free';
  if (s === '1' || s === 'action') return 'single';
  if (s === '2') return 'two';
  if (s === '3') return 'three';
  if (s === 'passive') return 'passive';
  return undefined;
}

function mapTradition(raw: string | undefined): SpellTradition {
  const t = (raw ?? '').toLowerCase();
  if (t === 'divine' || t === 'occult' || t === 'primal') return t;
  return 'arcane';
}

function mapPreparedType(raw: string | undefined): SpellcastingType {
  const t = (raw ?? '').toLowerCase();
  if (t === 'spontaneous') return 'spontaneous';
  if (t === 'innate') return 'innate';
  return 'prepared';
}

function detectInnateFrequency(
  spellSystem: Record<string, unknown>,
): SpellFrequency | undefined {
  const uses = spellSystem['location'] as Record<string, unknown> | undefined;
  const usesValue = uses?.['uses'] as { value: number; max: number } | undefined;
  if (usesValue?.max != null) {
    const max = usesValue.max;
    if (max >= 3) return '3/day';
    if (max === 2) return '2/day';
    return '1/day';
  }
  const desc = (spellSystem['description'] as { value?: string } | undefined)?.value ?? '';
  const lower = desc.toLowerCase();
  if (/at.?will/i.test(lower)) return 'at-will';
  if (/3\/day|three.*per day/i.test(lower)) return '3/day';
  if (/2\/day|twice.*per day/i.test(lower)) return '2/day';
  if (/1\/day|once.*per day/i.test(lower)) return '1/day';
  if (/constant/i.test(lower)) return 'constant';
  if (/focus/i.test(lower)) return 'focus';
  return undefined;
}

export function importSpellcasting(creature: CreatureRecord): CustomSpellcastingEntry[] {
  const items = creature.data?.items ?? [];
  const entries = items.filter(i => i.type === 'spellcastingEntry');
  if (entries.length === 0) return [];

  const focusMax = (creature.data?.system as Record<string, unknown> | undefined)?.resources as Record<string, unknown> | undefined;
  const globalFocusMax = (focusMax?.['focus'] as { value?: number; max?: number } | undefined)?.max ?? 0;

  return entries.map(entry => {
    const sys = entry.system as Record<string, unknown>;
    const tradition = mapTradition((sys['tradition'] as { value?: string } | undefined)?.value);
    const prepared = (sys['prepared'] as { value?: string } | undefined)?.value;
    const type = mapPreparedType(prepared);
    const spelldc = sys['spelldc'] as { dc?: number; value?: number } | undefined;
    const dc = spelldc?.dc ?? 15;
    const attackMod = spelldc?.value ?? 7;

    const entrySpells = items.filter(
      i => i.type === 'spell' && (i.system as Record<string, unknown>)?.['location']
        && ((i.system as Record<string, unknown>)['location'] as Record<string, unknown>)?.['value'] === entry._id
    );

    const spells: CustomSpell[] = entrySpells.map(spellItem => {
      const ssys = spellItem.system as Record<string, unknown>;
      const rank = (ssys['level'] as { value?: number } | undefined)?.value ?? 0;
      const timeRaw = (ssys['time'] as { value?: string | number } | undefined)?.value;
      const actionsRaw = (ssys['actions'] as { value?: string | number } | undefined)?.value;
      const actionCost = mapActionCost(timeRaw ?? actionsRaw);
      const traits = (ssys['traits'] as { value?: string[] } | undefined)?.value ?? [];
      const description = toEditableText((ssys['description'] as { value?: string } | undefined)?.value ?? '');

      let frequency: SpellFrequency | undefined;
      if (type === 'innate') {
        frequency = rank === 0 ? 'cantrip' : detectInnateFrequency(ssys);
      }

      return {
        name: spellItem.name,
        actionCost,
        description,
        rank,
        frequency,
        traits: traits.length ? traits : undefined,
      };
    });

    const hasFocus = spells.some(s => s.frequency === 'focus');
    const focusPoints = hasFocus && globalFocusMax > 0 ? globalFocusMax : undefined;

    return {
      id: `spell-${entry._id}`,
      name: entry.name,
      tradition,
      type,
      dc,
      attackMod,
      focusPoints,
      spells,
    };
  });
}

export function importCreatureAsCustom(source: CreatureRecord): CreatureRecord {
  const c = source.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const system = c.system as any;
  const attrs = system?.attributes ?? {};
  const isHazard = source.entityType === 'hazard';

  const hp: number = attrs.hp?.max ?? 10;
  const ac: number = attrs.ac?.value ?? 10;
  const fort: number = system?.saves?.fortitude?.value ?? 0;
  const ref: number = system?.saves?.reflex?.value ?? 0;
  const will: number = system?.saves?.will?.value ?? 0;
  const allSavesNote: string = attrs.allSaves?.value ?? '';
  const strMod: number = system?.abilities?.str?.mod ?? 0;
  const dexMod: number = system?.abilities?.dex?.mod ?? 0;
  const conMod: number = system?.abilities?.con?.mod ?? 0;
  const intMod: number = system?.abilities?.int?.mod ?? 0;
  const wisMod: number = system?.abilities?.wis?.mod ?? 0;
  const chaMod: number = system?.abilities?.cha?.mod ?? 0;
  const perception: number = system?.perception?.mod ?? system?.perception?.value ?? 0;
  const level: number = system?.details?.level?.value ?? source.level;

  // Speeds (creatures only)
  const speed = attrs.speed ?? {};
  const speeds: CustomSpeed[] = [];
  if (!isHazard) {
    if (speed.value) speeds.push({ type: 'land' as SpeedType, value: speed.value });
    for (const s of speed.otherSpeeds ?? []) {
      if (['climb', 'swim', 'burrow', 'fly'].includes(s.type))
        speeds.push({ type: s.type as SpeedType, value: s.value });
    }
  }

  // Senses (creatures only)
  const senses: CustomSense[] = isHazard ? [] : (system?.perception?.senses ?? []).map((s: { type: string; range?: number }) => ({
    name: s.type,
    range: s.range ?? undefined,
  }));

  // Immunities
  const immunities: CustomImmunity[] = (attrs.immunities ?? []).map((i: { type: string }) => ({ type: i.type }));

  // Resistances
  const resistances: CustomResistance[] = (attrs.resistances ?? []).map((r: { type: string; value: number; exceptions?: string[] }) => ({
    type: r.type,
    value: r.value,
    exceptions: r.exceptions?.join(', '),
  }));

  // Weaknesses
  const weaknesses: CustomResistance[] = (attrs.weaknesses ?? []).map((w: { type: string; value: number; exceptions?: string[] }) => ({
    type: w.type,
    value: w.value,
    exceptions: w.exceptions?.join(', '),
  }));

  // Skills (creatures only)
  const skills: CustomSkill[] = isHazard ? [] : Object.entries(system?.skills ?? {}).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    mod: (data as { base?: number; value?: number }).base ?? (data as { base?: number; value?: number }).value ?? 0,
  })).filter(s => s.mod !== 0);

  // Languages (creatures only)
  const langObj = isHazard ? undefined : (system?.details?.languages ?? system?.traits?.languages);
  const languages: string[] = typeof langObj === 'string'
    ? langObj.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
    : (langObj?.value ?? []);

  // Attacks
  const attacks: CustomAttack[] = getAttacks(c).map(item => {
    const damageRolls = item.system?.damageRolls ?? {};
    const effects = item.system?.attackEffects?.value ?? [];
    const damageStr = getDamageString(damageRolls);
    const fullDamage = [damageStr, ...effects].filter(Boolean).join(' plus ');
    const isRanged = item.type === 'ranged' || item.system?.range?.increment != null;
    const rangeVal = item.system?.range?.increment ??
      (typeof item.system?.range?.value === 'number' ? item.system.range.value : undefined);
    return {
      name: item.name,
      type: isRanged ? 'ranged' : 'melee',
      bonus: item.system?.bonus?.value ?? 0,
      damage: fullDamage,
      range: isRanged ? (rangeVal ?? 30) : undefined,
      traits: item.system?.traits?.value ?? [],
    };
  });

  // Abilities — from passives + actions
  const actionTypeMap: Record<string, AbilityActionType> = {
    action: 'single', reaction: 'reaction', free: 'free', passive: 'passive',
  };
  const costMap: Record<number, AbilityActionType> = { 1: 'single', 2: 'two', 3: 'three' };

  const allAbilityItems = [...getPassives(c), ...getActions(c)];
  const abilities: CustomAbility[] = allAbilityItems.map(item => {
    const at = item.system?.actionType?.value;
    const cost = item.system?.actions?.value;
    let actionType: AbilityActionType | undefined;
    if (at === 'reaction') actionType = 'reaction';
    else if (at === 'free') actionType = 'free';
    else if (at === 'passive') actionType = 'passive';
    else if (cost != null) actionType = costMap[cost as number] ?? 'single';
    else if (at && actionTypeMap[at]) actionType = actionTypeMap[at];

    // Extract Trigger / Requirements from the RAW source so the <hr/> boundary
    // (which toEditableText strips) is still available for the regex. Then
    // remove the matched blocks from the body before cleaning, so they don't
    // appear duplicated in the rendered description.
    const rawSource = item.system?.description?.value ?? '';

    let trigger: string | undefined;
    let requirements: string | undefined;

    const triggerMatch = rawSource.match(/<strong>Trigger<\/strong>\s*(.*?)(?:<\/p>|<hr\s*\/>)/is);
    // Trigger / Requirements are surfaced as plain-text fields in the UI, so
    // strip any inline tags that survived toEditableText's whitelist.
    if (triggerMatch) trigger = toEditableText(triggerMatch[1]).replace(/<[^>]+>/g, '').trim() || undefined;

    const reqMatch = rawSource.match(/<strong>Requirements?<\/strong>\s*(.*?)(?:<\/p>|<hr\s*\/>)/is);
    if (reqMatch) requirements = toEditableText(reqMatch[1]).replace(/<[^>]+>/g, '').trim() || undefined;

    let cleanedSource = rawSource;
    if (triggerMatch) cleanedSource = cleanedSource.replace(triggerMatch[0], '');
    if (reqMatch) cleanedSource = cleanedSource.replace(reqMatch[0], '');
    const rawDesc = toEditableText(cleanedSource);

    let frequency: string | undefined;
    const freq = item.system?.frequency;
    if (freq) {
      const perMap: Record<string, string> = {
        'P1D': 'Once per day', 'PT1H': 'Once per hour', 'PT1M': 'Once per minute',
      };
      frequency = perMap[freq.per ?? ''] ?? `${freq.value} per ${freq.per}`;
    }

    return {
      name: item.name,
      description: rawDesc,
      actionType,
      trigger,
      requirements,
      frequency,
    };
  });

  // Spellcasting (creatures only)
  const spellcasting = isHazard ? [] : importSpellcasting(source);

  // Flavor text
  const flavorText = toEditableText(system?.details?.publicNotes ?? '');

  // Size / rarity / traits from source record (already normalized)
  const size = isHazard ? 'med' : source.size;
  const rarity = source.rarity;
  const traits = source.traits;

  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const newName = `${source.name} (Custom)`;

  // Hazard-specific fields
  const hazardIsComplex: boolean = system?.details?.isComplex === true;
  // hasHealth: official hazards have hasHealth on attrs; fall back to checking if hp.max > 0
  const hazardHasHealth: boolean = attrs.hasHealth !== false && (attrs.hp?.max ?? 1) > 0;
  const hazardHardness: number = attrs.hardness ?? 0;
  const hazardStealthDC: number = attrs.stealth?.dc ?? attrs.stealth?.value ?? 0;
  const hazardStealthDetails: string = attrs.stealth?.details ?? '';
  // disable/reset/routine may be HTML strings or { value: string } objects
  function extractHtml(raw: unknown): string {
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object' && 'value' in (raw as object)) return String((raw as { value: unknown }).value ?? '');
    return '';
  }
  const hazardDisable: string = toEditableText(extractHtml(system?.details?.disable));
  const hazardReset: string = toEditableText(extractHtml(system?.details?.reset));
  const hazardRoutine: string = toEditableText(extractHtml(system?.details?.routine));

  if (isHazard) {
    return {
      id,
      entityType: 'hazard',
      name: newName,
      nameLower: newName.toLowerCase(),
      level,
      traits,
      size: 'med',
      rarity,
      packSource: 'custom',
      publication: 'Custom',
      blobSha: '',
      isComplex: hazardIsComplex || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        _id: id,
        name: newName,
        type: 'hazard',
        items: [],
        system: {
          details: {
            level: { value: level },
            publication: { title: 'Custom' },
            isComplex: hazardIsComplex,
            disable: hazardDisable,
            reset: hazardReset,
            routine: hazardRoutine,
          },
          attributes: {
            hp: hazardHasHealth ? { value: hp, max: hp } : undefined,
            ac: hazardHasHealth ? { value: ac } : undefined,
            hardness: hazardHardness,
            hasHealth: hazardHasHealth,
            stealth: { value: hazardStealthDC, details: hazardStealthDetails },
            immunities: immunities.length ? immunities.map(i => ({ type: i.type })) : undefined,
            resistances: resistances.length ? resistances.map(r => ({ type: r.type, value: r.value, exceptions: r.exceptions ? [r.exceptions] : undefined })) : undefined,
            weaknesses: weaknesses.length ? weaknesses.map(w => ({ type: w.type, value: w.value, exceptions: w.exceptions ? [w.exceptions] : undefined })) : undefined,
          },
          saves: hazardHasHealth ? { fortitude: { value: fort }, reflex: { value: ref }, will: { value: will } } : undefined,
          traits: { value: traits, rarity, size: { value: 'med' } },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      customData: {
        attacks: attacks.length ? attacks : undefined,
        abilities: abilities.length ? abilities : undefined,
        flavorText: flavorText || undefined,
        immunities: immunities.length ? immunities : undefined,
        resistances: resistances.length ? resistances : undefined,
        weaknesses: weaknesses.length ? weaknesses : undefined,
        hardness: hazardHardness || undefined,
        hasHealth: hazardHasHealth,
        stealthDC: hazardStealthDC || undefined,
        stealthDetails: hazardStealthDetails || undefined,
        isComplex: hazardIsComplex || undefined,
        disable: hazardDisable || undefined,
        reset: hazardReset || undefined,
        routine: hazardRoutine || undefined,
      },
    };
  }

  const landSpeed = speeds.find(s => s.type === 'land');
  const otherSpeeds = speeds.filter(s => s.type !== 'land').map(s => ({ type: s.type, value: s.value, label: s.type }));

  const pf2eImmunities = immunities.map(i => ({ type: i.type }));
  const pf2eResistances = resistances.map(r => ({ type: r.type, value: r.value, exceptions: r.exceptions ? [r.exceptions] : undefined }));
  const pf2eWeaknesses = weaknesses.map(w => ({ type: w.type, value: w.value, exceptions: w.exceptions ? [w.exceptions] : undefined }));
  const pf2eSenses = senses.map(s => ({ type: s.name, range: s.range }));

  // Capture family from source for NPCs (only reached in the non-hazard path)
  const family = normalizeFamily(system?.details?.creatureType);

  return {
    id,
    entityType: source.entityType,
    name: newName,
    nameLower: newName.toLowerCase(),
    level,
    traits,
    size,
    rarity,
    packSource: 'custom',
    publication: 'Custom',
    blobSha: '',
    family,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      _id: id,
      name: newName,
      type: 'npc',
      items: [],
      system: {
        details: {
          level: { value: level },
          publication: { title: 'Custom' },
          languages: { value: languages },
        },
        attributes: {
          hp: { value: hp, max: hp },
          ac: { value: ac },
          speed: landSpeed ? { value: landSpeed.value, otherSpeeds } : { value: 0, otherSpeeds },
          immunities: pf2eImmunities.length ? pf2eImmunities : undefined,
          resistances: pf2eResistances.length ? pf2eResistances : undefined,
          weaknesses: pf2eWeaknesses.length ? pf2eWeaknesses : undefined,
          allSaves: allSavesNote ? { value: allSavesNote } : undefined,
        },
        saves: { fortitude: { value: fort }, reflex: { value: ref }, will: { value: will } },
        abilities: {
          str: { mod: strMod }, dex: { mod: dexMod }, con: { mod: conMod },
          int: { mod: intMod }, wis: { mod: wisMod }, cha: { mod: chaMod },
        },
        perception: { mod: perception, senses: pf2eSenses },
        traits: { value: traits, rarity, size: { value: size } },
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    customData: {
      attacks: attacks.length ? attacks : undefined,
      abilities: abilities.length ? abilities : undefined,
      flavorText: flavorText || undefined,
      speeds: speeds.length ? speeds : undefined,
      senses: senses.length ? senses : undefined,
      immunities: immunities.length ? immunities : undefined,
      resistances: resistances.length ? resistances : undefined,
      weaknesses: weaknesses.length ? weaknesses : undefined,
      spellcasting: spellcasting.length ? spellcasting : undefined,
      skills: skills.length ? skills : undefined,
      languages: languages.length ? languages : undefined,
      allSavesNote: allSavesNote || undefined,
    },
  };
}
