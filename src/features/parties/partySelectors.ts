/**
 * Pure selectors / helpers for party UI flows.
 *
 * Kept separate from the React components so they can be unit-tested without
 * mounting anything. Anything async or stateful belongs in PartyEditor /
 * PartyPickerMenu / repositories instead.
 */

import type { CharacterRecord, PartyRecord } from '../../db/schema';

/**
 * Return the subset of `allChars` whose id is NOT in `currentMemberIds`.
 *
 * Used by the PartyEditor "Pick existing…" dropdown to show only characters
 * that are not already members of the party being edited.
 */
export function filterOrphanCharacters(
  allChars: readonly CharacterRecord[],
  currentMemberIds: ReadonlySet<string>,
): CharacterRecord[] {
  return allChars.filter(c => !currentMemberIds.has(c.id));
}

/**
 * Build the "Lvl X · N member(s)" sublabel for a party row.
 * Extracted so its phrasing is reusable and easy to test for pluralization.
 */
export function partyRowSubLabel(p: Pick<PartyRecord, 'level' | 'memberIds'>): string {
  const count = p.memberIds.length;
  return `Lvl ${p.level} · ${count} member${count !== 1 ? 's' : ''}`;
}
