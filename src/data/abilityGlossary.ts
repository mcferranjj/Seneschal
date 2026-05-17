/**
 * Bestiary Ability Glossary descriptions.
 * Source: Pathfinder Monster Core (ORC license).
 * Generated from pf2e system en.json PF2E.NPC.Abilities.Glossary keys.
 * Keys are exact item.name values from the bestiary-ability-glossary-srd pack.
 */

import type { AbilityActionType } from '../types/encounter';

/**
 * A variable slot in a generic ability's description template.
 * 'dc'     → the user should enter a DC number (auto-suggestions provided)
 * 'damage' → the user should enter a damage expression (auto-suggestions provided)
 * 'text'   → a free-text field (size category, type, distance, etc.)
 * 'size'   → a dropdown of the six PF2e creature sizes
 * 'strike' → a dropdown populated from the creature's existing strikes
 */
export interface GenericAbilityVariable {
  key: string;
  label: string;
  type: 'dc' | 'damage' | 'text' | 'size' | 'strike';
  placeholder?: string;
}

/**
 * A generic monster ability that can be inserted into the creature wizard.
 * `descriptionTemplate` uses `{key}` tokens matching `variables[].key` as
 * placeholders that the user fills in before the ability is inserted.
 * Abilities with no variables have an empty `variables` array.
 *
 * `shortDescriptionTemplate` is a compact, stat-block-style blurb (e.g.
 * "{size} or smaller, DC {dc} basic Reflex save") shown in the creature
 * view instead of the full rules text. Leave empty for abilities with no
 * user-configurable values — those show no description at all.
 */
export interface GenericAbilityDef {
  name: string;
  actionType: AbilityActionType;
  descriptionTemplate: string;
  shortDescriptionTemplate: string;
  variables: GenericAbilityVariable[];
}

/**
 * Canonical list of generic monster abilities from the PF2e Bestiary Ability
 * Glossary (Monster Core). Only real, published abilities are included.
 */
