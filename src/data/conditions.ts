/**
 * PF2E Condition Data
 *
 * Static condition definitions used by RulesSection (display) and
 * EncounterManager (condition picker). Pure data — no logic, no imports.
 *
 * Exports:
 *  CONDITIONS           – full condition list (descriptions + stat effects)
 *  CONDITION_INFO       – O(1) lookup map: lowercase name → { desc, statEffect }
 *  CONDITION_CATEGORIES – grouped categories for the picker UI
 *  VALUED_CONDITIONS    – set of lowercase names that carry a numeric value
 */

// ── Condition categories for the picker UI ────────────────────────────────────

export interface ConditionCategory {
  label: string;
  conditions: string[];
}

export const CONDITION_CATEGORIES: ConditionCategory[] = [
  { label: 'Circumstantial', conditions: ['Grabbed', 'Prone', 'Off-Guard', 'Immobilized', 'Restrained', 'Persistent Damage'] },
  { label: 'Status',         conditions: ['Frightened', 'Sickened', 'Fatigued', 'Encumbered'] },
  { label: 'Ability Scores', conditions: ['Clumsy', 'Enfeebled', 'Drained', 'Stupefied'] },
  { label: 'Action Economy', conditions: ['Stunned', 'Slowed', 'Quickened'] },
  { label: 'Death / Dying',  conditions: ['Dying', 'Wounded', 'Doomed', 'Unconscious'] },
  { label: 'Detection',      conditions: ['Concealed', 'Hidden', 'Undetected', 'Invisible'] },
  { label: 'Senses',         conditions: ['Blinded', 'Dazzled', 'Deafened', 'Fascinated'] },
  { label: 'Disabled',       conditions: ['Controlled', 'Confused', 'Fleeing', 'Paralyzed', 'Petrified'] },
];

// ── Conditions that take a numeric value ──────────────────────────────────────

export const VALUED_CONDITIONS = new Set([
  'clumsy', 'doomed', 'drained', 'dying', 'enfeebled', 'frightened',
  'sickened', 'slowed', 'stunned', 'stupefied', 'wounded',
]);

// ── Full condition reference list (for RulesSection) ─────────────────────────
// `statEffect` — short summary of tracker stat adjustments (shown inline in the
// Rules reference so the Help modal can link here instead of duplicating a table).

