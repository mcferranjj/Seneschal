import { useState, useEffect, useCallback, useRef } from 'react';
import type { CharacterRecord, PartyRecord } from '../../db/schema';
import { characterRepository } from '../../db/repositories/CharacterRepository';
import { partyRepository } from '../../db/repositories/PartyRepository';
import {
  blankForm,
  formToRecord,
  recordToForm,
  PF2E_CLASSES,
  ANCESTRIES,
  type SimpleCharForm,
} from './simpleCharForm';
import { filterOrphanCharacters } from './partySelectors';
import styles from './PartyEditor.module.css';

export interface PartyEditorProps {
  partyId: string | null;
  onClose: () => void;
  onSaved: (party: PartyRecord, opts: { activate: boolean }) => void;
  /**
   * Called after a party is deleted from the editor. The host should remove
   * any dangling references (e.g. encounters whose `activePartyId` pointed
   * here) and refresh its party list.
   */
  onDeleted?: (partyId: string) => void;
}

interface DraftMember {
  /** If non-null, this is an existing CharacterRecord (either pre-loaded or freshly created). */
  existingId: string | null;
  /** Used for display even when existingId is set (denormalized). */
  name: string;
  sub: string;
  /** If existingId is null, this draft form will create a new record on save. */
  form: SimpleCharForm | null;
}

