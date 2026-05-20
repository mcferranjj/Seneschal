import { useState, useEffect, useCallback } from 'react';
import type { CharacterRecord } from '../../db/schema';
import { characterRepository } from '../../db/repositories/CharacterRepository';
import { useBackable } from '../../nav/useBackable';
import styles from './PartyPanel.module.css';

const PF2E_CLASSES = [
  'Alchemist','Barbarian','Bard','Champion','Cleric','Druid','Fighter',
  'Gunslinger','Inventor','Investigator','Kineticist','Magus','Monk',
  'Oracle','Psychic','Ranger','Rogue','Sorcerer','Summoner','Swashbuckler',
  'Thaumaturge','Witch','Wizard',
];

const ANCESTRIES = [
  'Dwarf','Elf','Gnome','Goblin','Halfling','Human','Leshy','Orc',
  'Catfolk','Fetchling','Fleshwarp','Gnoll','Grippli','Hobgoblin',
  'Kobold','Lizardfolk','Ratfolk','Shisk','Shoony','Sprite','Strix','Tengu',
];

/** Flat form state used by the simple "add/edit" form. */
interface SimpleCharForm {
  name: string;
  playerName: string;
  ancestryName: string;
  className: string;
  level: number;
  maxHp: number;
  ac: number;
  perception: number;
  fort: number;
  ref: number;
  will: number;
}

function blankForm(): SimpleCharForm {
  return {
    name: '', playerName: '', ancestryName: 'Human', className: 'Fighter',
    level: 1, maxHp: 20, ac: 15, perception: 3, fort: 5, ref: 3, will: 3,
  };
}

/** Build a minimal valid CharacterRecord from the simple form. */
function formToRecord(id: string, f: SimpleCharForm, now: number): CharacterRecord {
  return {
    id,
    name: f.name,
    playerName: f.playerName,
    createdAt: now,
    updatedAt: now,
    level: f.level,
    ancestry: null,
    heritage: null,
    background: null,
    class: null,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    boostChoices: {
      ancestryBoosts: [],
      backgroundBoost: null,
      backgroundFreeBoost: null,
      classKeyAbility: null,
      level1FreeBoosts: [],
      level5: [], level10: [], level15: [], level20: [],
    },
    skills: {
      acrobatics: 0, arcana: 0, athletics: 0, crafting: 0, deception: 0,
      diplomacy: 0, intimidation: 0, medicine: 0, nature: 0, occultism: 0,
      performance: 0, religion: 0, society: 0, stealth: 0, survival: 0,
      thievery: 0, loreSkills: {},
    },
    feats: [],
    currentHp: f.maxHp,
    tempHp: 0,
    derivedStats: {
      maxHp: f.maxHp,
      ac: f.ac,
      perception: f.perception,
      fort: f.fort,
      ref: f.ref,
      will: f.will,
      classDC: 10,
    },
  } as CharacterRecord;
}

function recordToForm(c: CharacterRecord): SimpleCharForm {
  return {
    name: c.name,
    playerName: c.playerName,
    ancestryName: c.ancestry?.name ?? 'Human',
    className: c.class?.name ?? 'Fighter',
    level: c.level,
    maxHp: c.derivedStats.maxHp,
    ac: c.derivedStats.ac,
    perception: c.derivedStats.perception,
    fort: c.derivedStats.fort,
    ref: c.derivedStats.ref,
    will: c.derivedStats.will,
  };
}