export const GENERIC_ABILITIES: GenericAbilityDef[] = [
  {
    name: 'All-Around Vision',
    actionType: 'passive',
    descriptionTemplate: 'This monster can see in all directions simultaneously and therefore can\'t be flanked.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Aquatic Ambush',
    actionType: 'single',
    descriptionTemplate: 'Requirements The monster is hiding in water and a creature that hasn\'t detected it is within {distance} feet; Effect The monster moves up to its swim Speed + 10 feet toward the triggering creature, traveling on water and on land. Once the creature is in reach, the monster makes a Strike against it. The creature is off-guard against this Strike.',
    shortDescriptionTemplate: '{distance} feet',
    variables: [
      { key: 'distance', label: 'Range (feet)', type: 'text', placeholder: 'e.g. 30' },
    ],
  },
  {
    name: 'Aura',
    actionType: 'passive',
    descriptionTemplate: 'A monster\'s aura automatically affects everything within a specified emanation around that monster. The monster doesn\'t need to spend actions on the aura; rather, the aura\'s effects are applied at specific times, such as when a creature ends its turn within the aura or when creatures enter the aura. If an aura does nothing but deal damage, its entry lists only the radius, damage, and saving throw. Such auras deal this damage to a creature when the creature enters the aura and when a creature starts its turn in the aura. A creature can take damage from the aura only once per round. The GM might determine that a monster\'s aura doesn\'t affect its own allies. For example, a creature might be immune to a monster\'s frightful presence if they have been around each other for a long time.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'At-Will Spells',
    actionType: 'passive',
    descriptionTemplate: 'The monster can cast its at-will spells any number of times without using up spell slots.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Attack of Opportunity',
    actionType: 'reaction',
    descriptionTemplate: 'Trigger A creature within the monster\'s reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it\'s using. Effect The monster attempts a melee Strike against the triggering creature. If the attack is a critical hit and the trigger was a manipulate action, the monster disrupts that action. This Strike doesn\'t count toward the monster\'s multiple attack penalty, and its multiple attack penalty doesn\'t apply to this Strike.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Buck',
    actionType: 'reaction',
    descriptionTemplate: 'Most monsters that serve as mounts can attempt to buck off unwanted or annoying riders, but most mounts won\'t use this reaction against a trusted creature unless they\'re spooked or mistreated. Trigger A creature Mounts or uses the Command an Animal action while riding the monster; Effect The triggering creature must succeed at a Reflex saving throw against DC {dc} or fall off the creature and land prone. If the save is a critical failure, the triggering creature also takes 1d6 bludgeoning damage in addition to the normal damage for the fall.',
    shortDescriptionTemplate: 'DC {dc} Reflex save',
    variables: [
      { key: 'dc', label: 'Reflex DC', type: 'dc' },
    ],
  },
  {
    name: 'Catch Rock',
    actionType: 'reaction',
    descriptionTemplate: 'Requirements The monster must have a free hand but can Release anything it\'s holding as part of this reaction. Trigger The monster is targeted with a thrown rock Strike or a rock would fall on the monster. Effect The monster gains a +4 circumstance bonus to its AC against the triggering attack or to any defense against the falling rock. If the attack misses or the monster successfully defends against the falling rock, the monster catches the rock, takes no damage, and is now holding the rock.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Change Shape',
    actionType: 'single',
    descriptionTemplate: 'The monster changes its shape indefinitely. It can use this action again to return to its natural shape or adopt a new shape. Unless otherwise noted, a monster cannot use Change Shape to appear as a specific individual. Using Change Shape counts as creating a disguise for the Impersonate use of Deception. The monster\'s transformation automatically defeats Perception DCs to determine whether the creature is a member of the ancestry or creature type into which it transformed, and it gains a +4 status bonus to its Deception DC to prevent others from seeing through its disguise. Change Shape abilities specify what shapes the monster can adopt. The monster doesn\'t gain any special abilities of the new shape, only its physical form. For example, in each shape, it replaces its normal Speeds and Strikes, and might potentially change its senses or size. Any changes are listed in its stat block.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Coven',
    actionType: 'passive',
    descriptionTemplate: 'This monster can form a coven with two or more other creatures who also have the coven ability. This involves performing an 8-hour ceremony with all prospective coven members. After the coven is formed, each of its members gains elite adjustments, adjusting their levels accordingly. Coven members can sense other members\' locations and conditions by spending a single action, which has the concentrate trait, and can sense what another coven member is sensing as a two-action activity, which has the concentrate trait as well. Covens also grant spells and rituals to their members, but these can be cast only in cooperation between three coven members who are all within 30 feet of one another. A coven member can contribute to a coven spell with a single action that has the concentrate trait. If two coven members have contributed these actions within the last round, a third member can cast a coven spell on her turn by spending the normal spellcasting actions. A coven can cast its coven spells an unlimited number of times but can cast only one coven spell each round. All covens grant the 8th-rank cursed metamorphosis spell and all the following spells, which the coven can cast at any rank up to 5th: augury, charm, clairaudience, clairvoyance, dream message, illusory disguise, illusory scene, scouting eye, and talking corpse. Individual creatures with the coven ability also grant additional spells to any coven they join. A coven can also cast the control weather ritual, with a DC of 23 instead of the standard DC. If a coven member\'s departure or death brings the coven below three members, the remaining members keep their elite adjustments for 24 hours, but without enough members to contribute the necessary actions, they can\'t cast coven spells.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Constrict',
    actionType: 'single',
    descriptionTemplate: 'The monster deals {damage} to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with DC {dc}.',
    shortDescriptionTemplate: '{damage}, DC {dc} basic Fortitude save',
    variables: [
      { key: 'damage', label: 'Damage', type: 'damage' },
      { key: 'dc', label: 'Fortitude DC', type: 'dc' },
    ],
  },
  {
    name: 'Constant Spells',
    actionType: 'passive',
    descriptionTemplate: 'A constant spell affects the monster without the monster needing to cast it, and its duration is unlimited. If a constant spell gets counteracted, the monster can reactivate it by spending the normal spellcasting actions the spell requires.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Disease',
    actionType: 'passive',
    descriptionTemplate: 'When a creature is exposed to a monster\'s disease, it attempts a Fortitude save or succumbs to the disease. The level of a disease is the level of the monster inflicting the disease. The disease follows the rules for afflictions.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Darkvision',
    actionType: 'passive',
    descriptionTemplate: 'A monster with darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. Some forms of magical darkness, such as a 4th-level darkness spell, block normal darkvision. A monster with greater darkvision, however, can see through even these forms of magical darkness.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Engulf',
    actionType: 'two',
    descriptionTemplate: 'The monster Strides up to double its Speed and can move through the spaces of any creatures in its path. Any creature of the monster\'s size or smaller whose space the monster moves through can attempt a Reflex save with DC {dc} to avoid being engulfed. A creature unable to act automatically critically fails this save. If a creature succeeds at its save, it can choose to be either pushed aside (out of the monster\'s path) or pushed in front of the monster to the end of the monster\'s movement. The monster can attempt to Engulf the same creature only once in a single use of Engulf. The monster can contain as many creatures as can fit in its space. A creature that fails its save is pulled into the monster\'s body. It is grabbed, is slowed 1, and has to hold its breath or start suffocating. The creature takes {damage} when first engulfed and at the end of each of its turns while it\'s engulfed. An engulfed creature can get free by Escaping against the listed Escape DC. An engulfed creature can attack the monster engulfing it, but only with unarmed attacks or with weapons of light Bulk or less. The engulfing creature is off-guard against the attack. If the monster takes piercing or slashing damage equaling or exceeding {rupture} from a single attack or spell, the engulfed creature cuts itself free. A creature that gets free by either method can immediately breathe and exits the engulfing monster\'s space. If the monster dies, all creatures it has engulfed are automatically released as the monster\'s form loses cohesion.',
    shortDescriptionTemplate: 'DC {dc} Reflex save, {damage} per turn, Rupture {rupture}',
    variables: [
      { key: 'dc', label: 'Reflex DC', type: 'dc' },
      { key: 'damage', label: 'Damage (per turn)', type: 'damage' },
      { key: 'rupture', label: 'Rupture Damage', type: 'text', placeholder: 'e.g. 20' },
    ],
  },
  {
    name: 'Fast Healing',
    actionType: 'passive',
    descriptionTemplate: 'A monster with this ability regains {hp} Hit Points each round at the beginning of its turn.',
    shortDescriptionTemplate: '{hp}',
    variables: [
      { key: 'hp', label: 'HP per Round', type: 'text', placeholder: 'e.g. 10' },
    ],
  },
  {
    name: 'Ferocity',
    actionType: 'reaction',
    descriptionTemplate: 'Trigger The monster is reduced to 0 HP; Effect The monster avoids being knocked out and remains at 1 HP, but its wounded value increases by 1. When it is wounded 3, it can no longer use this ability.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Form Up',
    actionType: 'single',
    descriptionTemplate: 'The troop chooses one of the squares it currently occupies and redistributes its squares to any configuration in which all squares are contiguous and within 15 feet of the chosen square. The troop can\'t share its space with other creatures.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Frightful Presence',
    actionType: 'passive',
    descriptionTemplate: 'A creature that first enters the area must attempt a Will save against DC {dc}. Regardless of the result of the saving throw, the creature is temporarily immune to this monster\'s Frightful Presence for 1 minute. Critical Success The creature is unaffected by the presence. Success The creature is frightened 1. Failure The creature is frightened 2. Critical Failure The creature is frightened 4.',
    shortDescriptionTemplate: 'DC {dc} Will save, Frightened 1–4',
    variables: [
      { key: 'dc', label: 'Will DC', type: 'dc' },
    ],
  },
  {
    name: 'Grab',
    actionType: 'single',
    descriptionTemplate: 'Requirements The monster\'s last action was a successful Strike that lists Grab in its damage entry, or the monster has a creature grabbed or restrained; Effect If used after a Strike, the monster attempts to Grapple the creature using the body part it attacked with. This attempt neither applies nor counts toward the creature\'s multiple attack penalty. The monster can instead use Grab and choose one creature it\'s grabbing or restraining with an appendage that has Grab to automatically extend that condition to the end of the monster\'s next turn.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Greater Constrict',
    actionType: 'single',
    descriptionTemplate: 'The monster deals {damage} to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with DC {dc}. A creature that fails this save falls unconscious, and a creature that succeeds is then temporarily immune to falling unconscious from Greater Constrict for 1 minute.',
    shortDescriptionTemplate: '{damage}, DC {dc} basic Fortitude save',
    variables: [
      { key: 'damage', label: 'Damage', type: 'damage' },
      { key: 'dc', label: 'Fortitude DC', type: 'dc' },
    ],
  },
  {
    name: 'Greater Darkvision',
    actionType: 'passive',
    descriptionTemplate: 'A creature with greater darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. A creature with greater darkvision can see through even forms of magical darkness.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Improved Grab',
    actionType: 'free',
    descriptionTemplate: 'The monster can use Grab as a free action triggered by a hit with its initial attack. A monster with Improved Grab still needs to spend an action to extend the duration for creatures it already has grabbed.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Improved Knockdown',
    actionType: 'free',
    descriptionTemplate: 'The monster can use Knockdown as a free action triggered by a hit with its initial attack.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Improved Push',
    actionType: 'free',
    descriptionTemplate: 'The monster can use Push as a free action triggered by a hit with its initial attack.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Knockdown',
    actionType: 'single',
    descriptionTemplate: 'Requirements The monster\'s last action was a successful Strike that lists Knockdown in its damage entry; Effect The monster attempts to Trip the creature. This attempt neither applies nor counts toward the monster\'s multiple attack penalty.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Lifesense',
    actionType: 'passive',
    descriptionTemplate: 'Lifesense (imprecise) {range} feet. Lifesense allows a monster to sense the vital essence of living and undead creatures within the listed range. The sense can distinguish between the vitality energy animating living creatures and the void energy animating undead creatures, much as sight distinguishes colors.',
    shortDescriptionTemplate: 'imprecise {range} feet',
    variables: [
      { key: 'range', label: 'Range (feet)', type: 'text', placeholder: 'e.g. 60' },
    ],
  },
  {
    name: 'Light Blindness',
    actionType: 'passive',
    descriptionTemplate: 'When first exposed to bright light, the monster is Blinded until the end of its next turn. After this exposure, light doesn\'t blind the monster again until after it spends 1 hour in darkness. However, as long as the monster is in an area of bright light, it\'s Dazzled.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Low-Light Vision',
    actionType: 'passive',
    descriptionTemplate: 'The monster can see in dim light as though it were bright light, so it ignores the Concealed condition due to dim light.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Poison',
    actionType: 'passive',
    descriptionTemplate: 'When a creature is exposed to a monster\'s poison, it attempts a Fortitude save to avoid becoming poisoned. The level of a poison is the level of the monster inflicting the poison. The poison follows the rules for afflictions.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Negative Healing',
    actionType: 'passive',
    descriptionTemplate: 'A creature with void healing draws health from void energy rather than vitality energy. It is damaged by vitality damage and is not healed by vitality healing effects. It does not take void damage, and it is healed by void effects that heal undead.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'No Breath',
    actionType: 'passive',
    descriptionTemplate: 'The monster doesn\'t breathe and is immune to effects that require breathing.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Power Attack',
    actionType: 'single',
    descriptionTemplate: 'Frequency once per round. Effect The monster makes a melee Strike. This counts as two attacks when calculating the monster\'s multiple attack penalty. If this Strike hits, the monster deals an extra die of weapon damage.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Pull',
    actionType: 'single',
    descriptionTemplate: 'Requirements The monster\'s last action was a success with a Strike that lists Pull in its damage entry; Effect The monster attempts to Reposition the creature, moving it closer to the monster. This attempt neither applies nor counts toward the monster\'s multiple attack penalty. If Pull lists a distance, change the distance the creature is pulled on a success to that distance.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Push',
    actionType: 'single',
    descriptionTemplate: 'Requirements The monster\'s last action was a successful Strike that lists Push in its damage entry; Effect The monster attempts to Shove the creature. This attempt neither applies nor counts toward the monster\'s multiple attack penalty. If Push lists a distance, change the distance the creature is pushed on a success to that distance.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Reactive Strike',
    actionType: 'reaction',
    descriptionTemplate: 'Trigger A creature within the monster\'s reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it\'s using; Effect The monster attempts a melee Strike against the triggering creature. If the attack is a critical hit and the trigger was a manipulate action, the monster disrupts that action. This Strike doesn\'t count toward the monster\'s multiple attack penalty, and its multiple attack penalty doesn\'t apply to this Strike.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Regeneration',
    actionType: 'passive',
    descriptionTemplate: 'This monster regains {hp} Hit Points each round at the beginning of its turn. Its dying condition never increases beyond dying 3 as long as its regeneration is active. However, if it takes damage of a type listed in the regeneration entry, its regeneration deactivates until the end of its next turn. Deactivate the regeneration before applying any damage of a listed type, since that damage might kill the monster by bringing it to dying 4.',
    shortDescriptionTemplate: '{hp}',
    variables: [
      { key: 'hp', label: 'HP per Round', type: 'text', placeholder: 'e.g. 15' },
    ],
  },
  {
    name: 'Rend',
    actionType: 'single',
    descriptionTemplate: 'A Rend entry lists a Strike the monster has. Requirements The monster hit the same enemy with two consecutive Strikes of the listed type in the same round; Effect The monster automatically deals that Strike\'s damage again to the enemy.',
    shortDescriptionTemplate: '{strikeType}',
    variables: [
      { key: 'strikeType', label: 'Strike Type', type: 'text', placeholder: 'e.g. claw' },
    ],
  },
  {
    name: 'Retributive Strike',
    actionType: 'reaction',
    descriptionTemplate: 'Trigger An enemy damages the monster\'s ally, and both are within 15 feet of the monster. Effect The ally gains resistance to all damage against the triggering damage equal to 2 + the monster\'s level. If the foe is within reach, the monster makes a melee Strike against it.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Scent',
    actionType: 'passive',
    descriptionTemplate: 'Scent (imprecise) {range} feet. Scent involves sensing creatures or objects by smell and is usually a vague sense. The range is listed in the ability, and it functions only if the creature or object being detected emits an aroma (for instance, incorporeal creatures usually do not exude an aroma). If a creature emits a heavy aroma or is upwind, the GM can double or even triple the range of scent abilities used to detect that creature, and the GM can reduce the range if a creature is downwind.',
    shortDescriptionTemplate: 'imprecise {range} feet',
    variables: [
      { key: 'range', label: 'Range (feet)', type: 'text', placeholder: 'e.g. 30' },
    ],
  },
  {
    name: 'Shield Block',
    actionType: 'reaction',
    descriptionTemplate: 'Trigger The monster has its shield raised and takes damage from a physical attack; Effect The monster snaps its shield into place to deflect a blow. The shield prevents the monster from taking an amount of damage up to the shield\'s Hardness. The monster and the shield each take any remaining damage, possibly breaking or destroying the shield.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Sneak Attack',
    actionType: 'passive',
    descriptionTemplate: 'When the monster Strikes a creature that has the flat-footed condition with an agile or finesse melee weapon, an agile or finesse unarmed attack, or a ranged weapon attack, it also deals {damage} precision damage. For a ranged attack with a thrown weapon, that weapon must also be an agile or finesse weapon.',
    shortDescriptionTemplate: '{damage} precision',
    variables: [
      { key: 'damage', label: 'Precision Damage', type: 'damage' },
    ],
  },
  {
    name: 'Stench',
    actionType: 'passive',
    descriptionTemplate: 'Aura {range} feet. A creature entering the aura or starting its turn in the area must succeed at a DC {dc} Fortitude save or become Sickened 1 (plus Slowed 1 as long as it\'s sickened on a critical failure). A creature that succeeds at its save or recovers from being sickened is temporarily immune to all stench auras for 1 minute.',
    shortDescriptionTemplate: 'aura {range} feet, DC {dc} Fortitude save',
    variables: [
      { key: 'range', label: 'Aura (feet)', type: 'text', placeholder: 'e.g. 30' },
      { key: 'dc', label: 'Fortitude DC', type: 'dc' },
    ],
  },
  {
    name: 'Swallow Whole',
    actionType: 'single',
    descriptionTemplate: 'The monster attempts to swallow a creature of {size} or smaller that it has grabbed or restrained in its jaws or mouth. If a swallowed creature is of the maximum size listed, the monster can\'t use Swallow Whole again. If the creature is smaller than the maximum, the monster can usually swallow more creatures; the GM determines the maximum. The monster attempts an Athletics check opposed by the target\'s Reflex DC. If it succeeds, it swallows the creature. The monster\'s mouth or jaws no longer clutch a creature it has swallowed, so the monster is free to use them to Strike or Grab once again. The monster can\'t attack creatures it has swallowed. A swallowed creature is grabbed, is slowed 1, and has to hold its breath or start suffocating. The swallowed creature takes {damage} when first swallowed and at the end of each of its turns while it\'s swallowed. If the victim Escapes this ability\'s grabbed condition, it exits through the monster\'s mouth. This frees any other creature captured in the monster\'s mouth or jaws. A swallowed creature can attack the monster that has swallowed it, but only with unarmed attacks or with weapons of light Bulk or less. The swallowing creature is off-guard against the attack. If the monster takes piercing or slashing damage equaling or exceeding {rupture} from a single attack or spell, the swallowed creature cuts itself free. A creature that gets free by either Escaping or cutting itself free can immediately breathe and exits the swallowing monster\'s space. If the monster dies, a swallowed creature can be freed by creatures adjacent to the corpse if they spend a combined total of 3 actions cutting the monster open with a weapon or unarmed attack that deals piercing or slashing damage.',
    shortDescriptionTemplate: '{size} or smaller, {damage} per turn, Rupture {rupture}',
    variables: [
      { key: 'size', label: 'Max Size', type: 'size' },
      { key: 'damage', label: 'Damage (per turn)', type: 'damage' },
      { key: 'rupture', label: 'Rupture Damage', type: 'text', placeholder: 'e.g. 20' },
    ],
  },
  {
    name: 'Swarm Mind',
    actionType: 'passive',
    descriptionTemplate: 'This monster doesn\'t have a single mind (typically because it\'s a swarm of smaller creatures) and is immune to mental effects that target only a specific number of creatures. It is still subject to mental effects that affect all creatures in an area.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Telepathy',
    actionType: 'passive',
    descriptionTemplate: 'A monster with telepathy can communicate mentally with any creatures within {range} feet, as long as they share a language. This doesn\'t give any special access to their thoughts and communicates no more information than normal speech would.',
    shortDescriptionTemplate: '{range} feet',
    variables: [
      { key: 'range', label: 'Range (feet)', type: 'text', placeholder: 'e.g. 100' },
    ],
  },
  {
    name: 'Throw Rock',
    actionType: 'single',
    descriptionTemplate: 'The monster interacts to pick up a rock within reach or retrieve a stowed rock and throws it, making a ranged Strike.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Trample',
    actionType: 'three',
    descriptionTemplate: 'The monster Strides up to double its Speed and can move through the spaces of creatures of {size} or smaller, Trampling each creature whose space it enters. The monster can attempt to Trample the same creature only once in a single use of Trample. The monster deals the damage of its {strike} Strike, but trampled creatures can attempt a DC {dc} basic Reflex save (no damage on a critical success, half damage on a success, double damage on a critical failure).',
    shortDescriptionTemplate: '{size} or smaller, {strike}, DC {dc} basic Reflex save',
    variables: [
      { key: 'size', label: 'Max Size', type: 'size' },
      { key: 'strike', label: 'Strike', type: 'strike' },
      { key: 'dc', label: 'Reflex DC', type: 'dc' },
    ],
  },
  {
    name: 'Tremorsense',
    actionType: 'passive',
    descriptionTemplate: 'Tremorsense (imprecise) {range} feet. Tremorsense allows a monster to feel the vibrations through a solid surface caused by movement. It is usually an imprecise sense with a limited range (listed in the ability). Tremorsense functions only if the monster is on the same surface as the subject, and only if the subject is moving along (or burrowing through) the surface.',
    shortDescriptionTemplate: 'imprecise {range} feet',
    variables: [
      { key: 'range', label: 'Range (feet)', type: 'text', placeholder: 'e.g. 30' },
    ],
  },
  {
    name: 'Troop Defenses',
    actionType: 'passive',
    descriptionTemplate: 'Troops are composed of many individuals, represented by four "segments" on a battle grid. Each segment is 10 feet on each side and as tall as the individual members of the troop. Segments must remain contiguous. Each one has to share at least 5 feet of one of its edges with another segment—being adjacent on a diagonal isn\'t sufficient! You can measure flanking, cover, and the like using the center of any segment. A troop has two Hit Point thresholds in its HP entry and loses segments as it crosses thresholds. Typically, the higher threshold is at 2/3 of the troop\'s maximum Hit Points and the lower is at 1/3 of its maximum. Once the troop drops below the higher threshold, it loses one segment, leaving three segments (12 squares) remaining and setting the first threshold as the troop\'s new maximum Hit Points. This repeats when the troop drops below the lower threshold, leaving two segments (8 squares). At 0 Hit Points, the troop disperses entirely, with the few remaining members surrendering, fleeing, or easily dispatched, as determined by the GM. Typically the creature who caused the troop to lose a segment decides which to remove, or the GM decides when a specific creature wasn\'t responsible. To restore lost segments and maximum Hit Points, a troop needs to spend downtime to use long-term treatment on casualties or recruit new members to replace the fallen. Troops are typically immune to non-damaging effects that target a single creature, such as a charm spell or the Demoralize action. An ability that can target 5 or more creatures can target an entire segment, increasing to two segments if it can target 10 or more creatures and to the entire troop if it can target 20 or more creatures. An ability that affects all creatures in a certain range affects all segments in range (make any checks or saves separately for each segment). As examples, an 8th-rank charm spell (with 10 targets) can affect two segments, and an ability that Demoralizes all creatures within 30 feet of you would affect all segments that are fully within that range. A non-damaging ability that would prevent a segment from acting, cause them to flee, or otherwise make them unable to function as part of the troop for a round or more removes the segment entirely. The troop loses a number of HP required to bring it to the next threshold. If an ability both deals damage and has a non-damaging effect, apply the damage then the rest of the effect.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Troop Movement',
    actionType: 'passive',
    descriptionTemplate: 'Whenever a troop moves, you move one of its segments and the other segments follow behind it. At the end of the movement, you can group the other segments adjacent to the one you moved as you see fit, provided none of them moves farther than the moving segment. If you choose not to move the troop any distance, you can instead reshape the position of all the segments as long as one stays in place.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Void Healing',
    actionType: 'passive',
    descriptionTemplate: 'A creature with void healing draws health from void energy rather than vitality energy. It is damaged by vitality damage and is not healed by healing vitality effects. It does not take void damage, and it is healed by void effects that heal undead.',
    shortDescriptionTemplate: '',
    variables: [],
  },
  {
    name: 'Wavesense',
    actionType: 'passive',
    descriptionTemplate: 'Wavesense (imprecise) {range} feet. This sense allows a monster to feel vibrations caused by movement through a liquid. It\'s usually an imprecise sense with a limited range (listed in the ability). Wavesense functions only if the monster and the subject are in the same body of liquid, and only if the subject is moving through the liquid.',
    shortDescriptionTemplate: 'imprecise {range} feet',
    variables: [
      { key: 'range', label: 'Range (feet)', type: 'text', placeholder: 'e.g. 30' },
    ],
  },
];