export function PartyEditor({ partyId, onClose, onSaved, onDeleted }: PartyEditorProps) {
  const [partyName, setPartyName] = useState('');
  const [partyLevel, setPartyLevel] = useState(1);
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [allChars, setAllChars] = useState<CharacterRecord[]>([]);
  const [loadedParty, setLoadedParty] = useState<PartyRecord | null>(null);

  // Inline "add new member" form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<SimpleCharForm>(blankForm());

  // "Pick existing" dropdown
  const [showPickDropdown, setShowPickDropdown] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = partyId === null;

  // Load all characters and (if editing) the party
  const loadData = useCallback(async () => {
    const chars = await characterRepository.getAll();
    setAllChars(chars);

    if (partyId) {
      const party = await partyRepository.getById(partyId);
      if (party) {
        setLoadedParty(party);
        setPartyName(party.name);
        setPartyLevel(party.level);
        const memberDrafts: DraftMember[] = party.memberIds.map(mid => {
          const c = chars.find(x => x.id === mid);
          if (c) {
            const f = recordToForm(c);
            return {
              existingId: c.id,
              name: c.name,
              sub: `${c.ancestry?.name ?? f.ancestryName} ${c.class?.name ?? f.className} ${c.level}`,
              form: null,
            };
          }
          return { existingId: mid, name: `(missing ${mid})`, sub: '', form: null };
        });
        setMembers(memberDrafts);
      }
    } else {
      setPartyName('');
      setPartyLevel(1);
      setMembers([]);
      setLoadedParty(null);
    }
  }, [partyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Close pick dropdown on outside click
  useEffect(() => {
    if (!showPickDropdown) return;
    function handler(e: MouseEvent) {
      if (pickRef.current && !pickRef.current.contains(e.target as Node)) {
        setShowPickDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPickDropdown]);

  // Orphan characters: not already a member of this editor session
  // (logic lives in partySelectors.ts so it can be unit-tested in isolation).
  const currentMemberIds = new Set(members.map(m => m.existingId).filter(Boolean) as string[]);
  const orphans = filterOrphanCharacters(allChars, currentMemberIds);

  function addFieldHandler(field: keyof SimpleCharForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setAddForm(prev => ({ ...prev, [field]: v }));
    };
  }

  function commitAddForm() {
    if (!addForm.name.trim()) return;
    const draft: DraftMember = {
      existingId: null,
      name: addForm.name.trim(),
      sub: `${addForm.ancestryName} ${addForm.className} ${addForm.level}`,
      form: { ...addForm },
    };
    setMembers(prev => [...prev, draft]);
    setAddForm(blankForm());
    setShowAddForm(false);
  }

  function pickExisting(c: CharacterRecord) {
    const f = recordToForm(c);
    const draft: DraftMember = {
      existingId: c.id,
      name: c.name,
      sub: `${c.ancestry?.name ?? f.ancestryName} ${c.class?.name ?? f.className} ${c.level}`,
      form: null,
    };
    setMembers(prev => [...prev, draft]);
    setShowPickDropdown(false);
  }

  function removeMember(idx: number) {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  }

  async function doSave(activate: boolean) {
    if (!partyName.trim()) return;
    const now = Date.now();

    // Persist any new-member drafts
    const resolvedIds: string[] = [];
    for (const m of members) {
      if (m.existingId) {
        resolvedIds.push(m.existingId);
      } else if (m.form) {
        const id = `pc-${now}-${Math.random().toString(36).slice(2)}`;
        const rec = formToRecord(m.form, id, now);
        await characterRepository.add(rec);
        resolvedIds.push(id);
      }
    }

    const party: PartyRecord = {
      id: loadedParty?.id ?? `party-${now}`,
      name: partyName.trim(),
      level: partyLevel,
      memberIds: resolvedIds,
      createdAt: loadedParty?.createdAt ?? now,
      updatedAt: now,
    };
    await partyRepository.put(party);
    onSaved(party, { activate });
  }

  async function doDelete() {
    if (!partyId) return;
    await partyRepository.delete(partyId);
    // Notify the host so it can clear any encounter's dangling activePartyId
    // and refresh its loaded parties list before we close.
    onDeleted?.(partyId);
    onClose();
  }

  return (
    <div className={styles.editor}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isNew ? 'New Party' : `Edit ${partyName || 'Party'}`}
        </h2>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close party editor">
          ✕
        </button>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Name */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Name</span>
          <input
            className={styles.input}
            value={partyName}
            onChange={e => setPartyName(e.target.value)}
            placeholder="Party name"
            autoFocus={isNew}
          />
        </div>

        {/* Level */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Level</span>
          <div className={styles.levelGroup}>
            <button
              className={styles.stepBtn}
              onClick={() => setPartyLevel(l => Math.max(1, l - 1))}
            >
              −
            </button>
            <span className={styles.levelVal}>{partyLevel}</span>
            <button
              className={styles.stepBtn}
              onClick={() => setPartyLevel(l => Math.min(20, l + 1))}
            >
              +
            </button>
          </div>
        </div>

        {/* Member list */}
        <div>
          <div className={styles.sectionLabel}>Members ({members.length})</div>
          <div className={styles.memberList}>
            {members.map((m, idx) => (
              <div key={idx} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{m.name}</div>
                  {m.sub && <div className={styles.memberSub}>{m.sub}</div>}
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeMember(idx)}
                  aria-label={`Remove ${m.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add member section */}
        <div className={styles.addMemberSection}>
          {!showAddForm ? (
            <div className={styles.addMemberActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => { setShowAddForm(true); setAddForm(blankForm()); }}
              >
                + Add member
              </button>
              <div ref={pickRef} className={styles.pickExisting}>
                <button
                  className={styles.pickExistingBtn}
                  onClick={() => setShowPickDropdown(o => !o)}
                >
                  Pick existing…
                </button>
                {showPickDropdown && (
                  <div className={styles.pickExistingDropdown}>
                    {orphans.length === 0 ? (
                      <div className={styles.pickExistingEmpty}>No available characters</div>
                    ) : (
                      orphans.map(c => {
                        const f = recordToForm(c);
                        return (
                          <div
                            key={c.id}
                            className={styles.pickExistingItem}
                            onClick={() => pickExisting(c)}
                          >
                            <span className={styles.pickExistingName}>{c.name}</span>
                            <span className={styles.pickExistingSub}>
                              {c.ancestry?.name ?? f.ancestryName} {c.class?.name ?? f.className} {c.level}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className={styles.addMemberGrid}>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Name</span>
                  <input
                    className={styles.addMemberInput}
                    value={addForm.name}
                    onChange={addFieldHandler('name')}
                    placeholder="Character name"
                    autoFocus
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Player</span>
                  <input
                    className={styles.addMemberInput}
                    value={addForm.playerName}
                    onChange={addFieldHandler('playerName')}
                    placeholder="Player name"
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Ancestry</span>
                  <select
                    className={styles.addMemberInput}
                    value={addForm.ancestryName}
                    onChange={addFieldHandler('ancestryName')}
                  >
                    {ANCESTRIES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Class</span>
                  <select
                    className={styles.addMemberInput}
                    value={addForm.className}
                    onChange={addFieldHandler('className')}
                  >
                    {PF2E_CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Level</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    min={1}
                    max={20}
                    value={addForm.level}
                    onChange={addFieldHandler('level')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Max HP</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    min={1}
                    value={addForm.maxHp}
                    onChange={addFieldHandler('maxHp')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>AC</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    min={1}
                    value={addForm.ac}
                    onChange={addFieldHandler('ac')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Perception</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.perception}
                    onChange={addFieldHandler('perception')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Fort</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.fort}
                    onChange={addFieldHandler('fort')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Ref</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.ref}
                    onChange={addFieldHandler('ref')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Will</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.will}
                    onChange={addFieldHandler('will')}
                  />
                </div>
              </div>
              <div className={styles.addMemberFooter}>
                <button
                  className={styles.btnPrimary}
                  onClick={commitAddForm}
                  disabled={!addForm.name.trim()}
                >
                  Add
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        {confirmDelete ? (
          <div className={styles.confirmRow}>
            <span>Delete this party?</span>
            <button className={styles.btnDanger} onClick={doDelete}>Yes, delete</button>
            <button className={styles.btnSecondary} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <button
              className={styles.btnPrimary}
              onClick={() => doSave(false)}
              disabled={!partyName.trim()}
            >
              Save
            </button>
            <button
              className={styles.btnPrimary}
              onClick={() => doSave(true)}
              disabled={!partyName.trim()}
            >
              Save &amp; Use
            </button>
            <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
            {!isNew && (
              <>
                <div className={styles.footerSpacer} />
                <button
                  className={styles.btnDanger}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete party
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
