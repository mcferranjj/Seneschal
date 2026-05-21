/**
 * Flat form state for the inline "add/edit member" form in the party editor.
 * Stores only the stats the GM needs — no class, ancestry, player name, or
 * individual level (level comes from the party).
 */

import type { PartyMemberRecord } from '../../db/schema';

export interface MemberForm {
  name: string;
  maxHp: number;
  ac: number;
  perception: number;
  fort: number;
  ref: number;
  will: number;
}

export function blankMemberForm(): MemberForm {
  return {
    name: '',
    maxHp: 20,
    ac: 15,
    perception: 3,
    fort: 5,
    ref: 3,
    will: 3,
  };
}

export function memberFormToRecord(
  form: MemberForm,
  idHint?: string,
  createdAt?: number,
): PartyMemberRecord {
  const now = Date.now();
  return {
    id: idHint ?? `pmember-${now}-${Math.random().toString(36).slice(2)}`,
    name: form.name.trim(),
    maxHp: form.maxHp,
    ac: form.ac,
    perception: form.perception,
    fort: form.fort,
    ref: form.ref,
    will: form.will,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

export function memberRecordToForm(r: PartyMemberRecord): MemberForm {
  return {
    name: r.name,
    maxHp: r.maxHp,
    ac: r.ac,
    perception: r.perception,
    fort: r.fort,
    ref: r.ref,
    will: r.will,
  };
}