export const ABILITY_GLOSSARY: Record<string, string> = {
  "All-Around Vision": "This monster can see in all directions simultaneously and therefore can't be flanked.",
  "Aquatic Ambush": "Requirements The monster is hiding in water and a creature that hasn't detected it is within the listed number of feet; Effect The monster moves up to its swim Speed + 10 feet toward the triggering creature, traveling on water and on land. Once the creature is in reach, the monster makes a Strike against it. The creature is off-guard against this Strike.",
  "At-Will Spells": "The monster can cast its at-will spells any number of times without using up spell slots.",
  "Attack of Opportunity": "Trigger A creature within the monster's reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it's using. Effect The monster attempts a melee Strike against the triggering creature. If the attack is a critical hit and the trigger was a manipulate action, the monster disrupts that action. This Strike doesn't count toward the monster's multiple attack penalty, and its multiple attack penalty doesn't apply to this Strike.",
  "Aura": "A monster's aura automatically affects everything within a specified emanation around that monster. The monster doesn't need to spend actions on the aura; rather, the aura's effects are applied at specific times, such as when a creature ends its turn in the aura or when creatures enter the aura. If an aura does nothing but deal damage, its entry lists only the radius, damage, and saving throw. Such auras deal this damage to a creature when the creature enters the aura and when a creature starts its turn in the aura. A creature can take damage from the aura only once per round. The GM might determine that a monster's aura doesn't affect its own allies. For example, a creature might be immune to a monster's frightful presence if they have been around each other for a long time.",
  "Buck": "Most monsters that serve as mounts can attempt to buck off unwanted or annoying riders, but most mounts won't use this reaction against a trusted creature unless they're spooked or mistreated. Trigger A creature Mounts or uses the Command an Animal action while riding the monster; Effect The triggering creature must succeed at a Reflex saving throw against the listed DC or fall off the creature and land prone. If the save is a critical failure, the triggering creature also takes 1d6 bludgeoning damage in addition to the normal damage for the fall.",
  "Catch Rock": "Requirements The monster must have a free hand but can Release anything it's holding as part of this reaction. Trigger The monster is targeted with a thrown rock Strike or a rock would fall on the monster. Effect The monster gains a +4 circumstance bonus to its AC against the triggering attack or to any defense against the falling rock. If the attack misses or the monster successfully defends against the falling rock, the monster catches the rock, takes no damage, and is now holding the rock.",
  "Change Formation": "The troop reconfigures to assume one of the formations below they know. Using this action again ends any previous formation, and the troop can also use this action to revert to its default formation, ending any benefits and drawbacks. Loose Members of the troop fan out to cover more ground. Benefit Any weaknesses the troop has to area and splash damage are suppressed. Drawback Enemies' saving throws against the troop's damaging effects are one degree of success better than they roll. Marching Column This formation traverses long distances more rapidly. Benefit The troop gains a +10 foot circumstance bonus to all its Speeds. Drawback The troop is Off-Guard and takes a –2 penalty to Reflex saves. Turtle Shell The troop interlocks their shields. Only a group with shields can use this formation. Benefit The troop gains a +2 circumstance bonus to AC against ranged attacks and to Reflex saves. Drawback The troop takes a –10-foot penalty to all its Speeds. Wedge The troop aligns itself behind a powerful commander. Benefit The troop chooses an adjacent allied creature without the troop trait to fall in behind. Each time the chosen creature Strides, the troop follows as a free action, Striding to keep the chosen creature adjacent. Drawback The troop loses some of their autonomy. They're slowed 1 and can't voluntarily move away from their leader.",
  "Change Shape": "The monster changes its shape indefinitely. It can use this action again to return to its natural shape or adopt a new shape. Unless otherwise noted, a monster cannot use Change Shape to appear as a specific individual. Using Change Shape counts as creating a disguise for the Impersonate use of Deception. The monster's transformation automatically defeats Perception DCs to determine whether the creature is a member of the ancestry or creature type into which it transformed, and it gains a +4 status bonus to its Deception DC to prevent others from seeing through its disguise. Change Shape abilities specify what shapes the monster can adopt. The monster doesn't gain any special abilities of the new shape, only its physical form. For example, in each shape, it replaces its normal Speeds and Strikes, and might potentially change its senses or size. Any changes are listed in its stat block.",
  "Constant Spells": "A constant spell affects the monster without the monster needing to cast it, and its duration is unlimited. If a constant spell gets counteracted, the monster can reactivate it by spending the normal spellcasting actions the spell requires.",
  "Constrict": "The monster deals the listed amount of damage to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with the listed DC.",
  "Coven": "This monster can form a coven with two or more other creatures who also have the coven ability. This involves performing an 8-hour ceremony with all prospective coven members. After the coven is formed, each of its members gains elite adjustments, adjusting their levels accordingly. Coven members can sense other members' locations and conditions by spending a single action, which has the concentrate trait, and can sense what another coven member is sensing as a two-action activity, which has the concentrate trait as well. Covens also grant spells and rituals to their members, but these can be cast only in cooperation between three coven members who are all within 30 feet of one another. A coven member can contribute to a coven spell with a single action that has the concentrate trait. If two coven members have contributed these actions within the last round, a third member can cast a coven spell on her turn by spending the normal spellcasting actions. A coven can cast its coven spells an unlimited number of times but can cast only one coven spell each round. All covens grant the 8th-rank Cursed Metamorphosis spell and all the following spells, which the coven can cast at any rank up to 5th: Augury, Charm, Clairaudience, Clairvoyance, Dream Message, Illusory Disguise, Illusory Scene, Scouting Eye, and Talking Corpse. Individual creatures with the coven ability also grant additional spells to any coven they join. A coven can also cast the Control Weather ritual, with a DC of 23 instead of the standard DC. If a coven member's departure or death brings the coven below three members, the remaining members keep their elite adjustments for 24 hours, but without enough members to contribute the necessary actions, they can't cast coven spells.",
  "Darkvision": "A monster with darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. Some forms of magical darkness, such as a 4th-level darkness spell, block normal darkvision. A monster with greater darkvision, however, can see through even these forms of magical darkness.",
  "Disease": "When a creature is exposed to a monster's disease, it attempts a Fortitude save or succumbs to the disease. The level of a disease is the level of the monster inflicting the disease. The disease follows the rules for afflictions.",
  "Engulf": "The monster Strides up to double its Speed and can move through the spaces of any creatures in its path. Any creature of the monster's size or smaller whose space the monster moves through can attempt a Reflex save with the listed DC to avoid being engulfed. A creature unable to act automatically critically fails this save. If a creature succeeds at its save, it can choose to be either pushed aside (out of the monster's path) or pushed in front of the monster to the end of the monster's movement. The monster can attempt to Engulf the same creature only once in a single use of Engulf. The monster can contain as many creatures as can fit in its space. A creature that fails its save is pulled into the monster's body. It is grabbed, is slowed 1, and has to hold its breath or start suffocating. The creature takes the listed amount of damage when first engulfed and at the end of each of its turns while it's engulfed. An engulfed creature can get free by Escaping against the listed Escape DC. An engulfed creature can attack the monster engulfing it, but only with unarmed attacks or with weapons of light Bulk or less. The engulfing creature is off-guard against the attack. If the monster takes piercing or slashing damage equaling or exceeding the listed Rupture value from a single attack or spell, the engulfed creature cuts itself free. A creature that gets free by either method can immediately breathe and exits the engulfing monster's space. If the monster dies, all creatures it has engulfed are automatically released as the monster's form loses cohesion.",
  "Fast Healing": "A monster with this ability regains the given number of Hit Points each round at the beginning of its turn.",
  "Ferocity": "Trigger The monster is reduced to 0 HP; Effect The monster avoids being knocked out and remains at 1 HP, but its wounded value increases by 1. When it is wounded 3, it can no longer use this ability.",
  "Form Up": "The troop chooses one of the squares it currently occupies and redistributes its squares to any configuration in which all squares are contiguous and within 15 feet of the chosen square. The troop can't share its space with other creatures.",
  "Frightful Presence": "A creature that first enters the area must attempt a Will save. Regardless of the result of the saving throw, the creature is temporarily immune to this monster's Frightful Presence for 1 minute. Critical Success The creature is unaffected by the presence. Success The creature is frightened 1. Failure The creature is frightened 2. Critical Failure The creature is frightened 4.",
  "Grab": "Requirements The monster's last action was a successful Strike that lists Grab in its damage entry, or the monster has a creature grabbed or restrained; Effect If used after a Strike, the monster attempts to Grapple the creature using the body part it attacked with. This attempt neither applies nor counts toward the creature's multiple attack penalty. The monster can instead use Grab and choose one creature it's grabbing or restraining with an appendage that has Grab to automatically extend that condition to the end of the monster's next turn.",
  "Greater Constrict": "The monster deals the listed amount of damage to any number of creatures grabbed or restrained by it. Each of those creatures can attempt a basic Fortitude save with the listed DC. A creature that fails this save falls unconscious, and a creature that succeeds is then temporarily immune to falling unconscious from Greater Constrict for 1 minute.",
  "Greater Darkvision": "A creature with greater darkvision can see perfectly well in areas of darkness and dim light, though such vision is in black and white only. A creature with greater darkvision can see through even forms of magical darkness.",
  "Improved Grab": "The monster can use Grab as a free action triggered by a hit with its initial attack. A monster with Improved Grab still needs to spend an action to extend the duration for creatures it already has grabbed.",
  "Improved Knockdown": "The monster can use Knockdown as a free action triggered by a hit with its initial attack.",
  "Improved Push": "The monster can use Push as a free action triggered by a hit with its initial attack.",
  "Knockdown": "Requirements The monster's last action was a successful Strike that lists Knockdown in its damage entry; Effect The monster attempts to Trip the creature. This attempt neither applies nor counts toward the monster's multiple attack penalty.",
  "Lifesense": "Lifesense allows a monster to sense the vital essence of living and undead creatures within the listed range. The sense can distinguish between the vitality energy animating living creatures and the void energy animating undead creatures, much as sight distinguishes colors.",
  "Light Blindness": "When first exposed to bright light, the monster is Blinded until the end of its next turn. After this exposure, light doesn't blind the monster again until after it spends 1 hour in darkness. However, as long as the monster is in an area of bright light, it's Dazzled.",
  "Low-Light Vision": "The monster can see in dim light as though it were bright light, so it ignores the Concealed condition due to dim light.",
  "Poison": "When a creature is exposed to a monster's poison, it attempts a Fortitude save to avoid becoming poisoned. The level of a poison is the level of the monster inflicting the poison. The poison follows the rules for afflictions.",
  "Power Attack": "Frequency once per round Effect The monster makes a melee Strike. This counts as two attacks when calculating the monster's multiple attack penalty. If this Strike hits, the monster deals an extra die of weapon damage.",
  "Pull": "Requirements The monster's last action was a success with a Strike that lists Pull in its damage entry; Effect The monster attempts to Reposition the creature, moving it closer to the monster. This attempt neither applies nor counts toward the monster's multiple attack penalty. If Pull lists a distance, change the distance the creature is pulled on a success to that distance.",
  "Push": "Requirements The monster's last action was a successful Strike that lists Push in its damage entry; Effect The monster attempts to Shove the creature. This attempt neither applies nor counts toward the monster's multiple attack penalty. If Push lists a distance, change the distance the creature is pushed on a success to that distance.",
  "Reactive Strike": "Trigger A creature within the monster's reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during a move action it's using; Effect The monster attempts a melee Strike against the triggering creature. If the attack is a critical hit and the trigger was a manipulate action, the monster disrupts that action. This Strike doesn't count toward the monster's multiple attack penalty, and its multiple attack penalty doesn't apply to this Strike.",
  "Regeneration": "This monster regains the listed number of Hit Points each round at the beginning of its turn. Its dying condition never increases beyond dying 3 as long as its regeneration is active. However, if it takes damage of a type listed in the regeneration entry, its regeneration deactivates until the end of its next turn. Deactivate the regeneration before applying any damage of a listed type, since that damage might kill the monster by bringing it to dying 4.",
  "Rend": "A Rend entry lists a Strike the monster has. Requirements The monster hit the same enemy with two consecutive Strikes of the listed type in the same round; Effect The monster automatically deals that Strike's damage again to the enemy.",
  "Retributive Strike": "Trigger An enemy damages the monster's ally, and both are within 15 feet of the monster. Effect The ally gains resistance to all damage against the triggering damage equal to 2 + the monster's level. If the foe is within reach, the monster makes a melee Strike against it.",
  "Scent": "Scent involves sensing creatures or objects by smell and is usually a vague sense. The range is listed in the ability, and it functions only if the creature or object being detected emits an aroma (for instance, incorporeal creatures usually do not exude an aroma). If a creature emits a heavy aroma or is upwind, the GM can double or even triple the range of scent abilities used to detect that creature, and the GM can reduce the range if a creature is downwind.",
  "Shield Block": "Trigger The monster has its shield raised and takes damage from a physical attack; Effect The monster snaps its shield into place to deflect a blow. The shield prevents the monster from taking an amount of damage up to the shield's Hardness. The monster and the shield each take any remaining damage, possibly breaking or destroying the shield.",
  "Sneak Attack": "When the monster Strikes a creature that has the flat-footed condition with an agile or finesse melee weapon, an agile or finesse unarmed attack, or a ranged weapon attack, it also deals the listed precision damage. For a ranged attack with a thrown weapon, that weapon must also be an agile or finesse weapon.",
  "Stench": "A creature entering the aura or starting its turn in the area must succeed at a Fortitude save or become Sickened 1 (plus Slowed 1 as long as it's sickened on a critical failure). A creature that succeeds at its save or recovers from being sickened is temporarily immune to all stench auras for 1 minute.",
  "Swallow Whole": "The monster attempts to swallow a creature of the listed size or smaller that it has grabbed or restrained in its jaws or mouth. If a swallowed creature is of the maximum size listed, the monster can't use Swallow Whole again. If the creature is smaller than the maximum, the monster can usually swallow more creatures; the GM determines the maximum. The monster attempts an Athletics check opposed by the target's Reflex DC. If it succeeds, it swallows the creature. The monster's mouth or jaws no longer clutch a creature it has swallowed, so the monster is free to use them to Strike or Grab once again. The monster can't attack creatures it has swallowed. A swallowed creature is grabbed, is slowed 1, and has to hold its breath or start suffocating. The swallowed creature takes the listed amount of damage when first swallowed and at the end of each of its turns while it's swallowed. If the victim Escapes this ability's grabbed condition, it exits through the monster's mouth. This frees any other creature captured in the monster's mouth or jaws. A swallowed creature can attack the monster that has swallowed it, but only with unarmed attacks or with weapons of light Bulk or less. The swallowing creature is off-guard against the attack. If the monster takes piercing or slashing damage equaling or exceeding the listed Rupture value from a single attack or spell, the swallowed creature cuts itself free. A creature that gets free by either Escaping or cutting itself free can immediately breathe and exits the swallowing monster's space. If the monster dies, a swallowed creature can be freed by creatures adjacent to the corpse if they spend a combined total of 3 actions cutting the monster open with a weapon or unarmed attack that deals piercing or slashing damage.",
  "Swarm Mind": "This monster doesn't have a single mind (typically because it's a swarm of smaller creatures) and is immune to mental effects that target only a specific number of creatures. It is still subject to mental effects that affect all creatures in an area.",
  "Telepathy": "A monster with telepathy can communicate mentally with any creatures within the listed radius, as long as they share a language. This doesn't give any special access to their thoughts and communicates no more information than normal speech would.",
  "Thoughtsense": "Thoughtsense allows a monster to sense all non-mindless creatures at the listed range.",
  "Throw Rock": "The monster interacts to pick up a rock within reach or retrieve a stowed rock and throws it, making a ranged Strike.",
  "Trample": "The monster Strides up to double its Speed and can move through the spaces of creatures of the listed size, Trampling each creature whose space it enters. The monster can attempt to Trample the same creature only once in a single use of Trample. The monster deals the damage of the listed Strike, but trampled creatures can attempt a basic Reflex save at the listed DC (no damage on a critical success, half damage on a success, double damage on a critical failure).",
  "Tremorsense": "Tremorsense allows a monster to feel the vibrations through a solid surface caused by movement. It is usually an imprecise sense with a limited range (listed in the ability). Tremorsense functions only if the monster is on the same surface as the subject, and only if the subject is moving along (or burrowing through) the surface.",
  "Troop Defenses": "Troops are composed of many individuals, represented by four \"segments\" on a battle grid. Each segment is 10 feet on each side and as tall as the individual members of the troop. Segments must remain contiguous. Each one has to share at least 5 feet of one of its edges with another segment— being adjacent on a diagonal isn't sufficient! You can measure flanking, cover, and the like using the center of any segment. A troop has two Hit Point thresholds in its HP entry and loses segments as it crosses thresholds. Typically, the higher threshold is at 2/3 of the troop's maximum Hit Points and the lower is at 1/3 of its maximum. Once the troop drops below the higher threshold, it loses one segment, leaving three segments (12 squares) remaining and setting the first threshold as the troop's new maximum Hit Points. This repeats when the troop drops below the lower threshold, leaving two segments (8 squares). At 0 Hit Points, the troop disperses entirely, with the few remaining members surrendering, fleeing, or easily dispatched, as determined by the GM. Typically the creature who caused the troop to lose a segment decides which to remove, or the GM decides when a specific creature wasn't responsible. To restore lost segments and maximum Hit Points, a troop needs to spend downtime to use long-term treatment on casualties or recruit new members to replace the fallen. Troops are typically immune to non-damaging effects that target a single creature, such as a charm spell or the Demoralize action. An ability that can target 5 or more creatures can target an entire segment, increasing to two segments if it can target 10 or more creatures and to the entire troop if it can target 20 or more creatures. An ability that affects all creatures in a certain range affects all segments in range (make any checks or saves separately for each segment). As examples, an 8th- rank charm spell (with 10 targets) can affect two segments, and an ability that Demoralizes all creatures within 30 feet of you would affect all segments that are fully within that range. A non-damaging ability that would prevent a segment from acting, cause them to flee, or otherwise make them unable to function as part of the troop for a round or more removes the segment entirely. The troop loses a number of HP required to bring it to the next threshold. If an ability both deals damage and has a non-damaging effect, apply the damage then the rest of the effect.",
  "Troop Movement": "Whenever a troop moves, you move one of its segments and the other segments follow behind it. At the end of the movement, you can group the other segments adjacent to the one you moved as you see fit, provided none of them moves farther than the moving segment. If you choose not to move the troop any distance, you can instead reshape the position of all the segments as long as one stays in place.",
  "Wavesense": "This sense allows a monster to feel vibrations caused by movement through a liquid. It's usually an imprecise sense with a limited range (listed in the ability). Wavesense functions only if the monster and the subject are in the same body of liquid, and only if the subject is moving through the liquid.",
  "Golem Antimagic": "A golem is immune to spells and magical abilities other than its own, but each type of golem is affected by a few types of magic in special ways. These exceptions are listed in shortened form in the golem's stat block, with the full rules appearing here. If an entry lists multiple types (such as \"cold and water\"), either type of spell can affect the golem. Harmed By Any magic of this type that targets the golem causes it to take the listed amount of damage (this damage has no type) instead of the usual effect. If the golem starts its turn in an area of magic of this type or is affected by a persistent effect of the appropriate type, it takes the damage listed in the parenthetical. Healed By Any magic of this type that targets the golem makes the golem lose the slowed condition and gain HP equal to half the damage the spell would have dealt. If the golem starts its turn in an area of this type of magic, it gains the HP listed in the parenthetical. Slowed By Any magic of this type that targets the golem causes it to be Slowed 1 for 2d6 rounds instead of the usual effect. If the golem starts its turn in an area of this type of magic, it's slowed 1 for that round. Vulnerable To Each golem is vulnerable to one or more specific spells, with the effects described in its stat block.",
  "Hover": "When a monster's land speed indicates that the creature hovers, its land Speed represents how fast it can move while hovering within 5 feet of a solid surface. Hovering creatures don't count as flying but might be able to avoid certain types of difficult or hazardous terrain, at the GM's discretion.",
  "Negative Healing": "A creature with void healing draws health from void energy rather than vitality energy. It is damaged by vitality damage and is not healed by vitality healing effects. It does not take void damage, and it is healed by void effects that heal undead.",
  "No Breath": "The monster doesn't breathe and is immune to effects that require breathing.",
  "Void Healing": "A creature with void healing draws health from void energy rather than vitality energy. It is damaged by vitality damage and is not healed by healing vitality effects. It does not take void damage, and it is healed by void effects that heal undead.",
};
