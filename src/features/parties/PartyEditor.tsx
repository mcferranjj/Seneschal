import { useState, useEffect, useCallback, useRef } from 'react';
import type { PartyMemberRecord, PartyRecord } from '../../db/schema';
import { partyRepository } from '../../db/repositories/PartyRepository';
import { partyMemberRepository } from '../../db/repositories/PartyMemberRepository';
import {
  blankMemberForm,
  memberFormToRecord,
  type MemberForm,
} from './memberForm';
import { filterAvailableMembers, statSummaryFromRecord, statSummaryFromForm } from './partySelectors';
import styles from './PartyEditor.module.css';

export interface PartyEditorProps {
  partyId: string | null;
  onClose: () => void;
  onSaved: (party: PartyRecord, opts: { activate: boolean }) => void;
  onDeleted?: (partyId: string) => void;
}

interface DraftMember {
  /** Non-null when this member already exists in partyMembers table. */
  existingId: string | null;
  name: string;
  /** Cached stat summary for display. */
  statSummary: string;
  /** Only set when existingId is null — will be persisted on save. */
  form: MemberForm | null;
}

export function PartyEditor({ partyId, onClose, onSaved, onDeleted }: PartyEditorProps) {
  const [partyName, setPartyName] = useState('');
  const [partyLevel, setPartyLevel] = useState(1);
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [allSavedMembers, setAllSavedMembers] = useState<PartyMemberRecord[]>([]);
  const [loadedParty, setLoadedParty] = useState<PartyRecord | null>(null);

  // Inline "add new member" form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<MemberForm>(blankMemberForm());

  // "Pick existing" dropdown
  const [showPickDropdown, setShowPickDropdown] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = partyId === null;

  const loadData = useCallback(async () => {
    const saved = await partyMemberRepository.getAll();
    setAllSavedMembers(saved);

    if (partyId) {
      const party = await partyRepository.getById(partyId);
      if (party) {
        setLoadedParty(party);
        setPartyName(party.name);
        setPartyLevel(party.level);
        const drafts: DraftMember[] = party.memberIds.map(mid => {
          const r = saved.find(m => m.id === mid);
          if (r) {
            return {
              existingId: r.id,
              name: r.name,
              statSummary: statSummaryFromRecord(r),
              form: null,
            };
          }
          return { existingId: mid, name: `(missing ${mid})`, statSummary: '', form: null };
        });
        setMembers(drafts);
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

  const currentMemberIds = new Set(
    members.map(m => m.existingId).filter(Boolean) as string[],
  );
  const available = filterAvailableMembers(allSavedMembers, currentMemberIds);

  function fieldHandler(field: keyof MemberForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setAddForm(prev => ({ ...prev, [field]: v }));
    };
  }

  function commitAddForm() {
    if (!addForm.name.trim()) return;
    setMembers(prev => [...prev, {
      existingId: null,
      name: addForm.name.trim(),
      statSummary: statSummaryFromForm(addForm),
      form: { ...addForm },
    }]);
    setAddForm(blankMemberForm());
    setShowAddForm(false);
  }

  function pickExisting(r: PartyMemberRecord) {
    setMembers(prev => [...prev, {
      existingId: r.id,
      name: r.name,
      statSummary: statSummaryFromRecord(r),
      form: null,
    }]);
    setShowPickDropdown(false);
  }

  function removeMember(idx: number) {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  }

  async function doSave(activate: boolean) {
    if (!partyName.trim()) return;
    const now = Date.now();

    const resolvedIds: string[] = [];
    for (const m of members) {
      if (m.existingId) {
        resolvedIds.push(m.existingId);
      } else if (m.form) {
        const rec = memberFormToRecord(m.form, undefined, now);
        await partyMemberRepository.put(rec);
        resolvedIds.push(rec.id);
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
            <button className={styles.stepBtn} onClick={() => setPartyLevel(l => Math.max(1, l - 1))}>−</button>
            <span className={styles.levelVal}>{partyLevel}</span>
            <button className={styles.stepBtn} onClick={() => setPartyLevel(l => Math.min(20, l + 1))}>+</button>
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
                  {m.statSummary && <div className={styles.memberSub}>{m.statSummary}</div>}
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
                onClick={() => { setShowAddForm(true); setAddForm(blankMemberForm()); }}
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
                    {available.length === 0 ? (
                      <div className={styles.pickExistingEmpty}>No saved members available</div>
                    ) : (
                      available.map(r => (
                        <div
                          key={r.id}
                          className={styles.pickExistingItem}
                          onClick={() => pickExisting(r)}
                        >
                          <span className={styles.pickExistingName}>{r.name}</span>
                          <span className={styles.pickExistingSub}>{statSummaryFromRecord(r)}</span>
                        </div>
                      ))
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
                    onChange={fieldHandler('name')}
                    placeholder="Member name"
                    autoFocus
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Max HP</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    min={1}
                    value={addForm.maxHp}
                    onChange={fieldHandler('maxHp')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>AC</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    min={1}
                    value={addForm.ac}
                    onChange={fieldHandler('ac')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Perception</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.perception}
                    onChange={fieldHandler('perception')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Fort</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.fort}
                    onChange={fieldHandler('fort')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Ref</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.ref}
                    onChange={fieldHandler('ref')}
                  />
                </div>
                <div className={styles.addMemberField}>
                  <span className={styles.addMemberFieldLabel}>Will</span>
                  <input
                    className={styles.addMemberInput}
                    type="number"
                    value={addForm.will}
                    onChange={fieldHandler('will')}
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
                <button className={styles.btnDanger} onClick={() => setConfirmDelete(true)}>
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
