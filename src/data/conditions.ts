/**
 * PF2E Condition Data
 *
 * Static condition definitions used by RulesSection (display) and
 * EncounterManager (condition picker). Pure data — no logic, no imports.
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
  'quickened', 'sickened', 'slowed', 'stunned', 'stupefied', 'persistent damage', 'wounded',
]);

// ── Full condition reference list (for RulesSection) ─────────────────────────

export const CONDITIONS: Array<{ name: string; valued?: boolean; desc: string }> = [
  {
    name: 'Concealed',
    desc: 'You are difficult to perceive due to mist, darkness, or similar obscurement. Creatures must succeed at a DC 5 flat check to target you with attacks or other effects that require targeting. You are not hidden — your location is still known.',
  },
  {
    name: 'Blinded',
    desc: 'You cannot see. You automatically critically fail Perception checks that require sight. You take a –2 circumstance penalty to attack rolls. All your targets are concealed from you (DC 5 flat check). You are immune to visual effects.',
  },
  {
    name: 'Clumsy',
    valued: true,
    desc: 'Your movements become clumsy and imprecise. You take a –1 circumstance penalty per value to Dexterity-based checks and DCs, including AC, Reflex saves, Acrobatics, Stealth, and Thievery.',
  },
  {
    name: 'Confused',
    desc: 'You are mentally befuddled and unable to determine friend from foe. You cannot use reactions. You are off-guard. You must spend all your actions to Strike or use a hostile action against a randomly determined creature within reach or range. If you have no valid targets, you are instead flat-footed and waste your actions. Any obvious threat (such as being attacked) can end the condition early.',
  },
  {
    name: 'Controlled',
    desc: 'Another creature dictates all your actions. You cannot use your own free will or reactions independently of the controlling creature.',
  },
  {
    name: 'Dazzled',
    desc: 'Your vision is compromised. All creatures and objects are concealed from you (DC 5 flat check to act against them).',
  },
  {
    name: 'Deafened',
    desc: 'You cannot hear. You automatically critically fail Perception checks that require hearing. You take a –2 circumstance penalty to Perception checks and initiative rolls. Spells you cast with a verbal component require a DC 5 flat check or the spell is lost.',
  },
  {
    name: 'Doomed',
    valued: true,
    desc: 'Death looms over you. Your dying value at which you die increases by your doomed value (normally you die at dying 4; doomed 1 means dying 3 kills you). When you die, you are reduced to 0 HP and your doomed value decreases by 1.',
  },
  {
    name: 'Drained',
    valued: true,
    desc: "Your body has lost vitality. You take a –1 circumstance penalty per value to Constitution-based checks and DCs, including Fortitude saves. Your maximum HP is also reduced by your level × the drained value. The condition reduces by 1 each time you get a full night's rest.",
  },
  {
    name: 'Dying',
    valued: true,
    desc: "You are bleeding out or otherwise at death's door. While dying, you are unconscious and must attempt a Recovery check (flat DC 10 + your dying value) each round. Success reduces dying by 1; failure increases it by 1; critical failure increases by 2. Reaching dying 4 (or the limit imposed by doomed) means you die.",
  },
  {
    name: 'Encumbered',
    desc: 'You are carrying more bulk than you can manage. You take a –1 circumstance penalty to attack rolls and AC, and your Speed is reduced by 10 feet.',
  },
  {
    name: 'Enfeebled',
    valued: true,
    desc: 'Your physical strength has been depleted. You take a –1 circumstance penalty per value to Strength-based checks and DCs, including melee attack rolls and Athletics.',
  },
  {
    name: 'Fascinated',
    desc: 'You are enthralled by something. You take a –2 circumstance penalty to Perception checks and skill checks, and you cannot use reactions. Any attempt to harm you or your allies, or any obvious threat, ends the condition.',
  },
  {
    name: 'Fatigued',
    desc: "You are exhausted. You take a –1 circumstance penalty to AC and all saving throws. You cannot use exploration activities that require a degree of exertion (such as Hustle). The condition ends after you get a full night's rest.",
  },
  {
    name: 'Fleeing',
    desc: 'You are compelled to run away. You must spend all your actions to escape the source of the fleeing condition, using movement actions (Stride, Fly, etc.) if possible. You cannot Delay or Ready.',
  },
  {
    name: 'Frightened',
    valued: true,
    desc: 'You are gripped by fear. You take a –1 circumstance penalty per value to all your checks and DCs. At the end of each of your turns, your frightened value decreases by 1.',
  },
  {
    name: 'Grabbed',
    desc: 'A creature or hazard is holding you in place. You are off-guard and immobilized. If you attempt a concentrate action, you must succeed at a DC 5 flat check or the action is lost.',
  },
  {
    name: 'Hidden',
    desc: 'Your presence is known but your exact location is not. A creature you are hidden from is flat-footed against your attacks, but must attempt a DC 11 flat check when targeting you. If they fail, the action is wasted. You can use the Hide or Sneak actions to become hidden; you become observed or undetected depending on the result.',
  },
  {
    name: 'Immobilized',
    desc: 'You cannot use any action with the move trait (Stride, Burrow, Fly, Swim, etc.). If you are immobilized by a physical restraint and an effect would move you, the effect is negated.',
  },
  {
    name: 'Invisible',
    desc: 'You cannot be seen. You are undetected by default. Even creatures that know your location treat you as hidden. You do not block line of sight. Detection requires senses other than vision.',
  },
  {
    name: 'Off-Guard',
    desc: 'You are distracted or unprepared. You take a –2 circumstance penalty to AC. Many situations cause this condition: flanking, being grabbed, becoming prone, etc. This is the Remaster term for the legacy "Flat-Footed."',
  },
  {
    name: 'Paralyzed',
    desc: 'Your body is frozen in place. You are off-guard and cannot act (no actions, no reactions). You automatically critically fail Strength and Dexterity checks and saves. Your Speed becomes 0.',
  },
  {
    name: 'Petrified',
    desc: 'You have been turned to stone. You are unaware of your surroundings. You cannot act. You do not age. You are immune to mental effects and most physical effects. Your AC changes to 9 + your level and your hardness is 8 + your level.',
  },
  {
    name: 'Persistent Damage',
    desc: 'You take a set amount of a given damage type at the end of each of your turns. After taking the damage, attempt a DC 15 flat check; on a success, the condition ends. Each time someone takes an action to assist you with recovery (e.g., applying water to persistent fire damage), you get a +2 circumstance bonus to this check.',
  },
  {
    name: 'Prone',
    desc: 'You are lying on the ground. You are off-guard. You take a –2 circumstance penalty to attack rolls. Melee attackers within reach gain a +2 circumstance bonus to hit; ranged attackers take a –2 circumstance penalty. Standing up (1 action) ends this condition.',
  },
  {
    name: 'Quickened',
    valued: false,
    desc: 'You gain 1 additional action at the start of each of your turns. This extra action can only be used for a specific type of action as specified by the effect that gave you the quickened condition (often limited to Stride or Strike).',
  },
  {
    name: 'Restrained',
    desc: 'You are entirely immobilised by a restraint. You are off-guard and cannot act (similar to grabbed, but you cannot even attempt to Escape as freely). You are immobilised. You take a –2 circumstance penalty to attack rolls.',
  },
  {
    name: 'Sickened',
    valued: true,
    desc: "You feel ill. You take a –1 circumstance penalty per value to all your checks and DCs. You cannot willingly consume food or drink. At the end of each of your turns, you can attempt a Fortitude save against the DC of the effect that sickened you; on a success, your sickened value decreases by 1.",
  },
  {
    name: 'Slowed',
    valued: true,
    desc: 'You are moving sluggishly. You lose a number of actions on each of your turns equal to your slowed value (minimum 1 action remaining). Slowed 1 removes 1 action; slowed 2 removes 2, etc.',
  },
  {
    name: 'Stunned',
    valued: true,
    desc: 'You have been temporarily incapacitated. At the start of each of your turns, reduce your stunned value by 1, then lose that many actions. For example, stunned 3 means at the start of your turn you lose 3 actions, then stunned reduces to 2, then 1, etc.',
  },
  {
    name: 'Stupefied',
    valued: true,
    desc: 'Your ability to think clearly is compromised. You take a –1 circumstance penalty per value to Intelligence-, Wisdom-, and Charisma-based checks and DCs, including Will saves, Perception, and all spellcasting. Any time you Cast a Spell, you must succeed at a flat check (DC = 5 + stupefied value) or the spell is lost.',
  },
  {
    name: 'Unconscious',
    desc: 'You are senseless. You cannot act (no actions, no reactions). You fall prone if able. You take a –4 circumstance penalty to AC and Perception checks. You are off-guard. You are blinded and deafened for many purposes. You can wake up (by taking damage, by a Check, or by meeting other criteria of the effect).',
  },
  {
    name: 'Undetected',
    desc: 'A creature has no idea where you are. You are hidden from them (your location is unknown), and they cannot target you at all without first Seeking. If they attempt to act against you, they must first guess your square (DC 11 flat check to pick the right square); they are off-guard for your attacks.',
  },
  {
    name: 'Wounded',
    valued: true,
    desc: "You have been brought back from the brink of death. If you would gain the dying condition, your dying value increases by 1 for each wounded value you have. The condition clears when you get a full night's rest or receive the Treat Wounds activity successfully.",
  },

  // ── Attitude conditions ───────────────────────────────────────────────────────
  {
    name: 'Friendly',
    desc: "The creature has a positive attitude toward you. It will accept reasonable requests and assist you within reason, but won't risk its life for you without cause.",
  },
  {
    name: 'Helpful',
    desc: 'The creature is willing to help you, even at risk to itself. It will follow reasonable requests and provide significant assistance.',
  },
  {
    name: 'Hostile',
    desc: 'The creature is intent on causing you harm. It will attack you if it can.',
  },
  {
    name: 'Indifferent',
    desc: 'The creature has no particular feelings toward you. It won\'t go out of its way to help or harm you.',
  },
  {
    name: 'Unfriendly',
    desc: 'The creature dislikes you and will try to avoid helping you. It may agree to requests only if compelled or bribed significantly.',
  },

  // ── Object conditions ──────────────────────────────────────────────────────
  {
    name: 'Broken',
    desc: 'An object is broken when it has been damaged to below its Broken Threshold. A broken object still exists but no longer functions for its normal use. Broken objects can still be repaired.',
  },
];