export interface PartyPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function PartyPanel({ collapsed, onToggleCollapsed }: PartyPanelProps) {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SimpleCharForm>(blankForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Back-button integration (scoped to 'gm' since this panel lives inside EncounterManager)
  useBackable(
    showForm,
    () => { setShowForm(false); setEditingId(null); },
    'Cancel character form',
    { scope: 'gm' },
  );
  useBackable(!!selectedId, () => setSelectedId(null), 'Deselect character', { scope: 'gm' });

  const load = useCallback(async () => {
    const all = await characterRepository.getAll();
    setCharacters(all);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveCharacter() {
    if (!form.name.trim()) return;
    const now = Date.now();
    if (editingId) {
      const existing = characters.find(c => c.id === editingId);
      const record = formToRecord(editingId, form, existing?.createdAt ?? now);
      record.updatedAt = now;
      await characterRepository.put(record);
    } else {
      const record = formToRecord(`pc-${now}`, form, now);
      await characterRepository.add(record);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm());
    load();
  }

  async function deleteCharacter(id: string) {
    await characterRepository.delete(id);
    if (selectedId === id) setSelectedId(null);
    load();
  }

  function startEdit(c: CharacterRecord) {
    setEditingId(c.id);
    setForm(recordToForm(c));
    setShowForm(true);
  }

  async function adjustHp(id: string, delta: number) {
    const c = characters.find(x => x.id === id);
    if (!c) return;
    const maxHp = c.derivedStats.maxHp;
    const newHp = Math.max(0, Math.min(maxHp, c.currentHp + delta));
    await characterRepository.update(id, { currentHp: newHp });
    setCharacters(prev => prev.map(x => x.id === id ? { ...x, currentHp: newHp } : x));
  }

  /** Build a controlled input change handler for a single form field.
   *  Coerces numeric inputs to numbers automatically. */
  function fieldHandler(field: keyof SimpleCharForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setForm(prev => ({ ...prev, [field]: v }));
    };
  }

  return (
    <>
      {/* Panel header — always rendered */}
      <div className={styles.panelHeader}>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="party-panel-body"
          aria-label={collapsed ? 'Expand party panel' : 'Collapse party panel'}
          title={collapsed ? 'Expand party panel' : 'Collapse party panel'}
        >
          <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}>▾</span>
          <span className={styles.panelTitle}>
            Party{collapsed && characters.length > 0 ? ` (${characters.length})` : ''}
          </span>
        </button>
        {!collapsed && (
          <button
            className={styles.addBtn}
            onClick={() => { setEditingId(null); setForm(blankForm()); setShowForm(true); }}
          >
            + Add
          </button>
        )}
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div id="party-panel-body" className={styles.body}>
          {characters.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyText}>No characters yet.</p>
            </div>
          )}
          <div className={styles.cards}>
            {characters.map(c => {
              const maxHp = c.derivedStats.maxHp;
              const hp = c.currentHp;
              const hpPct = maxHp > 0 ? hp / maxHp : 0;
              const hpColor = hpPct > 0.5 ? '#3a7a3a' : hpPct > 0.25 ? '#8a6a18' : '#8a2a18';
              const ancestryName = c.ancestry?.name ?? '—';
              const className = c.class?.name ?? '—';
              const { ac, fort, ref, will, perception } = c.derivedStats;
              return (
                <div
                  key={c.id}
                  className={`${styles.card} ${selectedId === c.id ? styles.cardSelected : ''}`}
                  onClick={() => setSelectedId(prev => prev === c.id ? null : c.id)}
                >
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.cardName}>{c.name}</div>
                      <div className={styles.cardSub}>{c.playerName && `${c.playerName} · `}{ancestryName} {className} {c.level}</div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.editBtn} onClick={e => { e.stopPropagation(); startEdit(c); }}>✎</button>
                      <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteCharacter(c.id); }}>✕</button>
                    </div>
                  </div>
                  <div className={styles.cardStats}>
                    <span><strong>AC</strong> {ac}</span>
                    <span><strong>F</strong> {fort >= 0 ? `+${fort}` : fort}</span>
                    <span><strong>R</strong> {ref >= 0 ? `+${ref}` : ref}</span>
                    <span><strong>W</strong> {will >= 0 ? `+${will}` : will}</span>
                    <span><strong>Perc</strong> {perception >= 0 ? `+${perception}` : perception}</span>
                  </div>
                  <div className={styles.hpRow}>
                    <span className={styles.hpLabel} style={{ color: hpColor }}>{hp}/{maxHp} HP</span>
                    <div className={styles.hpBtns}>
                      {([-10, -5, -1, 1, 5, 10] as const).map(v => (
                        <button key={v} className={`${styles.hpBtn} ${v > 0 ? styles.hpHeal : styles.hpDmg}`}
                          onClick={e => { e.stopPropagation(); adjustHp(c.id, v); }}>
                          {v > 0 ? `+${v}` : v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.hpBar}>
                    <div className={styles.hpFill} style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form overlay (fixed-position modal).
          Rendered as a sibling of the collapsible body — not nested inside it —
          so that opening the add/edit form while the panel is collapsed still
          displays the modal. The overlay also escapes the panel's max-height. */}
      {showForm && (
        <div className={styles.formOverlay}>
          <div className={styles.form}>
            <h2 className={styles.formTitle}>{editingId ? 'Edit Character' : 'Add Character'}</h2>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Name</span>
                <input className={styles.input} value={form.name} onChange={fieldHandler('name')} placeholder="Character name" autoFocus />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Player</span>
                <input className={styles.input} value={form.playerName} onChange={fieldHandler('playerName')} placeholder="Player name" />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ancestry</span>
                <select className={styles.input} value={form.ancestryName} onChange={fieldHandler('ancestryName')}>
                  {ANCESTRIES.map(a => <option key={a}>{a}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Class</span>
                <select className={styles.input} value={form.className} onChange={fieldHandler('className')}>
                  {PF2E_CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Level</span>
                <input className={styles.input} type="number" min={1} max={20} value={form.level} onChange={fieldHandler('level')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Max HP</span>
                <input className={styles.input} type="number" min={1} value={form.maxHp} onChange={e => setForm(p => ({ ...p, maxHp: Number(e.target.value) }))} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>AC</span>
                <input className={styles.input} type="number" min={1} value={form.ac} onChange={fieldHandler('ac')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Perception</span>
                <input className={styles.input} type="number" value={form.perception} onChange={fieldHandler('perception')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Fort</span>
                <input className={styles.input} type="number" value={form.fort} onChange={fieldHandler('fort')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ref</span>
                <input className={styles.input} type="number" value={form.ref} onChange={fieldHandler('ref')} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Will</span>
                <input className={styles.input} type="number" value={form.will} onChange={fieldHandler('will')} />
              </label>
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={saveCharacter} disabled={!form.name.trim()}>Save</button>
              <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