export const CONDITIONS: Array<{ name: string; valued?: boolean; desc: string; statEffect?: string }> = [
  {
    name: 'Concealed',
    desc: 'You are difficult for one or more creatures to see due to thick fog or some other obscuring feature. While concealed, you can still be observed, but you\'re tougher to target. A creature that you\'re concealed from must succeed at a DC 5 flat check when targeting you with an attack, spell, or other effect or it fails to affect you. Area effects are not subject to this flat check.',
  },
  {
    name: 'Blinded',
    desc: 'You can\'t see. All normal terrain is difficult terrain to you. You can\'t detect anything using vision. You automatically critically fail Perception checks that require you to be able to see, and if vision is your only precise sense, you take a –4 status penalty to Perception checks. You are immune to visual effects. Blinded overrides Dazzled.',
    statEffect: '–4 status Perception',
  },
  {
    name: 'Clumsy',
    valued: true,
    desc: 'Your movements become clumsy and inexact. You take a status penalty equal to the condition value to Dexterity-based rolls and DCs, including AC, Reflex saves, ranged attack rolls, and skill checks using Acrobatics, Stealth, and Thievery.',
    statEffect: '–X status AC, –X status Reflex; –X status attack (Dex-based)',
  },
  {
    name: 'Confused',
    desc: 'You don\'t have your wits about you, and you attack wildly. You are off-guard, you don\'t treat anyone as your ally, and you can\'t Delay, Ready, or use reactions. You use all your actions to Strike or cast offensive cantrips, with targets determined randomly by the GM. If you have no other viable targets, you target yourself, automatically hitting but not scoring a critical hit. Each time you take damage from an attack or spell, you can attempt a DC 11 flat check to recover from your confusion and end the condition.',
    statEffect: '–2 circumstance AC (Off-Guard)',
  },
  {
    name: 'Controlled',
    desc: 'You have been commanded, magically dominated, or otherwise had your will subverted. The controller dictates how you act and can make you use any of your actions, including attacks, reactions, or even Delay. The controller usually doesn\'t have to spend their own actions when controlling you.',
  },
  {
    name: 'Dazzled',
    desc: 'Your eyes are overstimulated or your vision is swimming. If vision is your only precise sense, all creatures and objects are concealed from you.',
    statEffect: '–2 status attack (flat-check approximation)',
  },
  {
    name: 'Deafened',
    desc: 'You can\'t hear. You automatically critically fail Perception checks that require you to be able to hear. You take a –2 status penalty to Perception checks for initiative and checks that involve sound but also rely on other senses. If you perform an action that has the auditory trait, you must succeed at a DC 5 flat check or the action is lost; attempt the check after spending the action but before any effects are applied. You are immune to auditory effects while deafened.',
    statEffect: '–2 status Perception',
  },
  {
    name: 'Doomed',
    valued: true,
    desc: 'Your soul has been gripped by a powerful force that calls you closer to death. The dying value at which you die is reduced by your doomed value. If your maximum dying value is reduced to 0, you instantly die. When you die, you\'re no longer doomed. Your doomed value decreases by 1 each time you get a full night\'s rest.',
  },
  {
    name: 'Drained',
    valued: true,
    desc: 'Your health and vitality have been depleted as you\'ve lost blood, life force, or some other essence. You take a status penalty equal to your drained value on Constitution-based rolls and DCs, such as Fortitude saves. You also lose a number of Hit Points equal to your level (minimum 1) times the drained value, and your maximum Hit Points are reduced by the same amount. Each time you get a full night\'s rest, your drained value decreases by 1.',
    statEffect: '–X status Fortitude',
  },
  {
    name: 'Dying',
    valued: true,
    desc: 'You are bleeding out or otherwise at death\'s door. While you have this condition, you are unconscious. If it ever reaches dying 4, you die. When you\'re dying, you must attempt a recovery check at the start of your turn each round to determine whether you get better or worse. Your dying condition increases by 1 if you take damage while dying, or by 2 if you take damage from an enemy\'s critical hit or a critical failure on your save. Any time you lose the dying condition, you gain the Wounded 1 condition (or increase your wounded value by 1).',
  },
  {
    name: 'Encumbered',
    desc: 'You are carrying more weight than you can manage. While encumbered, you\'re Clumsy 1 and take a 10-foot penalty to all your Speeds (minimum 5 feet).',
    statEffect: 'Clumsy 1 (–1 status AC, Reflex, Dex-based attacks); –10 ft Speed',
  },
  {
    name: 'Enfeebled',
    valued: true,
    desc: 'You\'re physically weakened. You take a status penalty equal to the condition value to Strength-based rolls and DCs, including Strength-based melee attack rolls, Strength-based damage rolls, and Athletics checks.',
    statEffect: '–X status attack & damage (Str-based melee/thrown)',
  },
  {
    name: 'Fascinated',
    desc: 'You\'re compelled to focus your attention on something, distracting you from whatever else is going on around you. You take a –2 status penalty to Perception and skill checks, and you can\'t use concentrate actions unless they (or their intended consequences) are related to the subject of your fascination, as determined by the GM. This condition ends if a creature uses hostile actions against you or any of your allies.',
    statEffect: '–2 status Perception',
  },
  {
    name: 'Fatigued',
    desc: 'You\'re tired and can\'t summon much energy. You take a –1 status penalty to AC and saving throws. You can\'t use exploration activities performed while traveling. You recover from fatigue after a full night\'s rest.',
    statEffect: '–1 status AC, Fort, Ref, Will',
  },
  {
    name: 'Fleeing',
    desc: 'You\'re forced to run away due to fear or some other compulsion. On your turn, you must spend each of your actions trying to escape the source of the fleeing condition as expediently as possible (such as by using move actions to flee, or opening doors barring your escape). You can\'t Delay or Ready while fleeing.',
  },
  {
    name: 'Frightened',
    valued: true,
    desc: 'You\'re gripped by fear and struggle to control your nerves. You take a status penalty equal to this value to all your checks and DCs. Unless specified otherwise, at the end of each of your turns, the value of your frightened condition decreases by 1.',
    statEffect: '–X status AC, Fort, Ref, Will, Perception, attack · auto-reduces each turn',
  },
  {
    name: 'Grabbed',
    desc: 'You\'re held in place by another creature, giving you the off-guard and immobilized conditions. If you attempt a manipulate action while grabbed, you must succeed at a DC 5 flat check or it is lost; roll the check after spending the action, but before any effects are applied.',
    statEffect: '–2 circumstance AC (Off-Guard); manipulate actions need DC 5 flat check',
  },
  {
    name: 'Hidden',
    desc: 'While you\'re hidden from a creature, that creature knows the space you\'re in but can\'t tell precisely where you are. A creature you\'re hidden from is off-guard to you, and it must succeed at a DC 11 flat check when targeting you with an attack, spell, or other effect or it fails to affect you. Area effects aren\'t subject to this flat check. A creature might be able to use the Seek action to try to observe you.',
  },
  {
    name: 'Immobilized',
    desc: 'You are incapable of movement. You can\'t use any actions that have the move trait. If you\'re immobilized by something holding you in place and an external force would move you out of your space, the force must succeed at a check against either the DC of the effect holding you in place or the relevant defense of the monster holding you in place.',
  },
  {
    name: 'Invisible',
    desc: 'You can\'t be seen. You\'re undetected to everyone. Creatures can Seek to detect you; if a creature succeeds at its Perception check against your Stealth DC, you become hidden to that creature until you Sneak to become undetected again. If you become invisible while someone can already see you, you start out hidden to them until you successfully Sneak. You can\'t become observed while invisible except via special abilities or magic.',
  },
  {
    name: 'Off-Guard',
    desc: 'You\'re distracted or otherwise unable to focus your full attention on defense. You take a –2 circumstance penalty to AC. Some effects give you the off-guard condition only to certain creatures or against certain attacks. If a rule doesn\'t specify that the condition applies only to certain circumstances, it applies to all of them. This is the Remaster term for the legacy "Flat-Footed."',
    statEffect: '–2 circumstance AC',
  },
  {
    name: 'Paralyzed',
    desc: 'You\'re frozen in place. You have the off-guard condition and can\'t act except to Recall Knowledge and use actions that require only your mind (as determined by the GM). Your senses still function, but only in the areas you can perceive without moving, so you can\'t Seek.',
    statEffect: '–2 circumstance AC (Off-Guard)',
  },
  {
    name: 'Petrified',
    desc: 'You have been turned to stone. You can\'t act, nor can you sense anything. You become an object with a Bulk double your normal Bulk (typically 12 for a Medium creature or 6 for a Small creature), AC 9, Hardness 8, and the same current Hit Points you had when alive. You don\'t have a Broken Threshold. When petrified ends, you have the same HP you had as a statue. If the statue is destroyed, you immediately die. While petrified, your mind and body are in stasis, so you don\'t age or notice the passing of time.',
  },
  {
    name: 'Persistent Damage',
    desc: 'You are taking damage from an ongoing effect. This appears as "X persistent [type] damage." You take the damage at the end of each of your turns as long as you have the condition, rolling any damage dice anew each time. After you take persistent damage, roll a DC 15 flat check to see if you recover. If you succeed, the condition ends.',
  },
  {
    name: 'Prone',
    desc: 'You\'re lying on the ground. You are off-guard and take a –2 circumstance penalty to attack rolls. The only move actions you can use while prone are Crawl and Stand. Standing up ends the prone condition. You can Take Cover while prone to gain greater cover against ranged attacks, granting a +4 circumstance bonus to AC against ranged attacks (but you remain off-guard). If knocked prone while Climbing or Flying, you fall. You can\'t be knocked prone when Swimming.',
    statEffect: '–2 circumstance AC (Off-Guard); –2 circumstance attack',
  },
  {
    name: 'Quickened',
    valued: false,
    desc: 'You\'re able to act more quickly. You gain 1 additional action at the start of your turn each round. Many effects that make you quickened require you use this extra action only in certain ways. If you become quickened from multiple sources, you can use the extra action for any single action allowed by any of those effects. Because quickened takes effect at the start of your turn, you don\'t immediately gain actions if you become quickened during your turn.',
  },
  {
    name: 'Restrained',
    desc: 'You\'re tied up and can barely move, or a creature has you pinned. You have the off-guard and immobilized conditions, and you can\'t use any attack or manipulate actions except to attempt to Escape or Force Open your bonds. Restrained overrides Grabbed.',
    statEffect: '–2 circumstance AC (Off-Guard); attack/manipulate actions blocked',
  },
  {
    name: 'Sickened',
    valued: true,
    desc: 'You feel ill. You take a status penalty equal to this value on all your checks and DCs. You can\'t willingly ingest anything—including elixirs and potions—while sickened. You can spend a single action retching in an attempt to recover, which lets you immediately attempt a Fortitude save against the DC of the effect that made you sickened. On a success, you reduce your sickened value by 1 (or by 2 on a critical success).',
    statEffect: '–X status AC, Fort, Ref, Will, Perception, attack',
  },
  {
    name: 'Slowed',
    valued: true,
    desc: 'You have fewer actions. When you regain your actions at the start of your turn, reduce the number of actions regained by your slowed value. Because you regain actions at the start of your turn, you don\'t immediately lose actions if you become slowed during your turn.',
  },
  {
    name: 'Stunned',
    valued: true,
    desc: 'You\'ve become senseless. You can\'t act. Stunned usually includes a value indicating how many total actions you lose, possibly over multiple turns. Each time you regain actions, reduce the number you regain by your stunned value, then reduce your stunned value by the number of actions you lost. For example, stunned 4 causes you to lose all 3 actions on your first turn (reducing to stunned 1), then lose 1 more action the next turn. Stunned overrides Slowed.',
  },
  {
    name: 'Stupefied',
    valued: true,
    desc: 'Your thoughts and instincts are clouded. You take a status penalty equal to this value on Intelligence-, Wisdom-, and Charisma-based rolls and DCs, including Will saving throws, spell attack modifiers, spell DCs, and skill checks using these attribute modifiers. Any time you attempt to Cast a Spell while stupefied, the spell is disrupted unless you succeed at a flat check with a DC equal to 5 + your stupefied value.',
    statEffect: '–X status Will, Perception',
  },
  {
    name: 'Unconscious',
    desc: 'You\'re sleeping or have been knocked out. You can\'t act. You take a –4 status penalty to AC, Perception, and Reflex saves, and you have the blinded and off-guard conditions. When you gain this condition, you fall prone and drop items you\'re holding unless the effect states otherwise. If you\'re unconscious because you\'re dying, you can\'t wake up while you have 0 Hit Points. If restored to 1 Hit Point or more, you lose the dying and unconscious conditions and can act normally on your next turn.',
    statEffect: '–4 status AC, Ref, Perception; –2 circumstance AC (Off-Guard)',
  },
  {
    name: 'Undetected',
    desc: 'When you are undetected by a creature, that creature can\'t see you at all, has no idea what space you occupy, and can\'t target you, though you still can be affected by abilities that target an area. When you\'re undetected by a creature, that creature is off-guard to you. A creature you\'re undetected by can guess which square you\'re in to try targeting you—this works like targeting a hidden creature (DC 11 flat check), but the flat check and attack roll are rolled in secret by the GM.',
  },
  {
    name: 'Wounded',
    valued: true,
    desc: 'You have been seriously injured. If you lose the dying condition and do not already have the wounded condition, you become wounded 1. If you already have it when you lose dying, your wounded value increases by 1. If you gain the dying condition while wounded, increase your dying value by your wounded value. The wounded condition ends if someone successfully restores Hit Points to you using Treat Wounds, or if you are restored to full Hit Points and rest for 10 minutes.',
  },

  // ── Attitude conditions ───────────────────────────────────────────────────────
  {
    name: 'Friendly',
    desc: 'A creature that is friendly to a character likes that character. It is likely to agree to Requests from that character as long as they are simple, safe, and don\'t cost too much to fulfill. If the character (or one of their allies) uses hostile actions against the creature, the creature gains a worse attitude condition depending on the severity of the hostile action.',
  },
  {
    name: 'Helpful',
    desc: 'A creature that is helpful to a character wishes to actively aid that character. It will accept reasonable Requests from that character, as long as such requests aren\'t at the expense of the helpful creature\'s goals or quality of life. If the character (or one of their allies) uses a hostile action against the creature, the creature gains a worse attitude condition.',
  },
  {
    name: 'Hostile',
    desc: 'A creature hostile to a character actively seeks to harm that character. It doesn\'t necessarily attack, but it won\'t accept Requests from the character.',
  },
  {
    name: 'Indifferent',
    desc: 'A creature that is indifferent to a character doesn\'t really care one way or the other about that character. Assume a creature\'s attitude to a given character is indifferent unless specified otherwise.',
  },
  {
    name: 'Unfriendly',
    desc: 'A creature that is unfriendly to a character dislikes and distrusts that character. The unfriendly creature won\'t accept Requests from the character.',
  },

  // ── Object conditions ──────────────────────────────────────────────────────
  {
    name: 'Broken',
    desc: 'An object is broken when damage has reduced its Hit Points to equal or less than its Broken Threshold. A broken object can\'t be used for its normal function, nor does it grant bonuses—with the exception of armor. Broken armor still grants its item bonus to AC, but imparts a status penalty to AC: –1 for light, –2 for medium, or –3 for heavy. A broken item still imposes penalties and limitations normally incurred by carrying, holding, or wearing it.',
  },
];

// ── O(1) lookup: lowercase condition name → { desc, statEffect } ──────────────
// Derived from CONDITIONS; centralised here so no consumer needs to rebuild it.

export const CONDITION_INFO: ReadonlyMap<string, { desc: string; statEffect?: string }> = new Map(
  CONDITIONS.map(c => [c.name.toLowerCase(), { desc: c.desc, statEffect: c.statEffect }]),
);
