import type { CharacterClassRef, FeatChoice, FeatSlotType } from '../../../db/schema';

export interface FeatSlot {
  slotType: FeatSlotType;
  level: number;
  label: string;
}

/**
 * Compute all feat slots up to the given level based on class feat schedule.
 */
export function computeFeatSlots(
  cls: CharacterClassRef | null,
  level: number,
): FeatSlot[] {
  if (!cls) return [];

  const slots: FeatSlot[] = [];

  for (const l of cls.ancestryFeatLevels) {
    if (l <= level) slots.push({ slotType: 'ancestry', level: l, label: 'Ancestry Feat' });
  }
  for (const l of cls.classFeatLevels) {
    if (l <= level) slots.push({ slotType: 'class', level: l, label: 'Class Feat' });
  }
  for (const l of cls.generalFeatLevels) {
    if (l <= level) slots.push({ slotType: 'general', level: l, label: 'General Feat' });
  }
  for (const l of cls.skillFeatLevels) {
    if (l <= level) slots.push({ slotType: 'skill', level: l, label: 'Skill Feat' });
  }

  slots.sort((a, b) => a.level - b.level || a.slotType.localeCompare(b.slotType));
  return slots;
}

/**
 * Merge newly computed slots with existing choices, preserving feat assignments.
 */
export function mergeFeatChoices(
  slots: FeatSlot[],
  existing: FeatChoice[],
): FeatChoice[] {
  return slots.map(slot => {
    const found = existing.find(
      f => f.slotType === slot.slotType && f.level === slot.level,
    );
    return found ?? { slotType: slot.slotType, level: slot.level, featId: null, featName: null };
  });
}
