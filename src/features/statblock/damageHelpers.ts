import type { PF2ECreature } from '../../types/pf2e';
import type { CreatureRecord } from '../../db/schema';
import type { DamageGroupInput } from '../../types/damage';
import { extractDamageGroups } from '../../utils/foundryMacros';
import { isSneakAttackEligible } from '../../utils/pf2eHelpers';

export function getDamageString(
  damageRolls: Record<string, { damage: string; damageType: string; category?: string }> | undefined,
): string {
  if (!damageRolls) return '';
  return Object.values(damageRolls)
    .map(d => {
      const typeLabel = d.category === 'persistent' ? `persistent ${d.damageType}` : d.damageType;
      return `${d.damage} ${typeLabel}`;
    })
    .join(' + ');
}

/**
 * Returns one DamageGroupInput per damage roll entry so that the DiceRoller
 * can display (and roll) each damage type separately.
 * e.g. { a: { damage: "2d6+3", damageType: "slashing" }, b: { damage: "1d4", damageType: "fire" } }
 * → [{ expr: "2d6+3", label: "slashing" }, { expr: "1d4", label: "fire" }]
 */
export function getDamageGroups(
  damageRolls: Record<string, { damage: string; damageType: string; category?: string }> | undefined,
  modOffset = 0,
): DamageGroupInput[] {
  if (!damageRolls) return [];
  const entries = Object.values(damageRolls);
  return entries.map((d, i) => {
    let expr = d.damage.trim();
    // Apply modifier offset only to the first group (consistent with existing behaviour)
    if (i === 0 && modOffset !== 0) {
      expr = `${expr}${modOffset >= 0 ? `+${modOffset}` : modOffset}`;
    }
    const isPersistent = d.category === 'persistent';
    const label = isPersistent ? `persistent ${d.damageType}` : d.damageType;
    return { expr, label, ...(isPersistent ? { persistent: true } : {}) };
  });
}

/**
 * Detects whether a creature has the Sneak Attack feature and returns the
 * precision damage expression (e.g. "1d6", "2d6"), or null if absent.
 *
 * Detection priority:
 *  1. Official creatures: find an item named "Sneak Attack" and read the dice
 *     from its `DamageDice` rules entry (diceNumber + dieSize). Falls back to
 *     parsing the item's description HTML for a dice expression.
 *  2. Custom creatures: find an ability whose `genericAbilityName` or `name`
 *     is "Sneak Attack" and extract the dice from its description text.
 */
export function getSneakAttackDamage(creature: CreatureRecord): string | null {
  const c = creature.data as PF2ECreature;

  // ── Official creatures ────────────────────────────────────────────────────
  const saItem = c.items?.find(i => i.name?.toLowerCase() === 'sneak attack');
  if (saItem) {
    // Primary: read the structured DamageDice rule entry
    const rules: unknown[] = (saItem.system as Record<string, unknown>)?.rules as unknown[] ?? [];
    const dmgRule = rules.find(
      (r): r is Record<string, unknown> =>
        typeof r === 'object' && r !== null && (r as Record<string, unknown>).key === 'DamageDice',
    );
    if (dmgRule) {
      const count = dmgRule.diceNumber as number | undefined;
      const size  = dmgRule.dieSize   as string | undefined; // e.g. "d6"
      if (count != null && size) return `${count}${size}`;   // e.g. "1d6", "2d6"
    }
    // Fallback: parse the description for a dice expression
    const desc = saItem.system?.description?.value ?? '';
    if (desc) {
      const groups = extractDamageGroups(desc);
      if (groups.length > 0) return groups[0].expr;
      const m = desc.replace(/<[^>]*>/g, ' ').match(/\b(\d+d\d+(?:[+-]\d+)?)\b/);
      if (m) return m[1];
    }
  }

  // ── Custom creatures ──────────────────────────────────────────────────────
  const saAbility = (creature.customData?.abilities ?? []).find(
    ab => (ab.genericAbilityName ?? ab.name).toLowerCase() === 'sneak attack',
  );
  if (saAbility) {
    const groups = extractDamageGroups(saAbility.description ?? '');
    if (groups.length > 0) return groups[0].expr;
    const m = (saAbility.description ?? '').match(/\b(\d+d\d+(?:[+-]\d+)?)\b/);
    if (m) return m[1];
  }

  return null;
}

/**
 * Appends a sneak attack precision damage group to `groups` when the toggle is
 * active and the attack is eligible. Returns the original array unchanged otherwise.
 *
 * Centralises the group-construction logic so `AttackBlock` and the non-official
 * attacks path in `StatblockDrawer` don't duplicate it.
 */
export function withSneakAttack(
  groups: DamageGroupInput[],
  sneakAttackExpr: string | null,
  sneakAttackActive: boolean,
  attackType: 'melee' | 'ranged',
  traits: string[],
): DamageGroupInput[] {
  if (!sneakAttackActive || !sneakAttackExpr) return groups;
  if (!isSneakAttackEligible(attackType, traits)) return groups;
  return [...groups, { expr: sneakAttackExpr, label: 'precision (Sneak Attack)' }];
}
