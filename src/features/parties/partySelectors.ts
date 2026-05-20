/**
 * Pure selectors / helpers for party UI flows.
 *
 * Kept separate from the React components so they can be unit-tested without
 * mounting anything. Anything async or stateful belongs in PartyEditor /
 * PartyPickerMenu / repositories instead.
 */

import type { PartyMemberRecord, PartyRecord } from '../../db/schema';
import type { MemberForm } from './memberForm';

/**
 * Return the subset of `allMembers` whose id is NOT in `currentMemberIds`.
 *
 * Used by the PartyEditor "Pick existing…" dropdown to show only party members
 * that are not already in the party being edited.
 */
export function filterAvailableMembers(
  allMembers: readonly PartyMemberRecord[],
  currentMemberIds: ReadonlySet<string>,
): PartyMemberRecord[] {
  return allMembers.filter(m => !currentMemberIds.has(m.id));
}

/**
 * Build the "Lvl X · N member(s)" sublabel for a party row.
 */
export function partyRowSubLabel(p: Pick<PartyRecord, 'level' | 'memberIds'>): string {
  const count = p.memberIds.length;
  return `Lvl ${p.level} · ${count} member${count !== 1 ? 's' : ''}`;
}

/**
 * One-line stat summary shown under a member's name in the editor and picker.
 * e.g. "HP 45 · AC 19 · Per +8"
 */
export function statSummaryFromRecord(r: Pick<PartyMemberRecord, 'maxHp' | 'ac' | 'perception'>): string {
  const per = r.perception >= 0 ? `+${r.perception}` : String(r.perception);
  return `HP ${r.maxHp} · AC ${r.ac} · Per ${per}`;
}

export function statSummaryFromForm(f: Pick<MemberForm, 'maxHp' | 'ac' | 'perception'>): string {
  const per = f.perception >= 0 ? `+${f.perception}` : String(f.perception);
  return `HP ${f.maxHp} · AC ${f.ac} · Per ${per}`;
}
